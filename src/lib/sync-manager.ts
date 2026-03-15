/**
 * Sync Manager
 * Orchestrates local/remote sync with conflict resolution
 */

import { AppState } from './google-drive';

// Re-export the conflict resolver at the top level for easier imports
export function resolveSyncConflict(
  local: any,
  remote: any
): any {
  const localTimestamp = local.timestamp || 0;
  const remoteTimestamp = remote.timestamp || 0;

  console.log('[v0] Resolving sync conflict');
  console.log('[v0] Local timestamp:', localTimestamp);
  console.log('[v0] Remote timestamp:', remoteTimestamp);

  // Remote is newer: use remote data
  if (remoteTimestamp > localTimestamp) {
    console.log('[v0] Remote data is newer, using remote');
    return remote;
  }

  // Local is newer or equal: use local data
  console.log('[v0] Local data is newer or equal, using local');
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
