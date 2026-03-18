'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, Budgets, TransactionType } from '@/types';
import { getCurrentPeriodIndex, getPeriodDates } from '@/lib/finance-utils';
import { useGoogleAuth } from '@/context/GoogleAuthContext';
import { saveAppStateToDrive, loadAppStateFromDrive } from '@/lib/google-drive';
import { resolveSyncConflict, deepMergeAppState } from '@/lib/sync-manager';

const STORAGE_KEY_TRANSACTIONS = 'finanzas_v2026';
const STORAGE_KEY_BUDGETS = 'presupuestos_v2026';
const STORAGE_KEY_SEED_DATE = 'fecha_semilla_2026';
const STORAGE_KEY_SYNC_QUEUE = 'google_sync_queue_v2026';
const SYNC_DEBOUNCE_MS = 3000;

export function useFinance() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budgets>({});
    const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const [seedDate, setSeedDate] = useState('2026-01-02');
    
    const { isAuthenticated, accessToken, updateSyncStatus, triggerPendingSync, isOnline } = useGoogleAuth();
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load data from localStorage on mount (Offline-First)
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Always load from localStorage first (Offline-First)
                loadFromLocalStorage();
                
                // Then attempt Google Drive sync if authenticated and online
                if (isAuthenticated && accessToken && isOnline) {
                    console.log('[v0] Attempting to sync with Google Drive');
                    try {
                        // UPLOAD-FIRST: Always upload local changes before attempting download
                        console.log('[v0] Uploading local changes to Drive first');
                        await saveAppStateToDrive(accessToken, {
                            transactions,
                            budgets,
                            seedDate,
                            timestamp: Date.now(),
                        });
                        console.log('[v0] Successfully uploaded local changes to Drive');
                        
                        // THEN download remote data to check for newer changes from other devices
                        console.log('[v0] Downloading remote data to check for newer changes');
                        const driveData = await loadAppStateFromDrive(accessToken);
                        if (driveData) {
                            const localState = {
                                transactions: JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]'),
                                budgets: JSON.parse(localStorage.getItem(STORAGE_KEY_BUDGETS) || '{}'),
                                seedDate: localStorage.getItem(STORAGE_KEY_SEED_DATE) || '2026-01-02',
                                timestamp: Date.now(),
                            };
                            
                            // Deep merge with transaction-level identity tracking
                            const merged = deepMergeAppState(localState, driveData);
                            setTransactions(merged.transactions);
                            setBudgets(merged.budgets);
                            setSeedDate(merged.seedDate);
                            updateSyncStatus(false, 'synced');
                            console.log('[v0] Deep merge complete: local transactions kept if no remote match');
                            
                            // After merging, set current period based on today's date
                            const todayPeriodIndex = getCurrentPeriodIndex(new Date(), merged.seedDate);
                            setCurrentPeriodIndex(todayPeriodIndex);
                        } else {
                            console.log('[v0] No data in Google Drive, local changes remain');
                            updateSyncStatus(false, 'synced');
                        }
                    } catch (driveErr) {
                        console.log('[v0] Google Drive sync not available - using localStorage only');
                        console.log('[v0] Note: Google Drive sync requires proper OAuth 2.0 Authorization Code Flow with drive.appdata scope');
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
            const savedSeedDate = localStorage.getItem(STORAGE_KEY_SEED_DATE);

            if (savedTransactions) {
                try {
                    setTransactions(JSON.parse(savedTransactions));
                } catch (e) {
                    console.error("Error parsing transactions", e);
                }
            }

            if (savedBudgets) {
                try {
                    setBudgets(JSON.parse(savedBudgets));
                } catch (e) {
                    console.error("Error parsing budgets", e);
                }
            }

            if (savedSeedDate) {
                setSeedDate(savedSeedDate);
                // After setting seed date, calculate current period based on today's date
                const todayPeriodIndex = getCurrentPeriodIndex(new Date(), savedSeedDate);
                setCurrentPeriodIndex(todayPeriodIndex);
            } else {
                // If no seed date saved, calculate for default seed date
                const todayPeriodIndex = getCurrentPeriodIndex(new Date(), '2026-01-02');
                setCurrentPeriodIndex(todayPeriodIndex);
            }
        };

        initializeApp().finally(() => {
            setIsInitialized(true);
        });
    }, [isAuthenticated, accessToken, isOnline, updateSyncStatus]);

    // Always save to localStorage immediately (Offline-First)
    // Queue sync to Google Drive when data changes
    useEffect(() => {
        if (!isInitialized) return;

        // ALWAYS save to localStorage first
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
        localStorage.setItem(STORAGE_KEY_SEED_DATE, seedDate);
        
        console.log('[v0] Data saved to localStorage');

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
                    console.log('[v0] Starting Drive sync with token');
                    await saveAppStateToDrive(accessToken, {
                        transactions,
                        budgets,
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
    }, [transactions, budgets, seedDate, isInitialized, isAuthenticated, accessToken, isOnline, updateSyncStatus]);

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
            localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
            localStorage.removeItem(STORAGE_KEY_BUDGETS);
            localStorage.removeItem(STORAGE_KEY_SEED_DATE);
        }
    };

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
    };
}
