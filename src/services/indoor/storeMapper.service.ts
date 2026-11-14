/**
 * Seevia Indoor Store Mapper Service
 *
 * Builds a navigable node-graph of a store by tracking user movement.
 * Uses dead-reckoning: accelerometer step-count + magnetometer heading.
 *
 * How it works:
 * 1. User enters "mapping mode" at the store entrance
 * 2. Every ~1.5 steps (~1 meter), a new node is created
 * 3. Gemini Vision labels what the camera sees at that node
 * 4. Nodes are linked to form a walkable graph
 * 5. Graph is uploaded to Firebase and shared with all users
 *
 * Node Graph structure:
 *   nodes: MapNode[]   — each ~1m square of walkable floor
 *   edges: MapEdge[]   — directional connections between nodes
 */

import { Accelerometer, Magnetometer } from 'expo-sensors';
import { DeviceEventEmitter } from 'react-native';
import { db } from '@/services/firebase/config';
import {
  collection, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { logger } from '@/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapNode {
  id: string;
  x: number;            // grid column (1 unit = ~1 meter)
  y: number;            // grid row
  heading: number;      // degrees 0-360 when captured
  label: string;        // e.g. "Dairy Aisle", "Entrance", "Bakery"
  products: string[];   // products Gemini saw here
  imageUri?: string;    // local URI of capture (for Gemini)
  connectedTo: string[];// node IDs this connects to
  capturedAt: number;
}

export interface MapEdge {
  from: string;
  to: string;
  distanceM: number;    // approx meters
  direction: string;    // "north"|"south"|"east"|"west"|"northeast" etc.
}

export interface StoreMap {
  storeId: string;
  storeName: string;
  city: string;
  nodes: MapNode[];
  edges: MapEdge[];
  entryNodeId: string;
  createdBy: string;
  updatedAt: any;
  version: number;
  totalArea: number;    // node count as proxy for area
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEP_THRESHOLD_G  = 1.1;  // g — acceleration spike = step
const STEP_COOLDOWN_MS  = 350;  // ms — min time between steps
const METERS_PER_STEP   = 0.75; // avg step length
const NODE_INTERVAL_M   = 1.0;  // create new node every 1 meter
const COLLECTION        = 'storeMaps';

// ─── Service ─────────────────────────────────────────────────────────────────

class StoreMapperService {
  private readonly MODULE = 'STORE_MAPPER';

  // Mapping state
  private isMapping  = false;
  private nodes: MapNode[]  = [];
  private edges: MapEdge[]  = [];
  private currentNodeId = '';
  private entryNodeId   = '';

  // Dead-reckoning
  private currentX = 0;
  private currentY = 0;
  private headingDeg = 0;
  private distanceSinceLastNode = 0;
  private stepCount = 0;

  // Sensor subs
  private accelSub: { remove: () => void } | null = null;
  private magSub:   { remove: () => void } | null = null;
  private lastStepAt = 0;
  private prevMag = 0;

  // ─── Public API ────────────────────────────────────────────────────────────

  isActive() { return this.isMapping; }
  getNodes()  { return [...this.nodes]; }
  getEdges()  { return [...this.edges]; }
  getCurrentNodeId() { return this.currentNodeId; }
  getStepCount() { return this.stepCount; }

  async startMapping(storeName: string, userId: string): Promise<string> {
    if (this.isMapping) return this.currentNodeId;

    this.isMapping = true;
    this.nodes = [];
    this.edges = [];
    this.currentX = 0;
    this.currentY = 0;
    this.distanceSinceLastNode = 0;
    this.stepCount = 0;
    this.headingDeg = 0;

    // Create entry node
    const entryNode = this.createNode(0, 0, 0, 'Entrance');
    this.nodes.push(entryNode);
    this.currentNodeId = entryNode.id;
    this.entryNodeId = entryNode.id;

    this.startSensors();
    logger.info(this.MODULE, `Mapping started for: ${storeName}`);
    DeviceEventEmitter.emit('MAPPER_STARTED', { nodeId: entryNode.id });
    return entryNode.id;
  }

  stopMapping(): { nodes: MapNode[]; edges: MapEdge[] } {
    this.isMapping = false;
    this.stopSensors();
    logger.info(this.MODULE, `Mapping stopped. ${this.nodes.length} nodes, ${this.edges.length} edges`);
    DeviceEventEmitter.emit('MAPPER_STOPPED', { nodeCount: this.nodes.length });
    return { nodes: this.nodes, edges: this.edges };
  }

  /**
   * Label the current node with what Gemini sees in camera frame.
   * Called from the UI after each Gemini Vision response.
   */
  labelCurrentNode(label: string, products: string[] = []) {
    const node = this.nodes.find(n => n.id === this.currentNodeId);
    if (!node) return;
    node.label = label;
    node.products = products;
    logger.info(this.MODULE, `Node ${node.id} labeled: ${label} — ${products.join(', ')}`);
    DeviceEventEmitter.emit('MAPPER_NODE_LABELED', { nodeId: node.id, label, products });
  }

  /**
   * Mark current position as a specific section (called by voice or tap).
   */
  markSection(sectionName: string) {
    this.labelCurrentNode(sectionName);
  }

  // ─── Persistence (Firebase) ────────────────────────────────────────────────

  /**
   * Save the completed map to Firebase.
   * Other users can download it for the same store.
   */
  async saveMap(storeId: string, storeName: string, city: string, userId: string): Promise<boolean> {
    try {
      const map: StoreMap = {
        storeId,
        storeName,
        city,
        nodes: this.nodes,
        edges: this.edges,
        entryNodeId: this.entryNodeId,
        createdBy: userId,
        updatedAt: serverTimestamp(),
        version: 1,
        totalArea: this.nodes.length,
      };

      const ref = doc(db, COLLECTION, storeId);

      // If map exists, merge nodes (union) rather than overwrite
      const existing = await getDoc(ref);
      if (existing.exists()) {
        const prev = existing.data() as StoreMap;
        map.nodes = this.mergeNodes(prev.nodes, this.nodes);
        map.edges = this.mergeEdges(prev.edges, this.edges);
        map.version = (prev.version || 1) + 1;
      }

      await setDoc(ref, map);
      logger.info(this.MODULE, `Map saved: ${storeId} v${map.version} — ${map.nodes.length} nodes`);
      return true;
    } catch (e) {
      logger.error(this.MODULE, 'Failed to save map', e);
      return false;
    }
  }

  /**
   * Load an existing store map from Firebase.
   */
  async loadMap(storeId: string): Promise<StoreMap | null> {
    try {
      const ref = doc(db, COLLECTION, storeId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return snap.data() as StoreMap;
    } catch (e) {
      logger.error(this.MODULE, `Failed to load map ${storeId}`, e);
      return null;
    }
  }

  /**
   * Search all available store maps near a city.
   */
  async searchMaps(city: string): Promise<StoreMap[]> {
    try {
      const q = query(collection(db, COLLECTION), where('city', '==', city));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as StoreMap);
    } catch (e) {
      logger.error(this.MODULE, 'Failed to search maps', e);
      return [];
    }
  }

  // ─── Dead Reckoning & Sensor Logic ─────────────────────────────────────────

  private startSensors() {
    Accelerometer.setUpdateInterval(100); // 10 Hz
    Magnetometer.setUpdateInterval(200);  // 5 Hz

    this.accelSub = Accelerometer.addListener(data => {
      const mag = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2) / 9.81;
      const now = Date.now();

      // Step detection: magnitude spike above threshold
      if (mag > STEP_THRESHOLD_G && now - this.lastStepAt > STEP_COOLDOWN_MS) {
        this.lastStepAt = now;
        this.stepCount++;
        this.distanceSinceLastNode += METERS_PER_STEP;

        // Update position using current heading
        const rad = (this.headingDeg * Math.PI) / 180;
        this.currentX += METERS_PER_STEP * Math.sin(rad);
        this.currentY -= METERS_PER_STEP * Math.cos(rad);

        // Create new node if walked far enough
        if (this.distanceSinceLastNode >= NODE_INTERVAL_M) {
          this.distanceSinceLastNode = 0;
          this.addNodeAtCurrentPosition();
        }

        DeviceEventEmitter.emit('MAPPER_STEP', { stepCount: this.stepCount, x: this.currentX, y: this.currentY });
      }
    });

    this.magSub = Magnetometer.addListener(data => {
      // Heading: 0 = North, 90 = East
      let heading = Math.atan2(data.y, data.x) * (180 / Math.PI);
      if (heading < 0) heading += 360;
      this.headingDeg = heading;
    });
  }

  private stopSensors() {
    this.accelSub?.remove();
    this.magSub?.remove();
    this.accelSub = null;
    this.magSub = null;
  }

  private addNodeAtCurrentPosition() {
    const x = Math.round(this.currentX);
    const y = Math.round(this.currentY);

    // Don't create duplicate node at same grid cell
    const existing = this.nodes.find(n => n.x === x && n.y === y);
    if (existing) {
      // Just update the current node pointer and add edge
      if (this.currentNodeId !== existing.id) {
        this.addEdge(this.currentNodeId, existing.id);
        this.currentNodeId = existing.id;
      }
      return;
    }

    const newNode = this.createNode(x, y, this.headingDeg, 'Unknown');
    this.nodes.push(newNode);
    this.addEdge(this.currentNodeId, newNode.id);
    this.currentNodeId = newNode.id;

    DeviceEventEmitter.emit('MAPPER_NEW_NODE', { node: newNode });
    logger.info(this.MODULE, `New node at (${x},${y}) heading=${Math.round(this.headingDeg)}°`);
  }

  private addEdge(fromId: string, toId: string) {
    const from = this.nodes.find(n => n.id === fromId);
    const to   = this.nodes.find(n => n.id === toId);
    if (!from || !to) return;

    // Bidirectional
    if (!from.connectedTo.includes(toId)) from.connectedTo.push(toId);
    if (!to.connectedTo.includes(fromId)) to.connectedTo.push(fromId);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx ** 2 + dy ** 2);

    // Cardinal direction label
    const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    const dir = angle > -22.5 && angle <= 22.5 ? 'north'
      : angle > 22.5  && angle <= 67.5  ? 'northeast'
      : angle > 67.5  && angle <= 112.5 ? 'east'
      : angle > 112.5 && angle <= 157.5 ? 'southeast'
      : angle > 157.5 || angle <= -157.5 ? 'south'
      : angle > -157.5 && angle <= -112.5 ? 'southwest'
      : angle > -112.5 && angle <= -67.5  ? 'west'
      : 'northwest';

    const edge: MapEdge = { from: fromId, to: toId, distanceM: dist, direction: dir };
    const reverse: MapEdge = { from: toId, to: fromId, distanceM: dist, direction: this.opposite(dir) };

    if (!this.edges.find(e => e.from === fromId && e.to === toId)) this.edges.push(edge);
    if (!this.edges.find(e => e.from === toId && e.to === fromId)) this.edges.push(reverse);
  }

  private createNode(x: number, y: number, heading: number, label: string): MapNode {
    return {
      id: `n_${x}_${y}_${Date.now()}`,
      x, y, heading, label,
      products: [],
      connectedTo: [],
      capturedAt: Date.now(),
    };
  }

  // ─── Map Merging ────────────────────────────────────────────────────────────

  private mergeNodes(existing: MapNode[], incoming: MapNode[]): MapNode[] {
    const merged = [...existing];
    for (const node of incoming) {
      const dup = existing.find(n => n.x === node.x && n.y === node.y);
      if (!dup) {
        merged.push(node);
      } else {
        // Enrich existing node with new data
        if (node.label && node.label !== 'Unknown' && dup.label === 'Unknown') dup.label = node.label;
        dup.products = [...new Set([...dup.products, ...node.products])];
        dup.connectedTo = [...new Set([...dup.connectedTo, ...node.connectedTo])];
      }
    }
    return merged;
  }

  private mergeEdges(existing: MapEdge[], incoming: MapEdge[]): MapEdge[] {
    const merged = [...existing];
    for (const edge of incoming) {
      if (!existing.find(e => e.from === edge.from && e.to === edge.to)) {
        merged.push(edge);
      }
    }
    return merged;
  }

  private opposite(dir: string): string {
    const opp: Record<string, string> = {
      north: 'south', south: 'north', east: 'west', west: 'east',
      northeast: 'southwest', southwest: 'northeast',
      northwest: 'southeast', southeast: 'northwest',
    };
    return opp[dir] || 'south';
  }
}

export const storeMapperService = new StoreMapperService();
