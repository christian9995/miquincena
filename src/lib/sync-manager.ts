/**
 * Sync Manager - v2.0
 * Orchestrates local/remote sync with Local-First conflict resolution
 * Cache-bust: Force rebuild
 */

import { AppState } from './google-drive';

/**
 * Local-First Sync Strategy:
 * 1. Compare timestamps BEFORE any data transfer
 * 2. If local is newer: Upload local first, then confirm with Drive
 * 3. If remote is newer: Download, but preserve local if user modified during reconnect
 * 4. If equal: Keep local (user's current session wins)
 */
export function resolveSyncConflict(
  local: AppState,
  remote: AppState,
  remoteModifiedTime?: string
): AppState {
  const localTimestamp = typeof local.timestamp === 'number' ? local.timestamp : 0;
  const remoteTimestamp = typeof remote.timestamp === 'number' ? remote.timestamp : 0;
  const remoteModified = remoteModifiedTime ? new Date(remoteModifiedTime).getTime() : remoteTimestamp;

  console.log('[v0] Resolving sync conflict with Local-First strategy');
  console.log('[v0] Local timestamp:', localTimestamp, new Date(localTimestamp).toISOString());
  console.log('[v0] Remote timestamp:', remoteTimestamp, new Date(remoteTimestamp).toISOString());
  console.log('[v0] Remote modified:', remoteModified, new Date(remoteModified).toISOString());

  // Local is newer or equal: keep local (Local-First priority)
  if (localTimestamp >= remoteModified) {
    console.log('[v0] Local data is newer or equal - LOCAL-FIRST strategy applies');
    console.log('[v0] Local data will be uploaded to Drive');
    return local;
  }

  // Remote is significantly newer (more than 5 seconds): use remote
  if (remoteModified > localTimestamp + 5000) {
    console.log('[v0] Remote data is significantly newer, using remote');
    return remote;
  }

  // Default: keep local (safe default for conflicts)
  console.log('[v0] Timestamps too close or unclear, keeping local data');
  return local;
}

/**
 * Standalone function: Determine sync direction based on timestamps (Local-First)
 * Returns: 'upload' if local is newer, 'download' if remote is newer, 'skip' if no sync needed
 */
export function determineSyncDirection(
  localTimestamp: number,
  remoteTimestamp: number,
  remoteModifiedTime?: string
): 'upload' | 'download' | 'skip' {
  const remoteModified = remoteModifiedTime ? new Date(remoteModifiedTime).getTime() : remoteTimestamp;
  const timeDiff = remoteModified - localTimestamp;

  console.log('[v0] Determining sync direction');
  console.log('[v0] Time difference (remote - local):', timeDiff, 'ms');

  // Local is newer: upload
  if (localTimestamp >= remoteModified) {
    console.log('[v0] Sync direction: UPLOAD (local is newer or equal)');
    return 'upload';
  }

  // Remote is significantly newer: download
  if (timeDiff > 5000) {
    console.log('[v0] Sync direction: DOWNLOAD (remote is significantly newer)');
    return 'download';
  }

  // Very close timestamps: skip to avoid thrashing
  console.log('[v0] Sync direction: SKIP (timestamps too close)');
  return 'skip';
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
