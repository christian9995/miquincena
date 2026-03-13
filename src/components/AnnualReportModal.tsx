'use client';

import { Transaction, Budgets } from '@/types';
import { getPeriodDates, formatCurrency } from '@/lib/finance-utils';
import { useMemo } from 'react';

interface AnnualReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    budgets: Budgets;
    seedDate?: string;
}

export default function AnnualReportModal({ isOpen, onClose, transactions, budgets, seedDate }: AnnualReportModalProps) {
    const reportData = useMemo(() => {
        let totals = { ing: 0, egr: 0, mIng: 0, lEgr: 0, dIng: 0, dEgr: 0 };
        const rows = Array.from({ length: 26 }).map((_, i) => {
            const { start, end } = getPeriodDates(i, seedDate);
            const b = budgets[i] || { income: 0, expense: 0 };
            let qIng = 0, qEgr = 0;

            transactions.forEach(t => {
                const d = new Date(t.date + 'T00:00:00');
                if (d >= start && d <= end) {
                    t.type === 'ingreso' ? qIng += Number(t.amount) : qEgr += Number(t.amount);
                }
            });

            const diffI = b.income - qIng;
            const diffE = b.expense - qEgr;

            totals.ing += qIng;
            totals.egr += qEgr;
            totals.mIng += b.income;
            totals.lEgr += b.expense;
            totals.dIng += diffI;
            totals.dEgr += diffE;

            return {
                label: start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                qIng,
                qEgr,
                metaIng: b.income,
                metaEgr: b.expense,
                diffI,
                diffE
            };
        });

        return { rows, totals, netResult: totals.ing - totals.egr };
    }, [transactions, budgets, seedDate]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-green-700 p-6 text-white text-center flex-shrink-0">
                    <h3 className="text-2xl font-bold">📊 Resumen Anual Quincenal 2026</h3>
                    <p className="text-white/80 text-sm mt-1">Reporte detallado del desempeño financiero</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        <table className="w-full text-sm text-right border-collapse">
                            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border text-left bg-gray-100">Quincena</th>
                                    <th className="p-3 border bg-gray-100">Ing. Real</th>
                                    <th className="p-3 border bg-gray-100">Egr. Real</th>
                                    <th className="p-3 border bg-gray-100 italic opacity-70">Meta Ing.</th>
                                    <th className="p-3 border bg-gray-100 italic opacity-70">Lím. Egr.</th>
                                    <th className="p-3 border bg-gray-100">Dif. Ingreso</th>
                                    <th className="p-3 border bg-gray-100">Dif. Egreso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 border text-left font-medium text-gray-600">{row.label}</td>
                                        <td className="p-3 border font-bold text-green-600">{formatCurrency(row.qIng)}</td>
                                        <td className="p-3 border font-bold text-red-600">{formatCurrency(row.qEgr)}</td>
                                        <td className="p-3 border text-gray-400">{formatCurrency(row.metaIng)}</td>
                                        <td className="p-3 border text-gray-400">{formatCurrency(row.metaEgr)}</td>
                                        <td className={`p-3 border font-black ${row.diffI <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {formatCurrency(row.diffI)}
                                        </td>
                                        <td className={`p-3 border font-black ${row.diffE >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {formatCurrency(row.diffE)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-blue-50 z-10 border-t-2 border-blue-300 shadow-lg">
                                <tr>
                                    <td className="p-3 border text-left font-black text-blue-900">TOTAL ANUAL</td>
                                    <td className="p-3 border font-black text-blue-900">{formatCurrency(reportData.totals.ing)}</td>
                                    <td className="p-3 border font-black text-blue-900">{formatCurrency(reportData.totals.egr)}</td>
                                    <td className="p-3 border font-black text-blue-900 opacity-75">{formatCurrency(reportData.totals.mIng)}</td>
                                    <td className="p-3 border font-black text-blue-900 opacity-75">{formatCurrency(reportData.totals.lEgr)}</td>
                                    <td className="p-3 border font-black text-blue-900">{formatCurrency(reportData.totals.dIng)}</td>
                                    <td className="p-3 border font-black text-blue-900">{formatCurrency(reportData.totals.dEgr)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="px-6 py-4 bg-white border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3 h-full">
                        <div id="annual-balance-box" className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 text-center flex flex-col justify-center items-center">
                            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-tight mb-0.5">Balance real anual</h4>
                            <div className={`net-amount text-base md:text-lg font-black ${reportData.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(reportData.netResult)}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-all text-sm md:text-base"
                        >
                            Cerrar Reporte
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
