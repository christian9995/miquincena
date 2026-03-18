'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, Budgets, TransactionType } from '@/types';
import { getCurrentPeriodIndex, getPeriodDates } from '@/lib/finance-utils';
import { useGoogleAuth } from '@/context/GoogleAuthContext';
import { saveAppStateToDrive, loadAppStateFromDrive } from '@/lib/google-drive';
import { resolveSyncConflict } from '@/lib/sync-manager';

// Storage keys for persistent data
const STORAGE_KEY_TRANSACTIONS = 'finanzas_v2026';
const STORAGE_KEY_BUDGETS = 'presupuestos_v2026';
const STORAGE_KEY_SEED_DATE = 'fecha_semilla_2026';
const STORAGE_KEY_TIMESTAMP = 'app_state_timestamp';
const SYNC_DEBOUNCE_MS = 3000;

export function useFinance() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budgets>({});
    const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const [seedDate, setSeedDate] = useState('2026-01-02');
    
    const { isAuthenticated, accessToken, updateSyncStatus, isOnline } = useGoogleAuth();
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Load data from localStorage and optionally sync with Google Drive
     * Implements Local-First strategy: local data always saves first
     */
    useEffect(() => {
        const initializeApp = async () => {
            // Step 1: Always load from localStorage first (Offline-First)
            loadFromLocalStorage();
            
            // Step 2: If authenticated, online, and have a token, attempt Drive sync
            if (isAuthenticated && accessToken && isOnline) {
                await syncWithDriveOnInit();
            }
        };

        const loadFromLocalStorage = () => {
            try {
                const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
                const savedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);
                const savedSeedDate = localStorage.getItem(STORAGE_KEY_SEED_DATE);

                if (savedTransactions) {
                    setTransactions(JSON.parse(savedTransactions));
                }

                if (savedBudgets) {
                    setBudgets(JSON.parse(savedBudgets));
                }

                if (savedSeedDate) {
                    setSeedDate(savedSeedDate);
                    const todayPeriodIndex = getCurrentPeriodIndex(new Date(), savedSeedDate);
                    setCurrentPeriodIndex(todayPeriodIndex);
                } else {
                    const todayPeriodIndex = getCurrentPeriodIndex(new Date(), '2026-01-02');
                    setCurrentPeriodIndex(todayPeriodIndex);
                }
            } catch (err) {
                console.error('[v0] Error loading from localStorage:', err);
            }
        };

        const syncWithDriveOnInit = async () => {
            try {
                console.log('[v0] Attempting to load from Google Drive on init');
                
                // Get the data we just loaded from localStorage
                const localTimestamp = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
                const localTs = localTimestamp ? parseInt(localTimestamp) : 0;
                
                // Try to load from Drive
                const driveData = await loadAppStateFromDrive(accessToken!);
                
                if (driveData) {
                    const driveTs = driveData.timestamp || 0;
                    
                    // Local-First Decision: if local is newer, keep it
                    if (localTs >= driveTs) {
                        console.log('[v0] Local data is newer/equal - keeping local');
                        updateSyncStatus(false, 'pending');
                    } else {
                        console.log('[v0] Drive data is newer - merging');
                        setTransactions(driveData.transactions);
                        setBudgets(driveData.budgets);
                        setSeedDate(driveData.seedDate);
                        localStorage.setItem(STORAGE_KEY_TIMESTAMP, driveTs.toString());
                        updateSyncStatus(false, 'synced');
                    }
                    
                    // Always set current period to today
                    const todayPeriodIndex = getCurrentPeriodIndex(
                        new Date(),
                        driveData.seedDate || '2026-01-02'
                    );
                    setCurrentPeriodIndex(todayPeriodIndex);
                } else {
                    console.log('[v0] No data in Google Drive');
                    updateSyncStatus(false, 'pending');
                }
            } catch (err) {
                if (err instanceof Error) {
                    if (err.message === 'TOKEN_EXPIRED') {
                        console.error('[v0] Token expired - triggering re-authentication');
                        localStorage.setItem('google_token_expired', 'true');
                        updateSyncStatus(false, 'error');
                    } else {
                        console.log('[v0] Drive sync failed:', err.message);
                        updateSyncStatus(false, 'offline');
                    }
                } else {
                    console.error('[v0] Unknown error during Drive sync:', err);
                    updateSyncStatus(false, 'offline');
                }
            }
        };

        initializeApp().finally(() => {
            setIsInitialized(true);
        });
    }, [isAuthenticated, accessToken, isOnline, updateSyncStatus]);

    /**
     * Save to localStorage immediately (Offline-First)
     * Queue sync to Google Drive with Local-First validation
     */
    useEffect(() => {
        if (!isInitialized) return;

        // ALWAYS save to localStorage first with new timestamp
        const now = Date.now();
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
        localStorage.setItem(STORAGE_KEY_SEED_DATE, seedDate);
        localStorage.setItem(STORAGE_KEY_TIMESTAMP, now.toString());

        console.log('[v0] Data saved to localStorage with timestamp:', now);

        // If authenticated and online, queue sync to Drive
        if (!isAuthenticated || !accessToken || !isOnline) {
            if (!isOnline && isAuthenticated) {
                updateSyncStatus(false, 'pending');
            }
            return;
        }

        console.log('[v0] Queuing Drive sync (authenticated, token exists, online)');
        updateSyncStatus(true);

        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(async () => {
            await performDriveSync(now);
        }, SYNC_DEBOUNCE_MS);

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [transactions, budgets, seedDate, isInitialized, isAuthenticated, accessToken, isOnline, updateSyncStatus]);

    /**
     * Perform the actual Drive sync with Local-First validation
     */
    const performDriveSync = async (localTimestamp: number) => {
        try {
            if (!accessToken || accessToken.length < 10) {
                console.error('[v0] Invalid token for sync');
                updateSyncStatus(false, 'offline');
                return;
            }

            console.log('[v0] Starting Drive sync with Local-First strategy');
            
            const appState = {
                transactions,
                budgets,
                seedDate,
                timestamp: localTimestamp,
            };

            // Local-First: Always upload local data first
            try {
                await saveAppStateToDrive(accessToken, appState);
                console.log('[v0] Drive sync completed successfully');
                updateSyncStatus(false, 'synced');
            } catch (driveErr) {
                // Handle 401 token expiration
                if (driveErr instanceof Error && driveErr.message === 'TOKEN_EXPIRED') {
                    console.error('[v0] Token expired during sync - triggering re-authentication');
                    localStorage.setItem('google_token_expired', 'true');
                    updateSyncStatus(false, 'error');
                } else {
                    console.error('[v0] Drive sync failed:', driveErr);
                    console.log('[v0] Data is safe in localStorage, will retry later');
                    updateSyncStatus(false, 'offline');
                }
            }
        } catch (err) {
            console.error('[v0] Unexpected error in Drive sync:', err);
            updateSyncStatus(false, 'offline');
        }
    };

    /**
     * Memoized current period calculations
     */
    const currentPeriodData = useMemo(() => {
        const { start, end } = getPeriodDates(currentPeriodIndex, seedDate);

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

    // Transaction management functions
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
            localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
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
