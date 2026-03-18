'use client';

/**
 * BarChart Component
 * Displays budget vs actual spending comparison
 */

interface BarChartProps {
  realIncome: number;
  realExpense: number;
  metaIncome: number;
  metaExpense: number;
}

export function BarChart({ realIncome, realExpense, metaIncome, metaExpense }: BarChartProps) {
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
