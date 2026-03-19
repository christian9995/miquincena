/**
 * Sync Manager
 * Orchestrates local/remote sync with Local-First conflict resolution
 * Rule: Most recent timestamp always wins (whether local or remote)
 */

import { AppState } from './google-drive';

/**
 * Heartbeat: Verify actual API reachability
 * Instead of relying on navigator.onLine which can be misleading,
 * perform a lightweight API call to verify true connectivity
 */
export async function verifyAPIConnectivity(): Promise<boolean> {
  try {
    const response = await Promise.race([
      fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&maxResults=1', {
        method: 'OPTIONS',
        mode: 'cors',
      }),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('API check timeout')), 5000)
      ),
    ]);
    
    console.log('[v0] API connectivity check: OK (status', response.status, ')');
    return response.ok || response.status === 405; // OPTIONS might return 405, but that means the API is reachable
  } catch (err) {
    console.log('[v0] API connectivity check failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

/**
 * Mirror Sync from Cloud
 * When cloud timestamp is newer, make local state EXACTLY match cloud
 * This ensures deletions are reflected across devices
 */
export function mirrorSyncFromCloud(
  local: AppState,
  remote: AppState
): AppState {
  const localTimestamp = local.timestamp || 0;
  const remoteTimestamp = remote.timestamp || 0;

  // If cloud is newer, use cloud data exactly (mirror sync)
  if (remoteTimestamp > localTimestamp) {
    return {
      transactions: remote.transactions || [],
      budgets: remote.budgets || {},
      balances: remote.balances || local.balances,
      seedDate: remote.seedDate || local.seedDate,
      timestamp: remoteTimestamp,
    };
  }

  // If local is newer, keep local (will be uploaded)
  return local;
}

/**
 * Local-First Deep Merge Strategy
 * Merges local and remote data with transaction-level identity tracking
 * Rule: Most recent updatedAt timestamp wins, local-only transactions never deleted
 * NOTE: Use mirrorSyncFromCloud for auto-pull to reflect deletions
 */
export function deepMergeAppState(
  local: AppState,
  remote: AppState
): AppState {
  console.log('[v0] Starting deep merge of local and remote app states');
  
  // Merge transactions by ID (not by index)
  const mergedTransactions = mergeTransactionsByID(local.transactions, remote.transactions);
  
  // Merge budgets by period index
  const mergedBudgets = mergeBudgetsByPeriod(local.budgets, remote.budgets);
  
  // Use most recent app-level timestamp
  const mergedTimestamp = Math.max(local.timestamp || 0, remote.timestamp || 0);
  
  // Keep local seed date if it exists, otherwise use remote
  const mergedSeedDate = local.seedDate || remote.seedDate;

  return {
    transactions: mergedTransactions,
    budgets: mergedBudgets,
    seedDate: mergedSeedDate,
    timestamp: mergedTimestamp,
  };
}

/**
 * Merge transactions by ID with timestamp-based conflict resolution
 * Uses Map for strict deduplication - each ID appears only ONCE
 * Local transactions without a remote match are kept (pending upload)
 */
function mergeTransactionsByID(
  localTxs: AppState['transactions'],
  remoteTxs: AppState['transactions']
): AppState['transactions'] {
  // Use Map for strict deduplication by ID
  const txMap = new Map<string, AppState['transactions'][0]>();

  // First pass: add all remote transactions to the map
  for (const remoteTx of remoteTxs) {
    // Skip transactions without valid IDs (legacy data)
    if (!remoteTx.id || !remoteTx.id.startsWith('tx_')) {
      continue;
    }
    txMap.set(remoteTx.id, remoteTx);
  }

  // Second pass: process local transactions (local wins on conflict if newer)
  for (const localTx of localTxs) {
    // Skip transactions without valid IDs (legacy data)
    if (!localTx.id || !localTx.id.startsWith('tx_')) {
      continue;
    }

    const existingTx = txMap.get(localTx.id);
    
    if (!existingTx) {
      // Local transaction not in remote: add it (pending upload)
      txMap.set(localTx.id, localTx);
    } else {
      // Both exist: use most recent based on updatedAt
      const localTimestamp = new Date(localTx.updatedAt || 0).getTime();
      const remoteTimestamp = new Date(existingTx.updatedAt || 0).getTime();
      
      if (localTimestamp >= remoteTimestamp) {
        // Local is newer or equal - keep local
        txMap.set(localTx.id, localTx);
      }
      // If remote is newer, it's already in the map
    }
  }

  const result = Array.from(txMap.values());
  console.log('[v0] Deduped transactions: local=', localTxs.length, 'remote=', remoteTxs.length, 'result=', result.length);
  return result;
}

/**
 * Merge budgets by period index with timestamp-based conflict resolution
 */
function mergeBudgetsByPeriod(
  localBudgets: AppState['budgets'],
  remoteBudgets: AppState['budgets']
): AppState['budgets'] {
  const result: AppState['budgets'] = { ...localBudgets };

  for (const periodStr in remoteBudgets) {
    const period = parseInt(periodStr);
    const remoteBudget = remoteBudgets[period];
    const localBudget = result[period];

    if (!localBudget) {
      // Remote budget period doesn't exist locally: use remote
      console.log('[v0] Adding new remote budget for period:', period);
      result[period] = remoteBudget;
    } else {
      // Both exist: use most recent
      const localTimestamp = new Date(localBudget.updatedAt || 0).getTime();
      const remoteTimestamp = new Date(remoteBudget.updatedAt || 0).getTime();

      if (remoteTimestamp > localTimestamp) {
        console.log('[v0] Updating budget for period:', period, 'from remote');
        result[period] = remoteBudget;
      } else {
        console.log('[v0] Keeping local budget for period:', period);
      }
    }
  }

  return result;
}

/**
 * Original Local-First Sync Conflict Resolution (for backward compatibility)
 * Compares timestamps of local vs remote data and returns the version with the most recent timestamp
 */
export function resolveSyncConflict(
  local: AppState,
  remote: AppState
): AppState {
  const localTimestamp = typeof local.timestamp === 'number' ? local.timestamp : 0;
  const remoteTimestamp = typeof remote.timestamp === 'number' ? remote.timestamp : 0;

  console.log('[v0] Resolving sync conflict with Local-First strategy');
  console.log('[v0] Local timestamp:', new Date(localTimestamp).toISOString());
  console.log('[v0] Remote timestamp:', new Date(remoteTimestamp).toISOString());

  // Remote is newer: use remote data (download)
  if (remoteTimestamp > localTimestamp) {
    console.log('[v0] Remote data is newer by', remoteTimestamp - localTimestamp, 'ms - DOWNLOADING from Drive');
    return remote;
  }

  // Local is newer or equal: use local data (keep/upload)
  if (localTimestamp >= remoteTimestamp) {
    console.log('[v0] Local data is newer or equal - keeping local (will be UPLOADED to Drive)');
    return local;
  }

  // Fallback (should not happen)
  console.log('[v0] Timestamps equal, keeping local data');
  return local;
}

interface SyncQueueItem {
  operation: 'save' | 'load';
  timestamp: number;
  retries: number;
}

class SyncManager {
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private readonly SYNC_DEBOUNCE_MS = 2000;
  private readonly MAX_RETRIES = 3;

  /**
   * Queue a sync operation with debouncing
   */
  queueSync(operation: 'save' | 'load'): void {
    // Clear existing debounce timer
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    // Set new debounce timer
    this.syncDebounceTimer = setTimeout(() => {
      this.processSyncQueue();
    }, this.SYNC_DEBOUNCE_MS);

    // Add to queue
    this.syncQueue.push({
      operation,
      timestamp: Date.now(),
      retries: 0,
    });

    console.log('[v0] Sync operation queued:', operation);
  }

  /**
   * Process queued sync operations
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue.shift();
        if (!item) break;

        try {
          if (item.operation === 'save') {
            console.log('[v0] Processing save operation');
            // Save operation will be handled by the calling code
          } else if (item.operation === 'load') {
            console.log('[v0] Processing load operation');
            // Load operation will be handled by the calling code
          }
        } catch (err) {
          // Retry logic
          if (item.retries < this.MAX_RETRIES) {
            item.retries++;
            this.syncQueue.unshift(item);
            console.error('[v0] Sync operation failed, retrying:', item.operation);
          } else {
            console.error('[v0] Sync operation failed after max retries:', item.operation);
          }
        }
      }
    } finally {
      this.isSyncing = false;
      this.syncDebounceTimer = null;
    }
  }

  /**
   * Merge local and remote data, resolving conflicts based on timestamps
   */
  mergeConflict(local: AppState, remote: AppState): AppState {
    const localTimestamp = new Date(local.timestamp).getTime();
    const remoteTimestamp = new Date(remote.timestamp).getTime();

    console.log('[v0] Resolving sync conflict');
    console.log('[v0] Local timestamp:', local.timestamp);
    console.log('[v0] Remote timestamp:', remote.timestamp);

    // Remote is newer: use remote data
    if (remoteTimestamp > localTimestamp) {
      console.log('[v0] Remote data is newer, using remote');
      return remote;
    }

    // Local is newer or equal: use local data
    console.log('[v0] Local data is newer or equal, using local');
    return local;
  }

  /**
   * Compare sync timestamps and determine if sync is needed
   */
  shouldSync(localTimestamp: string, remoteTimestamp: string | null): boolean {
    if (!remoteTimestamp) {
      console.log('[v0] No remote timestamp, sync needed');
      return true;
    }

    const localTime = new Date(localTimestamp).getTime();
    const remoteTime = new Date(remoteTimestamp).getTime();

    // If remote is significantly newer (more than 5 seconds), sync needed
    const shouldSync = remoteTime > localTime + 5000;
    console.log('[v0] Should sync:', shouldSync);

    return shouldSync;
  }

  /**
   * Force immediate sync
   */
  async forceSync(): Promise<void> {
    console.log('[v0] Force sync requested');
    this.syncQueue = [];
    
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.isSyncing = true;
    try {
      // Actual sync will be triggered by calling code
      console.log('[v0] Force sync initiated');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): {
    isSyncing: boolean;
    queueLength: number;
  } {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
    };
  }

  /**
   * Clear all queued operations
   */
  clearQueue(): void {
    this.syncQueue = [];
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    console.log('[v0] Sync queue cleared');
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
