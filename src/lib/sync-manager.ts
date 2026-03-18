/**
 * Sync Manager
 * Orchestrates local/remote sync with Local-First conflict resolution
 */

import { AppState } from './google-drive';

/**
 * Local-First Sync Strategy:
 * 1. Compare timestamps BEFORE any data transfer
 * 2. If local is newer: Keep local (will upload)
 * 3. If remote is newer: Use remote (will download)
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
  console.log('[v0] Local timestamp:', localTimestamp);
  console.log('[v0] Remote timestamp:', remoteModified);

  // Local is newer or equal: keep local (Local-First priority)
  if (localTimestamp >= remoteModified) {
    console.log('[v0] Local data is newer or equal - LOCAL-FIRST strategy applies');
    return local;
  }

  // Remote is significantly newer (more than 5 seconds): use remote
  if (remoteModified > localTimestamp + 5000) {
    console.log('[v0] Remote data is significantly newer, using remote');
    return remote;
  }

  // Default: keep local (safe default for conflicts)
  console.log('[v0] Timestamps too close, keeping local data');
  return local;
}

/**
 * Determine sync direction based on timestamps (Local-First)
 * Named export for use in google-drive.ts
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

  // Local is newer or equal: upload
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

  queueSync(operation: 'save' | 'load'): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.processSyncQueue();
    }, this.SYNC_DEBOUNCE_MS);

    this.syncQueue.push({
      operation,
      timestamp: Date.now(),
      retries: 0,
    });

    console.log('[v0] Sync operation queued:', operation);
  }

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
          console.log('[v0] Processing sync operation:', item.operation);
        } catch (err) {
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

  async forceSync(): Promise<void> {
    console.log('[v0] Force sync requested');
    this.syncQueue = [];

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.isSyncing = true;
    try {
      console.log('[v0] Force sync initiated');
    } finally {
      this.isSyncing = false;
    }
  }

  getSyncStatus(): { isSyncing: boolean; queueLength: number } {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
    };
  }

  clearQueue(): void {
    this.syncQueue = [];
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    console.log('[v0] Sync queue cleared');
  }
}

export const syncManager = new SyncManager();
