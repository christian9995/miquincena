'use client';

import { formatCurrency } from '@/lib/finance-utils';
import BarChart from './Charts/BarChart';
import PieChart from './Charts/PieChart';

interface SummaryPanelProps {
    income: number;
    expenses: number;
    net: number;
    budget: { income: number; expense: number };
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
        <aside className="w-full lg:w-96 space-y-6 sticky top-6">
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
                        metaIncome={budget.income}
                        metaExpense={budget.expense}
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
