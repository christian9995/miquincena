'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction, Budgets, TransactionType } from '@/types';
import { getCurrentPeriodIndex, getPeriodDates } from '@/lib/finance-utils';

const STORAGE_KEY_TRANSACTIONS = 'finanzas_v2026';
const STORAGE_KEY_BUDGETS = 'presupuestos_v2026';
const STORAGE_KEY_SEED_DATE = 'fecha_semilla_2026';

export function useFinance() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budgets>({});
    const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const [seedDate, setSeedDate] = useState('2026-01-02');

    // Load data from localStorage on mount
    useEffect(() => {
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
            setCurrentPeriodIndex(getCurrentPeriodIndex(new Date(), savedSeedDate));
        } else {
            setCurrentPeriodIndex(getCurrentPeriodIndex());
        }

        setIsInitialized(true);
    }, []);

    // Save data whenever it changes
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
            localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
            localStorage.setItem(STORAGE_KEY_SEED_DATE, seedDate);
        }
    }, [transactions, budgets, seedDate, isInitialized]);

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
