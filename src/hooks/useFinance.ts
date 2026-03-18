'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, Budgets, TransactionType } from '@/types';
import { getCurrentPeriodIndex, getPeriodDates } from '@/lib/finance-utils';
import { useGoogleAuth } from '@/context/GoogleAuthContext';
import { saveAppStateToDrive, loadAppStateFromDrive } from '@/lib/google-drive';
import { resolveSyncConflict } from '@/lib/sync-manager';

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
                    console.log('[v0] Attempting to load from Google Drive');
                    try {
                        const driveData = await loadAppStateFromDrive(accessToken);
                        if (driveData) {
                            const localState = {
                                transactions: JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]'),
                                budgets: JSON.parse(localStorage.getItem(STORAGE_KEY_BUDGETS) || '{}'),
                                seedDate: localStorage.getItem(STORAGE_KEY_SEED_DATE) || '2026-01-02',
                                timestamp: localStorage.getItem('app_state_timestamp') ? parseInt(localStorage.getItem('app_state_timestamp') || '0') : 0,
                            };
                            
                            // Local-First: Use Local-First strategy to decide sync direction
                            const merged = resolveSyncConflict(localState, driveData);
                            setTransactions(merged.transactions);
                            setBudgets(merged.budgets);
                            setSeedDate(merged.seedDate);
                            
                            // Store timestamp for future sync decisions
                            localStorage.setItem('app_state_timestamp', merged.timestamp.toString());
                            
                            updateSyncStatus(false, 'synced');
                            
                            // After merging, set current period based on today's date
                            const todayPeriodIndex = getCurrentPeriodIndex(new Date(), merged.seedDate);
                            setCurrentPeriodIndex(todayPeriodIndex);
                        } else {
                            console.log('[v0] No data in Google Drive, using localStorage');
                            updateSyncStatus(false, 'pending');
                        }
                    } catch (driveErr) {
                        if (driveErr instanceof Error && driveErr.message === 'TOKEN_EXPIRED') {
                            console.error('[v0] Token expired during initialization');
                            localStorage.setItem('google_token_expired', 'true');
                            updateSyncStatus(false, 'error');
                        } else {
                            console.log('[v0] Google Drive sync not available - using localStorage only');
                            updateSyncStatus(false, 'offline');
                        }
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

        // ALWAYS save to localStorage first with timestamp
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
        localStorage.setItem(STORAGE_KEY_SEED_DATE, seedDate);
        localStorage.setItem('app_state_timestamp', Date.now().toString());
        
        console.log('[v0] Data saved to localStorage with timestamp:', Date.now());

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
                    console.log('[v0] Starting Drive sync with Local-First strategy');
                    
                    const appState = {
                        transactions,
                        budgets,
                        seedDate,
                        timestamp: Date.now(),
                    };

                    // Get remote timestamp to decide sync direction
                    try {
                        const { getRemoteFileTimestamp } = await import('@/lib/google-drive');
                        const remoteModified = await getRemoteFileTimestamp(accessToken);
                        
                        if (remoteModified) {
                          console.log('[v0] Remote file timestamp:', remoteModified);
                          // Local data is always newer or equal (just created), so upload it
                          await saveAppStateToDrive(accessToken, appState);
                        } else {
                          // No remote file, just save
                          await saveAppStateToDrive(accessToken, appState);
                        }
                    } catch (err) {
                        if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
                            console.error('[v0] OAuth2 token expired - marking for re-authentication');
                            updateSyncStatus(false, 'error');
                            // Signal that user needs to re-authenticate
                            localStorage.setItem('google_token_expired', 'true');
                            return;
                        }
                        throw err;
                    }
                    
                    updateSyncStatus(false, 'synced');
                    console.log('[v0] Drive sync completed successfully');
                } catch (err) {
                    console.error('[v0] Error syncing to Drive:', err);
                    
                    if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
                        console.error('[v0] Token expired during sync');
                        updateSyncStatus(false, 'error');
                        localStorage.setItem('google_token_expired', 'true');
                    } else {
                        console.log('[v0] Falling back to localStorage - data is safe locally');
                        updateSyncStatus(false, 'offline');
                    }
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
        setTransactions((prev) => [...prev, t]);
    };

    const updateTransaction = (index: number, updated: Transaction) => {
        setTransactions((prev) => {
            const next = [...prev];
            next[index] = updated;
            return next;
        });
    };

    const deleteTransaction = (index: number) => {
        setTransactions((prev) => prev.filter((_, i) => i !== index));
    };

    const saveBudget = (index: number, budget: { income: number; expense: number }) => {
        setBudgets((prev) => ({
            ...prev,
            [index]: budget,
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
