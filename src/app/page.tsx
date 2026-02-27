'use client';

import { useState } from 'react';
import { useFinance } from '@/hooks/useFinance';
import PeriodSelector from '@/components/PeriodSelector';
import TransactionForm from '@/components/TransactionForm';
import SummaryPanel from '@/components/SummaryPanel';
import TransactionList from '@/components/TransactionList';
import BudgetModal from '@/components/BudgetModal';
import AnnualReportModal from '@/components/AnnualReportModal';
import { Search, Plus, BarChart3 } from 'lucide-react';

export default function Home() {
  const {
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
  } = useFinance() as any; // Casting for simplicity in this step, ideally use proper types

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleFormSubmit = (t: any) => {
    if (editingIndex !== null) {
      updateTransaction(editingIndex, t);
      setEditingIndex(null);
    } else {
      addTransaction(t);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f9fc] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <PeriodSelector
          currentIndex={currentPeriodIndex}
          onChange={setCurrentPeriodIndex}
        />

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-100 transition-all active:scale-95"
              >
                <Plus size={20} /> Definir Presupuesto
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95"
              >
                <BarChart3 size={20} /> Resumen Anual
              </button>
            </div>

            <TransactionForm
              onSubmit={handleFormSubmit}
              editingTransaction={editingIndex !== null ? transactions[editingIndex] : null}
              onCancelEdit={() => setEditingIndex(null)}
            />

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar movimientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-gray-700 bg-transparent"
              />
            </div>

            <TransactionList
              transactions={currentPeriodData.transactions}
              onEdit={(idx) => setEditingIndex(idx)}
              onDelete={deleteTransaction}
              searchTerm={searchTerm}
            />
          </div>

          <SummaryPanel
            income={currentPeriodData.income}
            expenses={currentPeriodData.expenses}
            net={currentPeriodData.net}
            budget={currentPeriodData.budget}
            categoryTotals={currentPeriodData.categoryTotals}
            onClearAll={clearAll}
          />
        </div>
      </div>

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSave={(b) => {
          saveBudget(currentPeriodIndex, b);
          setIsBudgetModalOpen(false);
        }}
        currentBudget={currentPeriodData.budget}
      />

      <AnnualReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={transactions}
        budgets={budgets}
      />
    </main>
  );
}
