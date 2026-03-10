'use client';

import { useState, useEffect } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { getCurrentPeriodIndex } from '@/lib/finance-utils';
import PeriodSelector from '@/components/PeriodSelector';
import TransactionForm from '@/components/TransactionForm';
import SummaryPanel from '@/components/SummaryPanel';
import TransactionList from '@/components/TransactionList';
import BudgetModal from '@/components/BudgetModal';
import AnnualReportModal from '@/components/AnnualReportModal';
import { Search, Plus, BarChart3, Settings } from 'lucide-react';

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
    seedDate,
    setSeedDate,
  } = useFinance() as any; // Casting for simplicity in this step, ideally use proper types

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Recalculate current period index when seed date changes
  useEffect(() => {
    const newPeriodIndex = getCurrentPeriodIndex(new Date(), seedDate);
    setCurrentPeriodIndex(newPeriodIndex);
  }, [seedDate, setCurrentPeriodIndex]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleFormSubmit = (t: any) => {
    if (isNaN(Number(t.amount))) {
      alert("Por favor ingrese un monto válido");
      return;
    }

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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Mi Quincena</h1>
        <PeriodSelector
          currentIndex={currentPeriodIndex}
          onChange={setCurrentPeriodIndex}
          seedDate={seedDate}
        />

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="btn-budget-action flex-1 p-4 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Plus size={20} /> Definir Presupuesto
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="btn-success-action flex-1 p-4 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <BarChart3 size={20} /> Resumen Anual
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="btn-config-action flex-1 p-4 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Settings size={20} /> Config. Ciclo
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
        seedDate={seedDate}
      />

      <div id="config-modal" className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 ${isConfigModalOpen ? '' : 'hidden'}`}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-600 p-6 text-white text-center flex-shrink-0">
            <h3 className="text-2xl font-bold">⚙️ Configurar Ciclo</h3>
            <p className="text-white/80 text-sm mt-1">Fecha de inicio del ciclo</p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de inicio del ciclo</label>
              <input
                id="base-start-date"
                type="date"
                value={seedDate}
                onChange={(e) => setSeedDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-600"
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex gap-3">
            <button
              onClick={() => setIsConfigModalOpen(false)}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-all"
            >
              Guardar
            </button>
            <button
              onClick={() => setIsConfigModalOpen(false)}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
