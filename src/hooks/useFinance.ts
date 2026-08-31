'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, Budgets, TransactionType, Workspace } from '@/types';
import { getCurrentPeriodIndex, getPeriodDates } from '@/lib/finance-utils';
import { useGoogleAuth } from '@/context/GoogleAuthContext';
import { saveAppStateToDrive, loadAppStateFromDrive, getCloudTimestamp, loadAllAppStateBackupsFromDrive } from '@/lib/google-drive';
import { resolveSyncConflict, deepMergeAppState, mirrorSyncFromCloud } from '@/lib/sync-manager';

const STORAGE_KEY_TRANSACTIONS = 'finanzas_v2026';
const STORAGE_KEY_BUDGETS = 'presupuestos_v2026';
const STORAGE_KEY_SEED_DATE = 'fecha_semilla_2026';
const STORAGE_KEY_DELETED_IDS = 'deleted_ids_v2026';
const STORAGE_KEY_SYNC_QUEUE = 'google_sync_queue_v2026';
const STORAGE_KEY_LOCAL_TIMESTAMP = 'local_data_timestamp_v2026';
const STORAGE_KEY_WORKSPACES = 'workspaces_v2026';
const STORAGE_KEY_ACTIVE_WORKSPACE = 'active_workspace_v2026';
const SYNC_DEBOUNCE_MS = 3000;
const AUTO_PULL_INTERVAL_MS = 30000; // 30 seconds for cross-device sync

// Helper to create a default workspace
const createDefaultWorkspace = (existingTransactions: Transaction[] = [], existingBudgets: Budgets = {}): Workspace => ({
    id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Cuenta Principal',
    transactions: existingTransactions,
    budgets: existingBudgets,
    deletedIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

export function useFinance() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | undefined>(undefined);
    const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const [seedDate, setSeedDate] = useState('2026-01-02');

    // Derived state for active workspace
    const activeWorkspace = useMemo(() => 
        workspaces.find(ws => ws.id === activeWorkspaceId) || workspaces[0] || null,
        [workspaces, activeWorkspaceId]
    );
    
    // Get transactions and budgets from active workspace
    const transactions = activeWorkspace?.transactions || [];
    const budgets = activeWorkspace?.budgets || {};
    const deletedIds = activeWorkspace?.deletedIds || [];
    
    const { isAuthenticated, accessToken, updateSyncStatus, triggerPendingSync, isOnline } = useGoogleAuth();

    // Helper to update the active workspace
    const updateActiveWorkspace = useCallback((updater: (ws: Workspace) => Workspace) => {
        setWorkspaces(prev => prev.map(ws => 
            ws.id === activeWorkspaceId ? { ...updater(ws), updatedAt: new Date().toISOString() } : ws
        ));
    }, [activeWorkspaceId]);

    // Wrapper setters that update the active workspace
    const setTransactions = useCallback((updater: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
        updateActiveWorkspace(ws => ({
            ...ws,
            transactions: typeof updater === 'function' ? updater(ws.transactions) : updater,
        }));
    }, [updateActiveWorkspace]);

    const setBudgets = useCallback((updater: Budgets | ((prev: Budgets) => Budgets)) => {
        updateActiveWorkspace(ws => ({
            ...ws,
            budgets: typeof updater === 'function' ? updater(ws.budgets) : updater,
        }));
    }, [updateActiveWorkspace]);

    const setDeletedIds = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
        updateActiveWorkspace(ws => ({
            ...ws,
            deletedIds: typeof updater === 'function' ? updater(ws.deletedIds) : updater,
        }));
    }, [updateActiveWorkspace]);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const autoPullIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const localTimestampRef = useRef<number>(0);

    // Deduplicate transactions by ID (cleanup for any previous bugs)
    const deduplicateTransactions = (txs: Transaction[]): Transaction[] => {
        const txMap = new Map<string, Transaction>();
        for (const tx of txs) {
            // Only keep transactions with valid IDs
            if (tx.id && tx.id.startsWith('tx_')) {
                const existing = txMap.get(tx.id);
                if (!existing) {
                    txMap.set(tx.id, tx);
                } else {
                    // Keep the one with the most recent updatedAt
                    const existingTime = new Date(existing.updatedAt || 0).getTime();
                    const currentTime = new Date(tx.updatedAt || 0).getTime();
                    if (currentTime > existingTime) {
                        txMap.set(tx.id, tx);
                    }
                }
            }
        }
        return Array.from(txMap.values());
    };

    // Load data from localStorage on mount (Offline-First)
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Always load from localStorage first (Offline-First)
                const localData = loadFromLocalStorage();
                
                // Then attempt Google Drive sync if authenticated and online
                if (isAuthenticated && accessToken && isOnline && localData) {
                    console.log('[v0] Attempting to sync with Google Drive');
                    try {
                        // Download remote data first to check what exists
                        console.log('[v0] Downloading remote data to check for changes');
                        const driveData = await loadAppStateFromDrive(accessToken);
                        
                        if (driveData) {
                            // Check if drive data has workspaces
                            if (driveData.workspaces && driveData.workspaces.length > 0) {
                                // Use workspace data from cloud
                                const localTransactions = localData.transactions || [];
                                const cloudWorkspaces = driveData.workspaces.map(ws => ({
                                    ...ws,
                                    // Preserve legacy/local transactions, then let cloud IDs overwrite duplicates.
                                    transactions: deduplicateTransactions([
                                        ...localTransactions,
                                        ...(ws.transactions || []),
                                    ]),
                                }));
                                setWorkspaces(cloudWorkspaces);
                                setActiveWorkspaceId(driveData.activeWorkspaceId || cloudWorkspaces[0]?.id);
                            } else {
                                // Legacy Drive data: preserve local data and upsert cloud transactions by ID.
                                const localTransactions = localData.transactions || [];
                                const cloudTransactions = Array.isArray(driveData.transactions)
                                    ? driveData.transactions
                                    : [];
                                const transactionsById = new Map<string, Transaction>();

                                for (const transaction of localTransactions) {
                                    if (transaction?.id) transactionsById.set(transaction.id, transaction);
                                }
                                for (const transaction of cloudTransactions) {
                                    if (transaction?.id) transactionsById.set(transaction.id, transaction);
                                }

                                const mergedTransactions = deduplicateTransactions([
                                    ...transactionsById.values(),
                                ]);
                                const migratedWorkspace = createDefaultWorkspace(
                                    mergedTransactions,
                                    driveData.budgets || localData.budgets || {}
                                );
                                setWorkspaces([migratedWorkspace]);
                                setActiveWorkspaceId(migratedWorkspace.id);
                                setSeedDate(driveData.seedDate || localData.seedDate);
                            }
                            
                            updateSyncStatus(false, 'synced');
                            console.log('[v0] Sync complete');
                            
                            // After syncing, set current period based on today's date
                            const todayPeriodIndex = getCurrentPeriodIndex(new Date(), seedDate);
                            setCurrentPeriodIndex(todayPeriodIndex);
                        } else {
                            // No remote data - upload local data
                            console.log('[v0] No data in Google Drive, uploading local data');
                            await saveAppStateToDrive(accessToken, {
                                ...localData,
                                workspaces: workspaces,
                                activeWorkspaceId: activeWorkspaceId,
                                timestamp: Date.now(),
                            });
                            updateSyncStatus(false, 'synced');
                        }
                    } catch (driveErr) {
                        console.log('[v0] Google Drive sync not available - using localStorage only');
                        console.log('[v0] Error:', driveErr);
                        updateSyncStatus(false, 'offline');
                    }
                }
            } catch (err) {
                console.error('[v0] Error initializing app:', err);
                loadFromLocalStorage();
            }
        };

        const loadFromLocalStorage = () => {
            // Try to load workspaces first (new format)
            const savedWorkspaces = localStorage.getItem(STORAGE_KEY_WORKSPACES);
            const savedActiveWorkspace = localStorage.getItem(STORAGE_KEY_ACTIVE_WORKSPACE);
            const savedSeedDate = localStorage.getItem(STORAGE_KEY_SEED_DATE);

            let parsedSeedDate = '2026-01-02';
            if (savedSeedDate) {
                parsedSeedDate = savedSeedDate;
                setSeedDate(parsedSeedDate);
            }

            if (savedWorkspaces) {
                try {
                    const parsed = JSON.parse(savedWorkspaces) as Workspace[];
                    // Deduplicate transactions in each workspace
                    const cleanedWorkspaces = parsed.map(ws => ({
                        ...ws,
                        transactions: deduplicateTransactions(ws.transactions || []),
                    }));
                    setWorkspaces(cleanedWorkspaces);
                    setActiveWorkspaceId(savedActiveWorkspace || cleanedWorkspaces[0]?.id || undefined);
                    
                    // Set current period based on today's date
                    const todayPeriodIndex = getCurrentPeriodIndex(new Date(), parsedSeedDate);
                    setCurrentPeriodIndex(todayPeriodIndex);
                    setIsInitialized(true);

                    return {
                        transactions: cleanedWorkspaces[0]?.transactions || [],
                        budgets: cleanedWorkspaces[0]?.budgets || {},
                        seedDate: parsedSeedDate,
                        timestamp: Date.now(),
                        workspaces: cleanedWorkspaces,
                        activeWorkspaceId: savedActiveWorkspace || cleanedWorkspaces[0]?.id,
                    };
                } catch (e) {
                    console.error("Error parsing workspaces", e);
                }
            }

            // Fallback: migrate from old format
            const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
            const savedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);

            let parsedTransactions: Transaction[] = [];
            let parsedBudgets: Budgets = {};

            if (savedTransactions) {
                try {
                    const raw = JSON.parse(savedTransactions);
                    parsedTransactions = deduplicateTransactions(raw);
                } catch (e) {
                    console.error("Error parsing transactions", e);
                }
            }

            if (savedBudgets) {
                try {
                    parsedBudgets = JSON.parse(savedBudgets);
                } catch (e) {
                    console.error("Error parsing budgets", e);
                }
            }

            // Create default workspace with migrated data
            const defaultWorkspace = createDefaultWorkspace(parsedTransactions, parsedBudgets);
            setWorkspaces([defaultWorkspace]);
            setActiveWorkspaceId(defaultWorkspace.id);

            // Set current period based on today's date
            const todayPeriodIndex = getCurrentPeriodIndex(new Date(), parsedSeedDate);
            setCurrentPeriodIndex(todayPeriodIndex);
            setIsInitialized(true);

            return {
                transactions: parsedTransactions,
                budgets: parsedBudgets,
                seedDate: parsedSeedDate,
                timestamp: Date.now(),
                workspaces: [defaultWorkspace],
                activeWorkspaceId: defaultWorkspace.id,
            };
        };

        initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, accessToken, isOnline]);

    // Always save to localStorage immediately (Offline-First)
    // Queue sync to Google Drive when data changes
    useEffect(() => {
        if (!isInitialized || workspaces.length === 0) return;

        // ALWAYS save to localStorage first
        const now = Date.now();
        localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
        localStorage.setItem(STORAGE_KEY_ACTIVE_WORKSPACE, activeWorkspaceId || '');
        localStorage.setItem(STORAGE_KEY_SEED_DATE, seedDate);
        localStorage.setItem(STORAGE_KEY_LOCAL_TIMESTAMP, now.toString());
        localTimestampRef.current = now;

        // If authenticated and online, queue sync to Drive
        if (isAuthenticated && accessToken && isOnline) {
            updateSyncStatus(true);

            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }

            syncTimeoutRef.current = setTimeout(async () => {
                try {
                    // Verify token is still valid before syncing
                    if (!accessToken || accessToken.length < 10) {
                        console.error('[v0] Token missing or invalid before sync attempt');
                        updateSyncStatus(false, 'offline');
                        return;
                    }

                    updateSyncStatus(true);
                    await saveAppStateToDrive(accessToken, {
                        transactions: activeWorkspace?.transactions || [],
                        budgets: activeWorkspace?.budgets || {},
                        seedDate,
                        timestamp: Date.now(),
                        workspaces,
                        activeWorkspaceId: activeWorkspaceId || undefined,
                    });
                    updateSyncStatus(false, 'synced');
                } catch (err) {
                    console.error('[v0] Error syncing to Drive:', err);
                    updateSyncStatus(false, 'offline');
                }
            }, SYNC_DEBOUNCE_MS);
        } else if (!isOnline && isAuthenticated) {
            updateSyncStatus(false, 'pending');
        } else if (isAuthenticated && !accessToken) {
            updateSyncStatus(false, 'offline');
        }

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [workspaces, activeWorkspaceId, seedDate, isInitialized, isAuthenticated, accessToken, isOnline, updateSyncStatus, activeWorkspace]);

    // Auto-pull polling: Check for cloud updates every 30 seconds for cross-device sync
    useEffect(() => {
        if (!isInitialized || !isAuthenticated || !accessToken || !isOnline) {
            // Clear interval if conditions not met
            if (autoPullIntervalRef.current) {
                clearInterval(autoPullIntervalRef.current);
                autoPullIntervalRef.current = null;
            }
            return;
        }

        const checkForCloudUpdates = async () => {
            try {
                // Get the cloud timestamp
                const cloudTimestamp = await getCloudTimestamp(accessToken);
                if (!cloudTimestamp) return;

                // Get local timestamp
                const localTimestamp = localTimestampRef.current || 
                    parseInt(localStorage.getItem(STORAGE_KEY_LOCAL_TIMESTAMP) || '0');

                // If cloud is newer, mirror the cloud state exactly (includes deletions)
                if (cloudTimestamp > localTimestamp) {
                    // Show syncing indicator
                    updateSyncStatus(true);

                    // Download full data from cloud
                    const driveData = await loadAppStateFromDrive(accessToken);
                    if (driveData) {
                        // Check if cloud has workspaces
                        if (driveData.workspaces && driveData.workspaces.length > 0) {
                            // Use workspace data from cloud
                            const cloudWorkspaces = driveData.workspaces.map(ws => ({
                                ...ws,
                                transactions: deduplicateTransactions(ws.transactions || []),
                            }));
                            setWorkspaces(cloudWorkspaces);
                            if (driveData.activeWorkspaceId) {
                                setActiveWorkspaceId(driveData.activeWorkspaceId);
                            }
                        } else {
                            // Legacy data - mirror sync for backward compatibility
                            const localState = {
                                transactions: activeWorkspace?.transactions || [],
                                budgets: activeWorkspace?.budgets || {},
                                seedDate: localStorage.getItem(STORAGE_KEY_SEED_DATE) || '2026-01-02',
                                timestamp: localTimestamp,
                            };

                            const mirrored = mirrorSyncFromCloud(localState, driveData);
                            const dedupedTransactions = deduplicateTransactions(mirrored.transactions);

                            // Update active workspace with mirrored data
                            if (activeWorkspaceId) {
                                setWorkspaces(prev => prev.map(ws => 
                                    ws.id === activeWorkspaceId 
                                        ? { ...ws, transactions: dedupedTransactions, budgets: mirrored.budgets, updatedAt: new Date().toISOString() }
                                        : ws
                                ));
                            }
                            if (mirrored.seedDate) setSeedDate(mirrored.seedDate);
                        }

                        // Update local storage and timestamp
                        localStorage.setItem(STORAGE_KEY_LOCAL_TIMESTAMP, cloudTimestamp.toString());
                        localTimestampRef.current = cloudTimestamp;
                    }

                    // Show synced indicator after brief delay
                    setTimeout(() => {
                        updateSyncStatus(false, 'synced');
                    }, 500);
                }
            } catch (err) {
                // Silent fail - don't disrupt user experience
            }
        };

        // Initial check
        checkForCloudUpdates();

        // Set up polling interval
        autoPullIntervalRef.current = setInterval(checkForCloudUpdates, AUTO_PULL_INTERVAL_MS);

        return () => {
            if (autoPullIntervalRef.current) {
                clearInterval(autoPullIntervalRef.current);
                autoPullIntervalRef.current = null;
            }
        };
    }, [isInitialized, isAuthenticated, accessToken, isOnline, updateSyncStatus]);

    const currentPeriodData = useMemo(() => {
        const { start, end } = getPeriodDates(currentPeriodIndex, seedDate);

        // Include the original index to fix edit/delete bugs
        const mapped = transactions.map((t, index) => ({ ...t, originalIndex: index }));

        const filtered = mapped.filter((t) => {
            const tDate = new Date(t.date + 'T00:00:00');
            return tDate >= start && tDate <= end;
        });

        const income = filtered
            .filter((t) => t.type === 'ingreso')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expenses = filtered
            .filter((t) => t.type === 'egreso')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const categoryTotals: Record<string, number> = {};
        filtered.forEach((t) => {
            if (t.type === 'egreso') {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount || 0);
            }
        });

        return {
            transactions: filtered,
            income,
            expenses,
            net: income - expenses,
            categoryTotals,
            budget: budgets[currentPeriodIndex] || { income: 0, expense: 0 },
            start,
            end,
        };
    }, [transactions, budgets, currentPeriodIndex, seedDate]);

    const addTransaction = (t: Transaction) => {
        const transactionWithTimestamp = {
            ...t,
            updatedAt: new Date().toISOString(),
        };
        setTransactions((prev) => [...prev, transactionWithTimestamp]);
    };

    const updateTransaction = (index: number, updated: Transaction) => {
        const updatedWithTimestamp = {
            ...updated,
            updatedAt: new Date().toISOString(),
        };
        setTransactions((prev) => {
            const next = [...prev];
            next[index] = updatedWithTimestamp;
            return next;
        });
    };

    const deleteTransaction = (index: number) => {
        // Get the transaction ID before deleting
        const txToDelete = transactions[index];
        if (txToDelete?.id) {
            // Add to deletedIds registry before removing
            setDeletedIds((prev) => {
                if (prev.includes(txToDelete.id)) return prev;
                return [...prev, txToDelete.id];
            });
        }
        setTransactions((prev) => prev.filter((_, i) => i !== index));
    };

    const saveBudget = (index: number, budget: { income: number; expense: number }) => {
        const budgetWithTimestamp = {
            ...budget,
            updatedAt: new Date().toISOString(),
        };
        setBudgets((prev) => ({
            ...prev,
            [index]: budgetWithTimestamp,
        }));
    };

    const clearAll = () => {
        if (confirm('¿Borrar TODO?')) {
            setTransactions([]);
            setBudgets({});
            setSeedDate('2026-01-02');
            localStorage.removeItem(STORAGE_KEY_WORKSPACES);
            localStorage.removeItem(STORAGE_KEY_ACTIVE_WORKSPACE);
            localStorage.removeItem(STORAGE_KEY_SEED_DATE);
        }
    };

    // Workspace CRUD Operations
    const createWorkspace = useCallback((name: string) => {
        const newWorkspace: Workspace = {
            id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            transactions: [],
            budgets: {},
            deletedIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setWorkspaces(prev => [...prev, newWorkspace]);
        return newWorkspace.id;
    }, []);

    const renameWorkspace = useCallback((workspaceId: string, newName: string) => {
        setWorkspaces(prev => prev.map(ws => 
            ws.id === workspaceId 
                ? { ...ws, name: newName, updatedAt: new Date().toISOString() }
                : ws
        ));
    }, []);

    const deleteWorkspace = useCallback((workspaceId: string) => {
        // Don't allow deleting the last workspace
        if (workspaces.length <= 1) return false;
        
        setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
        
        // If deleting the active workspace, switch to the first remaining one
        if (activeWorkspaceId === workspaceId) {
            const remaining = workspaces.filter(ws => ws.id !== workspaceId);
            setActiveWorkspaceId(remaining[0]?.id || undefined);
        }
        return true;
    }, [workspaces, activeWorkspaceId]);

    const switchWorkspace = useCallback((workspaceId: string) => {
        const exists = workspaces.some(ws => ws.id === workspaceId);
        if (exists) {
            setActiveWorkspaceId(workspaceId);
        }
    }, [workspaces]);

    const recoverTransactions = useCallback(async (): Promise<number> => {
        const localRaw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        let localTransactions: Transaction[] = [];
        if (localRaw) {
            try {
                localTransactions = JSON.parse(localRaw);
            } catch {
                localTransactions = [];
            }
        }

        const backups = isAuthenticated && accessToken
            ? await loadAllAppStateBackupsFromDrive(accessToken)
            : [];
        const mergedById = new Map<string, Transaction>();
        for (const transaction of localTransactions) {
            if (transaction?.id && !deletedIds.includes(transaction.id)) mergedById.set(transaction.id, transaction);
        }
        for (const backup of backups) {
            const globalDeletedIds = backup.deletedIds || [];
            for (const transaction of backup.transactions || []) {
                if (transaction?.id && !globalDeletedIds.includes(transaction.id) && !deletedIds.includes(transaction.id)) {
                    mergedById.set(transaction.id, transaction);
                }
            }
            for (const workspace of backup.workspaces || []) {
                for (const transaction of workspace.transactions || []) {
                    if (transaction?.id && !workspace.deletedIds?.includes(transaction.id) && !deletedIds.includes(transaction.id)) {
                        mergedById.set(transaction.id, transaction);
                    }
                }
            }
        }

        const recovered = deduplicateTransactions(Array.from(mergedById.values()));
        updateActiveWorkspace((workspace) => ({ ...workspace, transactions: recovered }));
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(recovered));
        return recovered.length;
    }, [accessToken, deletedIds, isAuthenticated, updateActiveWorkspace]);

    return {
        transactions,
        budgets,
        currentPeriodIndex,
        setCurrentPeriodIndex,
        currentPeriodData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        saveBudget,
        clearAll,
        isInitialized,
        seedDate,
        setSeedDate,
        recoverTransactions,
        // Workspace exports
        workspaces,
        activeWorkspace,
        activeWorkspaceId,
        createWorkspace,
        renameWorkspace,
        deleteWorkspace,
        switchWorkspace,
    };
}
