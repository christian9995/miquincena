'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, Budgets, TransactionType } from '@/types';
import { getCurrentPeriodIndex, getPeriodDates } from '@/lib/finance-utils';
import { useGoogleAuth } from '@/context/GoogleAuthContext';
import { loadAppStateFromDrive, saveAppStateToDrive } from '@/lib/google-drive';
import { resolveSyncConflict } from '@/lib/sync-manager';

const STORAGE_KEY_TRANSACTIONS = 'finanzas_v2026';
const STORAGE_KEY_BUDGETS = 'presupuestos_v2026';
const STORAGE_KEY_SEED_DATE = 'fecha_semilla_2026';
const STORAGE_KEY_TIMESTAMP = 'app_state_timestamp';
const SYNC_DEBOUNCE_MS = 3000;

// Safe storage helpers for SSR
const getFromStorage = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const setToStorage = (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, value);
    } catch {
        // Silently fail if storage is unavailable
    }
};

export const useFinance = () => {
    const { isAuthenticated, accessToken, isOnline, updateSyncStatus } = useGoogleAuth();
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budgets>({});
    const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
    const [seedDate, setSeedDate] = useState('2026-01-02');
    const [isInitialized, setIsInitialized] = useState(false);
    
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize app on mount
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Load from localStorage first (Offline-First)
                loadFromLocalStorage();
                
                // Try to sync with Drive if authenticated and online
                if (isAuthenticated && accessToken && isOnline) {
                    await syncWithDriveOnInit();
                }
            } catch (err) {
                console.error('[v0] Error initializing app:', err);
                loadFromLocalStorage();
            } finally {
                setIsInitialized(true);
            }
        };

        const loadFromLocalStorage = () => {
            const savedTransactions = getFromStorage(STORAGE_KEY_TRANSACTIONS);
            const savedBudgets = getFromStorage(STORAGE_KEY_BUDGETS);
            const savedSeedDate = getFromStorage(STORAGE_KEY_SEED_DATE);

            if (savedTransactions) {
                try {
                    setTransactions(JSON.parse(savedTransactions));
                } catch (e) {
                    console.error('[v0] Error parsing transactions:', e);
                }
            }

            if (savedBudgets) {
                try {
                    setBudgets(JSON.parse(savedBudgets));
                } catch (e) {
                    console.error('[v0] Error parsing budgets:', e);
                }
            }

            if (savedSeedDate) {
                setSeedDate(savedSeedDate);
                const todayPeriodIndex = getCurrentPeriodIndex(new Date(), savedSeedDate);
                setCurrentPeriodIndex(todayPeriodIndex);
            } else {
                const todayPeriodIndex = getCurrentPeriodIndex(new Date(), '2026-01-02');
                setCurrentPeriodIndex(todayPeriodIndex);
            }
        };

        const syncWithDriveOnInit = async () => {
            try {
                console.log('[v0] Attempting to sync with Google Drive');
                
                const driveData = await loadAppStateFromDrive(accessToken!);
                if (!driveData) {
                    console.log('[v0] No Drive data available');
                    updateSyncStatus(false, 'pending');
                    return;
                }

                // Local-First: Compare timestamps
                const localTs = getFromStorage(STORAGE_KEY_TIMESTAMP) 
                    ? parseInt(getFromStorage(STORAGE_KEY_TIMESTAMP)!) 
                    : 0;
                const driveTs = driveData.timestamp || 0;

                if (localTs >= driveTs) {
                    console.log('[v0] Local data is newer - keeping local');
                    updateSyncStatus(false, 'pending');
                } else {
                    console.log('[v0] Drive data is newer - merging');
                    const merged = resolveSyncConflict(
                        { transactions, budgets, seedDate, timestamp: localTs },
                        driveData
                    );
                    setTransactions(merged.transactions);
                    setBudgets(merged.budgets);
                    setSeedDate(merged.seedDate);
                    setToStorage(STORAGE_KEY_TIMESTAMP, merged.timestamp.toString());
                    updateSyncStatus(false, 'synced');
                }

                const todayPeriodIndex = getCurrentPeriodIndex(new Date(), driveData.seedDate || seedDate);
                setCurrentPeriodIndex(todayPeriodIndex);
            } catch (err) {
                if (err instanceof Error) {
                    if (err.message === 'TOKEN_EXPIRED') {
                        console.error('[v0] Token expired during sync');
                        setToStorage('google_token_expired', 'true');
                        updateSyncStatus(false, 'error');
                    } else {
                        console.log('[v0] Drive sync failed:', err.message);
                        updateSyncStatus(false, 'offline');
                    }
                }
            }
        };

        initializeApp();
    }, [isAuthenticated, accessToken, isOnline, updateSyncStatus]);

    // Save to localStorage and queue Drive sync
    useEffect(() => {
        if (!isInitialized) return;

        // ALWAYS save to localStorage with timestamp
        setToStorage(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        setToStorage(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
        setToStorage(STORAGE_KEY_SEED_DATE, seedDate);
        setToStorage(STORAGE_KEY_TIMESTAMP, Date.now().toString());

        // Queue Drive sync if authenticated and online
        if (isAuthenticated && accessToken && isOnline) {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

            syncTimeoutRef.current = setTimeout(async () => {
                try {
                    updateSyncStatus(true);
                    const appState = { transactions, budgets, seedDate, timestamp: Date.now() };
                    await saveAppStateToDrive(accessToken, appState);
                    updateSyncStatus(false, 'synced');
                } catch (err) {
                    if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
                        console.error('[v0] Token expired during save');
                        setToStorage('google_token_expired', 'true');
                        updateSyncStatus(false, 'error');
                    } else {
                        console.log('[v0] Drive save failed, data kept locally');
                        updateSyncStatus(false, 'offline');
                    }
                }
            }, SYNC_DEBOUNCE_MS);
        }

        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [transactions, budgets, seedDate, isAuthenticated, accessToken, isOnline, isInitialized, updateSyncStatus]);

    // Get current period data with computed values
    const currentPeriodData = useMemo(() => {
        if (transactions.length === 0) {
            return {
                transactions: [],
                income: 0,
                expenses: 0,
                net: 0,
                budget: { income: 0, expense: 0 },
                categoryTotals: {},
            };
        }
        
        const dates = getPeriodDates(currentPeriodIndex, seedDate);
        const periodTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= dates.start && tDate <= dates.end;
        });

        // Calculate income and expenses
        let totalIncome = 0;
        let totalExpenses = 0;
        const categories: Record<string, number> = {};

        periodTransactions.forEach(t => {
            if (t.type === 'ingreso') {
                totalIncome += t.amount as number;
            } else {
                totalExpenses += t.amount as number;
                categories[t.category] = (categories[t.category] || 0) + (t.amount as number);
            }
        });

        const periodBudget = budgets[currentPeriodIndex] || { income: 0, expense: 0 };

        return {
            transactions: periodTransactions,
            income: totalIncome,
            expenses: totalExpenses,
            net: totalIncome - totalExpenses,
            budget: periodBudget,
            categoryTotals: categories,
        };
    }, [transactions, currentPeriodIndex, seedDate, budgets]);

    // Transaction management
    const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: Date.now().toString(),
        };
        setTransactions(prev => [...prev, newTransaction]);
    }, []);

    const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
        setTransactions(prev =>
            prev.map(t => (t.id === id ? { ...t, ...updates } : t))
        );
    }, []);

    const deleteTransaction = useCallback((id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    }, []);

    // Budget management
    const updateBudget = useCallback((category: string, amount: number) => {
        setBudgets(prev => ({
            ...prev,
            [category]: amount,
        }));
    }, []);

    // Navigation
    const navigatePeriod = useCallback((direction: 'prev' | 'next') => {
        setCurrentPeriodIndex(prev => {
            if (direction === 'prev' && prev > 0) return prev - 1;
            if (direction === 'next') return prev + 1;
            return prev;
        });
    }, []);

    return {
        // State
        transactions,
        budgets,
        currentPeriodIndex,
        seedDate,
        isInitialized,
        currentPeriodData,
        
        // Actions
        addTransaction,
        updateTransaction,
        deleteTransaction,
        updateBudget,
        navigatePeriod,
        setCurrentPeriodIndex,
        setSeedDate,
        
        // Backwards compatibility
        saveBudget: updateBudget,
        clearAll: () => {
            setTransactions([]);
            setBudgets({});
            setToStorage(STORAGE_KEY_TRANSACTIONS, '[]');
            setToStorage(STORAGE_KEY_BUDGETS, '{}');
        },
    };
};
