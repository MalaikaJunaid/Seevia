import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PantryItem } from '@/src/models/PantryItem';
import { PantryService } from '@/src/services/pantry/pantry.service';

const QUEUE_KEY = 'seevia_offline_ops_v1';
const MAX_ATTEMPTS = 5;

export type OfflineOp =
  | { id: string; type: 'add'; item: PantryItem; userId: string; attempts: number; createdAt: string }
  | { id: string; type: 'update'; item: PantryItem; userId: string; attempts: number; createdAt: string }
  | { id: string; type: 'delete'; itemId: string; userId: string; attempts: number; createdAt: string };

async function readQueue(): Promise<OfflineOp[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return [];
  }
}

async function writeQueue(queue: OfflineOp[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Enqueue an operation to be synced later.
 */
export async function enqueue(op: Omit<OfflineOp, 'attempts' | 'createdAt'>): Promise<void> {
  const queue = await readQueue();
  queue.push({ 
    ...op, 
    attempts: 0, 
    createdAt: new Date().toISOString() 
  } as OfflineOp);
  await writeQueue(queue);
}

/**
 * Sync logic: Attempts to apply local changes to Firestore.
 */
export async function syncPending(): Promise<{ succeeded: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  const remaining: OfflineOp[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      if (op.type === 'add' || op.type === 'update') {
        // Map to your PantryService logic
        await PantryService.addItem(op.userId, op.item);
        succeeded++;
      } else if (op.type === 'delete') {
        await PantryService.deleteItem(op.userId, op.itemId);
        succeeded++;
      }
    } catch (err) {
      const attempts = (op.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        failed++; // Drop after max retries
      } else {
        remaining.push({ ...op, attempts });
      }
    }
  }

  await writeQueue(remaining);
  return { succeeded, failed };
}

/**
 * Background Auto-Sync Management
 */
let _autoSyncHandle: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30000): void {
  if (_autoSyncHandle != null) return;
  _autoSyncHandle = setInterval(() => {
    syncPending().catch(() => {});
  }, intervalMs);
}

export function stopAutoSync(): void {
  if (_autoSyncHandle != null) {
    clearInterval(_autoSyncHandle);
    _autoSyncHandle = null;
  }
}
