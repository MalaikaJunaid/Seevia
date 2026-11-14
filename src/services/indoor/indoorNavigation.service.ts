/**
 * Seevia Indoor Navigation Service
 * Uses A* pathfinding on a stored StoreMap node graph.
 * Converts graph path to Roman Urdu turn-by-turn voice guidance.
 */

import { MapNode, MapEdge, StoreMap } from './storeMapper.service';
import { logger } from '@/utils/logger';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

export interface IndoorStep {
  nodeId: string;
  label: string;
  direction: string;
  distanceM: number;
  instruction: string; // Roman Urdu
  isDestination: boolean;
}

const DIR_URDU: Record<string, string> = {
  north: 'seedha aage',
  south: 'peeche',
  east:  'daayein (right)',
  west:  'baayein (left)',
  northeast: 'thoda daayein aage',
  northwest: 'thoda baayein aage',
  southeast: 'thoda daayein peeche',
  southwest: 'thoda baayein peeche',
};

class IndoorNavigationService {
  private readonly MODULE = 'INDOOR_NAV';

  /**
   * Find path from startNodeId to any node labeled with targetLabel.
   * Returns Roman Urdu turn-by-turn steps.
   */
  findPath(map: StoreMap, startNodeId: string, targetLabel: string): IndoorStep[] | null {
    // Find all candidate destination nodes matching the label
    const lower = targetLabel.toLowerCase();
    const destinations = map.nodes.filter(n =>
      n.label.toLowerCase().includes(lower) ||
      n.products.some(p => p.toLowerCase().includes(lower))
    );

    if (destinations.length === 0) {
      logger.warn(this.MODULE, `No nodes match "${targetLabel}"`);
      return null;
    }

    // Try each destination, return shortest path
    let bestPath: string[] | null = null;
    for (const dest of destinations) {
      const path = this.aStar(map, startNodeId, dest.id);
      if (path && (!bestPath || path.length < bestPath.length)) {
        bestPath = path;
      }
    }

    if (!bestPath) return null;

    return this.pathToSteps(map, bestPath);
  }

  /**
   * Build steps for a raw node ID list (from findPath or manual route).
   */
  pathToSteps(map: StoreMap, nodeIds: string[]): IndoorStep[] {
    const nodeMap = new Map(map.nodes.map(n => [n.id, n]));
    const steps: IndoorStep[] = [];

    for (let i = 0; i < nodeIds.length - 1; i++) {
      const from = nodeMap.get(nodeIds[i]);
      const to   = nodeMap.get(nodeIds[i + 1]);
      if (!from || !to) continue;

      const edge = map.edges.find(e => e.from === from.id && e.to === to.id);
      const dir = edge?.direction || 'north';
      const distM = edge?.distanceM || 1;
      const dirUrdu = DIR_URDU[dir] || dir;

      const instruction = i === nodeIds.length - 2
        ? `${to.label || 'Manzil'} aa gaya! Aap pahunch gaye.`
        : `${Math.round(distM)} meter ${dirUrdu} chalein — ${to.label || ''}.`.trim();

      steps.push({
        nodeId: to.id,
        label: to.label,
        direction: dir,
        distanceM: distM,
        instruction,
        isDestination: i === nodeIds.length - 2,
      });
    }

    return steps;
  }

  /** Announce a step via TTS */
  announceStep(step: IndoorStep) {
    TtsService.speak(step.instruction);
    logger.info(this.MODULE, `Step: ${step.instruction}`);
  }

  /** Announce full route summary */
  announceRoute(steps: IndoorStep[], targetLabel: string) {
    const totalM = steps.reduce((s, st) => s + st.distanceM, 0);
    const stepCount = steps.length;
    TtsService.speak(
      `${targetLabel} ka rasta mil gaya. Takriban ${Math.round(totalM)} meter aur ${stepCount} turns. Pehla qadam: ${steps[0]?.instruction || ''}`
    );
  }

  /**
   * Find nodes closest to a label for "where am I" queries.
   */
  findNearestSection(map: StoreMap, currentNodeId: string): string {
    const node = map.nodes.find(n => n.id === currentNodeId);
    if (!node) return 'Unknown area';
    if (node.label && node.label !== 'Unknown') return node.label;

    // BFS to find nearest labeled node
    const visited = new Set<string>();
    const queue = [node.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const n = map.nodes.find(x => x.id === id);
      if (!n) continue;
      if (n.label && n.label !== 'Unknown') return n.label;
      visited.add(id);
      for (const neighbor of n.connectedTo) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    return 'Unknown section';
  }

  // ─── A* Pathfinding ────────────────────────────────────────────────────────

  private aStar(map: StoreMap, startId: string, goalId: string): string[] | null {
    const nodeMap = new Map(map.nodes.map(n => [n.id, n]));
    const start = nodeMap.get(startId);
    const goal  = nodeMap.get(goalId);
    if (!start || !goal) return null;

    const h = (n: MapNode) => Math.sqrt((n.x - goal.x) ** 2 + (n.y - goal.y) ** 2);

    const open = new Set<string>([startId]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[startId, 0]]);
    const fScore = new Map<string, number>([[startId, h(start)]]);

    while (open.size > 0) {
      // Get node in open with lowest fScore
      let current = '';
      let lowestF = Infinity;
      for (const id of open) {
        const f = fScore.get(id) ?? Infinity;
        if (f < lowestF) { lowestF = f; current = id; }
      }

      if (current === goalId) return this.reconstructPath(cameFrom, current);

      open.delete(current);
      const currentNode = nodeMap.get(current);
      if (!currentNode) continue;

      for (const neighborId of currentNode.connectedTo) {
        const neighbor = nodeMap.get(neighborId);
        if (!neighbor) continue;

        const edge = map.edges.find(e => e.from === current && e.to === neighborId);
        const edgeCost = edge?.distanceM ?? 1;
        const tentativeG = (gScore.get(current) ?? Infinity) + edgeCost;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, current);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + h(neighbor));
          open.add(neighborId);
        }
      }
    }

    return null; // No path found
  }

  private reconstructPath(cameFrom: Map<string, string>, current: string): string[] {
    const path = [current];
    while (cameFrom.has(current)) {
      current = cameFrom.get(current)!;
      path.unshift(current);
    }
    return path;
  }
}

export const indoorNavigationService = new IndoorNavigationService();
