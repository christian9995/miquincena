// v1.0.2 - Components inlined to bypass module resolution issue
'use client';

/**
 * Format currency for MXN
 */
function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * BarChart Component - Inlined
 */
function BarChart({ 
  realIncome, 
  realExpense, 
  metaIncome, 
  metaExpense 
}: { realIncome: number; realExpense: number; metaIncome: number; metaExpense: number }) {
  const incomePercent = metaIncome > 0 ? (realIncome / metaIncome) * 100 : 0;
  const expensePercent = metaExpense > 0 ? (realExpense / metaExpense) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Ingresos</label>
          <span className="text-sm text-gray-600">{Math.round(incomePercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(incomePercent, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          ${realIncome.toFixed(2)} de ${metaIncome.toFixed(2)}
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Gastos</label>
          <span className="text-sm text-gray-600">{Math.round(expensePercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-red-500 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(expensePercent, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          ${realExpense.toFixed(2)} de ${metaExpense.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

/**
 * PieChart Component - Inlined
 */
function PieChart({ categoryTotals }: { categoryTotals: Record<string, number> }) {
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const categories = Object.entries(categoryTotals).filter(([_, amount]) => amount > 0);
  
  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay datos de gastos por categoría</p>
      </div>
    );
  }

  const total = categories.reduce((sum, [_, amount]) => sum + amount, 0);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Gastos por Categoría</h3>
      <div className="space-y-2">
        {categories.map(([category, amount], index) => {
          const percentage = total > 0 ? (amount / total) * 100 : 0;
          const color = COLORS[index % COLORS.length];

          return (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-700">{category}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t pt-3 mt-3">
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-800">Total Gastos</span>
          <span className="text-sm font-bold text-gray-900">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

interface SummaryPanelProps {
    income: number;
    expenses: number;
    net: number;
    budget?: { income: number; expense: number };
    categoryTotals: Record<string, number>;
    onClearAll: () => void;
}

export default function SummaryPanel({
    income,
    expenses,
    net,
    budget,
    categoryTotals,
    onClearAll
}: SummaryPanelProps) {
    return (
        <aside className="w-full lg:w-96 space-y-6 lg:sticky lg:top-6">
            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Balance de la Quincena</h3>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Ingresos Reales:</span>
                        <span className="font-bold text-green-600">{formatCurrency(income)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Egresos Reales:</span>
                        <span className="font-bold text-red-600">{formatCurrency(expenses)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-gray-100">
                        <span className="text-md font-bold text-gray-800">Neto:</span>
                        <span className={`text-xl font-black ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(net)}
                        </span>
                    </div>
                </div>

                <div className="py-4 space-y-8">
                    <BarChart
                        realIncome={income}
                        realExpense={expenses}
                        metaIncome={budget?.income ?? 0}
                        metaExpense={budget?.expense ?? 0}
                    />
                    <PieChart categoryTotals={categoryTotals} />
                </div>

                <button
                    onClick={onClearAll}
                    className="w-full py-3 bg-white border border-red-500 text-red-500 rounded-lg font-bold hover:bg-red-50 text-sm transition-colors"
                >
                    Borrar Todo el Historial
                </button>
            </div>
        </aside>
    );
}
