'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, Budgets, Balances, TransactionType } from '@/types';
import { getCurrentPeriodIndex, getPeriodDates } from '@/lib/finance-utils';
import { useGoogleAuth } from '@/context/GoogleAuthContext';
import { saveAppStateToDrive, loadAppStateFromDrive, getCloudTimestamp } from '@/lib/google-drive';
import { resolveSyncConflict, deepMergeAppState, mirrorSyncFromCloud } from '@/lib/sync-manager';

const STORAGE_KEY_TRANSACTIONS = 'finanzas_v2026';
const STORAGE_KEY_BUDGETS = 'presupuestos_v2026';
const STORAGE_KEY_BALANCES = 'balances_v2026';
const STORAGE_KEY_SEED_DATE = 'fecha_semilla_2026';
const STORAGE_KEY_SYNC_QUEUE = 'google_sync_queue_v2026';
const STORAGE_KEY_LOCAL_TIMESTAMP = 'local_data_timestamp_v2026';
const SYNC_DEBOUNCE_MS = 3000;
const AUTO_PULL_INTERVAL_MS = 30000; // 30 seconds for cross-device sync

const DEFAULT_BALANCES: Balances = {
    cheques: 0,
    ahorros: 0,
    efectivo: 0,
    updatedAt: new Date().toISOString(),
};

// Helper: Recalculate cheques balance from transactions
// Formula: Initial Balance (ahorros + efectivo stays unchanged) + All Incomes - All Expenses
const recalculateChequesFromTransactions = (
    transactions: Transaction[],
    currentBalances: Balances
): Balances => {
    let chequesFromTransactions = 0;

    transactions.forEach((t) => {
        const amount = Number(t.amount);
        if (t.type === 'ingreso') {
            chequesFromTransactions += amount;
        } else if (t.type === 'egreso') {
            chequesFromTransactions -= amount;
        }
    });

    return {
        ...currentBalances,
        cheques: chequesFromTransactions,
        updatedAt: new Date().toISOString(),
    };
};

export function useFinance() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budgets>({});
    const [balances, setBalances] = useState<Balances>(DEFAULT_BALANCES);
    const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const [seedDate, setSeedDate] = useState('2026-01-02');
    
    const { isAuthenticated, accessToken, updateSyncStatus, triggerPendingSync, isOnline } = useGoogleAuth();
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
                            // Deep merge with transaction-level identity tracking
                            const merged = deepMergeAppState(localData, driveData);
                            
                            // Deduplicate before setting state
                            const dedupedTransactions = deduplicateTransactions(merged.transactions);
                            
                            setTransactions(dedupedTransactions);
                            setBudgets(merged.budgets);
                            setSeedDate(merged.seedDate);
                            
                            // Save deduped data back to localStorage
                            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(dedupedTransactions));
                            localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(merged.budgets));
                            
                            updateSyncStatus(false, 'synced');
                            console.log('[v0] Deep merge complete with deduplication');
                            
                            // After merging, set current period based on today's date
                            const todayPeriodIndex = getCurrentPeriodIndex(new Date(), merged.seedDate);
                            setCurrentPeriodIndex(todayPeriodIndex);
                        } else {
                            // No remote data - upload local data
                            console.log('[v0] No data in Google Drive, uploading local data');
                            await saveAppStateToDrive(accessToken, {
                                ...localData,
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
            const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
            const savedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);
            const savedBalances = localStorage.getItem(STORAGE_KEY_BALANCES);
            const savedSeedDate = localStorage.getItem(STORAGE_KEY_SEED_DATE);

            let parsedTransactions: Transaction[] = [];
            let parsedBudgets: Budgets = {};
            let parsedBalances: Balances = DEFAULT_BALANCES;
            let parsedSeedDate = '2026-01-02';

            if (savedTransactions) {
                try {
                    const raw = JSON.parse(savedTransactions);
                    // Deduplicate on load to clean up any previous bugs
                    parsedTransactions = deduplicateTransactions(raw);
                    setTransactions(parsedTransactions);
                    
                    // Save cleaned data back if there were duplicates
                    if (parsedTransactions.length !== raw.length) {
                        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(parsedTransactions));
                    }
                } catch (e) {
                    console.error("Error parsing transactions", e);
                }
            }

            if (savedBudgets) {
                try {
                    parsedBudgets = JSON.parse(savedBudgets);
                    setBudgets(parsedBudgets);
                } catch (e) {
                    console.error("Error parsing budgets", e);
                }
            }

            if (savedBalances) {
                try {
                    parsedBalances = JSON.parse(savedBalances);
                    setBalances(parsedBalances);
                } catch (e) {
                    console.error("Error parsing balances", e);
                }
            }

            if (savedSeedDate) {
                parsedSeedDate = savedSeedDate;
                setSeedDate(parsedSeedDate);
            }

            // Set current period based on today's date
            const todayPeriodIndex = getCurrentPeriodIndex(new Date(), parsedSeedDate);
            setCurrentPeriodIndex(todayPeriodIndex);
            setIsInitialized(true);

            return {
                transactions: parsedTransactions,
                budgets: parsedBudgets,
                balances: parsedBalances,
                seedDate: parsedSeedDate,
                timestamp: Date.now(),
            };
        };

        initializeApp();
    }, [isAuthenticated, accessToken, isOnline, updateSyncStatus]);

    // Always save to localStorage immediately (Offline-First)
    // Queue sync to Google Drive when data changes
    useEffect(() => {
        if (!isInitialized) return;

        // ALWAYS save to localStorage first
        const now = Date.now();
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
        localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(balances));
        localStorage.setItem(STORAGE_KEY_SEED_DATE, seedDate);
        localStorage.setItem(STORAGE_KEY_LOCAL_TIMESTAMP, now.toString());
        localTimestampRef.current = now;

        // If authenticated and online, queue sync to Drive
        if (isAuthenticated && accessToken && isOnline) {
            console.log('[v0] Drive sync eligible: authenticated=true, token exists, online=true');
            console.log('[v0] Token length:', accessToken?.length);
            
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
                        transactions,
                        budgets,
                        balances,
                        seedDate,
                        timestamp: Date.now(),
                    });
                    updateSyncStatus(false, 'synced');
                    console.log('[v0] Drive sync completed successfully');
                } catch (err) {
                    console.error('[v0] Error syncing to Drive:', err);
                    console.log('[v0] Falling back to localStorage - data is safe locally');
                    updateSyncStatus(false, 'offline');
                }
            }, SYNC_DEBOUNCE_MS);
        } else if (!isOnline && isAuthenticated) {
            // Mark as pending sync when offline
            console.log('[v0] Offline: marking data as pending sync');
            updateSyncStatus(false, 'pending');
        } else if (isAuthenticated && !accessToken) {
            console.log('[v0] Authenticated but no access token available');
            updateSyncStatus(false, 'offline');
        } else if (!isAuthenticated) {
            console.log('[v0] Not authenticated, skipping Drive sync');
        }

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [transactions, budgets, balances, seedDate, isInitialized, isAuthenticated, accessToken, isOnline, updateSyncStatus]);

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
                        // Get current local state
                        const localState = {
                            transactions: JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]'),
                            budgets: JSON.parse(localStorage.getItem(STORAGE_KEY_BUDGETS) || '{}'),
                            balances: JSON.parse(localStorage.getItem(STORAGE_KEY_BALANCES) || JSON.stringify(DEFAULT_BALANCES)),
                            seedDate: localStorage.getItem(STORAGE_KEY_SEED_DATE) || '2026-01-02',
                            timestamp: localTimestamp,
                        };

                        // Mirror sync: cloud is newer, so use cloud data exactly
                        // This ensures deletions are reflected on other devices
                        const mirrored = mirrorSyncFromCloud(localState, driveData);
                        const dedupedTransactions = deduplicateTransactions(mirrored.transactions);

                        // Recalculate balances from transactions to ensure accuracy
                        const recalculatedBalances = recalculateChequesFromTransactions(
                            dedupedTransactions,
                            mirrored.balances || DEFAULT_BALANCES
                        );

                        // Update state to exactly match cloud with recalculated balances
                        setTransactions(dedupedTransactions);
                        setBudgets(mirrored.budgets);
                        setBalances(recalculatedBalances);
                        if (mirrored.seedDate) setSeedDate(mirrored.seedDate);

                        // Update local storage and timestamp
                        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(dedupedTransactions));
                        localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(mirrored.budgets));
                        localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(recalculatedBalances));
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

        // Auto-update balances.cheques based on transaction type
        const amountValue = Number(t.amount);
        if (amountValue > 0) {
            if (t.type === 'ingreso') {
                // Income: Add to cheques
                setBalances((prev) => ({
                    ...prev,
                    cheques: prev.cheques + amountValue,
                    updatedAt: new Date().toISOString(),
                }));
            } else if (t.type === 'egreso') {
                // Expense: Subtract from cheques
                setBalances((prev) => ({
                    ...prev,
                    cheques: prev.cheques - amountValue,
                    updatedAt: new Date().toISOString(),
                }));
            }
        }
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
        // Get the transaction being deleted to revert its balance impact
        const transactionToDelete = transactions[index];
        
        if (transactionToDelete) {
            const amountValue = Number(transactionToDelete.amount);
            
            if (amountValue > 0) {
                if (transactionToDelete.type === 'ingreso') {
                    // Revert income: subtract from cheques
                    setBalances((prev) => ({
                        ...prev,
                        cheques: prev.cheques - amountValue,
                        updatedAt: new Date().toISOString(),
                    }));
                } else if (transactionToDelete.type === 'egreso') {
                    // Revert expense: add back to cheques
                    setBalances((prev) => ({
                        ...prev,
                        cheques: prev.cheques + amountValue,
                        updatedAt: new Date().toISOString(),
                    }));
                }
            }
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
            setBalances(DEFAULT_BALANCES);
            setSeedDate('2026-01-02');
            localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
            localStorage.removeItem(STORAGE_KEY_BUDGETS);
            localStorage.removeItem(STORAGE_KEY_BALANCES);
            localStorage.removeItem(STORAGE_KEY_SEED_DATE);
        }
    };

    const updateBalances = (newBalances: Partial<Balances>) => {
        setBalances((prev) => ({
            ...prev,
            ...newBalances,
            updatedAt: new Date().toISOString(),
        }));
    };

    return {
        transactions,
        budgets,
        balances,
        currentPeriodIndex,
        setCurrentPeriodIndex,
        currentPeriodData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        saveBudget,
        updateBalances,
        clearAll,
        isInitialized,
        seedDate,
        setSeedDate,
    };
}
