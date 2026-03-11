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

                <div className="flex-1 overflow-auto p-6">
                    <table className="w-full text-sm text-right border-collapse">
                        <thead className="sticky top-0 bg-gray-50 z-10">
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
                    </table>
                    <div id="annual-balance-box" className={`final-balance-card p-6 rounded-lg mt-6 shadow-md ${reportData.netResult >= 0 ? 'balance-positive bg-green-50' : 'balance-negative bg-red-50'}`}>
                        <div className={`grid grid-cols-7 gap-2 text-center font-black ${reportData.netResult >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                            <div className="text-left col-span-1">TOTAL ANUAL</div>
                            <div>{formatCurrency(reportData.totals.ing)}</div>
                            <div>{formatCurrency(reportData.totals.egr)}</div>
                            <div className="opacity-50">{formatCurrency(reportData.totals.mIng)}</div>
                            <div className="opacity-50">{formatCurrency(reportData.totals.lEgr)}</div>
                            <div>{formatCurrency(reportData.totals.dIng)}</div>
                            <div>{formatCurrency(reportData.totals.dEgr)}</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 bg-gray-50 border-t flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                    <div className="bg-white px-4 md:px-6 py-6 rounded-2xl border-2 border-blue-600 shadow-xl shadow-blue-100 text-center w-full md:w-auto md:min-w-[250px]">
                        <h4 className="text-xs md:text-sm font-bold text-blue-600 uppercase tracking-widest mb-2 md:mb-1">Annual Net Real Balance</h4>
                        <div className={`net-amount ${reportData.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(reportData.netResult)}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full md:w-auto px-8 md:px-12 py-3 md:py-4 bg-gray-800 text-white text-sm md:text-base rounded-xl font-bold hover:bg-gray-900 transition-all shadow-lg"
                    >
                        Cerrar Reporte
                    </button>
                </div>
            </div>
        </div>
    );
}
