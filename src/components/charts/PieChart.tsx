'use client';

/**
 * PieChart Component
 * Displays spending by category
 */

interface PieChartProps {
  categoryTotals: Record<string, number>;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function PieChart({ categoryTotals }: PieChartProps) {
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
