'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction, Budgets, TransactionType } from '@/types';
import { getCurrentPeriodIndex, getPeriodDates } from '@/lib/finance-utils';

const STORAGE_KEY_TRANSACTIONS = 'finanzas_v2026';
const STORAGE_KEY_BUDGETS = 'presupuestos_v2026';

export function useFinance() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budgets>({});
    const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load data from localStorage on mount
    useEffect(() => {
        const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        const savedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);

        if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
        if (savedBudgets) setBudgets(JSON.parse(savedBudgets));

        setCurrentPeriodIndex(getCurrentPeriodIndex());
        setIsInitialized(true);
    }, []);

    // Save data whenever it changes
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
            localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
        }
    }, [transactions, budgets, isInitialized]);

    const currentPeriodData = useMemo(() => {
        const { start, end } = getPeriodDates(currentPeriodIndex);
        const filtered = transactions.filter((t) => {
            const tDate = new Date(t.date + 'T00:00:00');
            return tDate >= start && tDate <= end;
        });

        const income = filtered
            .filter((t) => t.type === 'ingreso')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = filtered
            .filter((t) => t.type === 'egreso')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const categoryTotals: Record<string, number> = {};
        filtered.forEach((t) => {
            if (t.type === 'egreso') {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
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
    }, [transactions, budgets, currentPeriodIndex]);

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
    };
}
