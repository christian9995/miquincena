'use client';

import { Transaction, Budgets, AccountType, ACCOUNTS } from '@/types';
import { getPeriodDates, formatCurrency } from '@/lib/finance-utils';
import { useMemo } from 'react';
import { Wallet, PiggyBank, Banknote } from 'lucide-react';

const ACCOUNT_CONFIG: Record<AccountType, { icon: typeof Wallet; color: string; bg: string; border: string }> = {
    'Cheques': { icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    'Ahorros': { icon: PiggyBank, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    'Efectivo': { icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
};

interface AnnualReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    budgets: Budgets;
    seedDate?: string;
}

export default function AnnualReportModal({ isOpen, onClose, transactions, budgets, seedDate }: AnnualReportModalProps) {
    // Calculate account balances
    const accountBalances = useMemo(() => {
        const balances: Record<AccountType, { income: number; expense: number; balance: number }> = {
            'Cheques': { income: 0, expense: 0, balance: 0 },
            'Ahorros': { income: 0, expense: 0, balance: 0 },
            'Efectivo': { income: 0, expense: 0, balance: 0 },
        };

        transactions.forEach((t) => {
            const account = t.account || 'Cheques'; // Default to Cheques for legacy transactions
            const amount = Number(t.amount);
            
            if (t.type === 'ingreso') {
                balances[account].income += amount;
            } else if (t.type === 'egreso') {
                balances[account].expense += amount;
            } else if (t.type === 'transferencia') {
                // Transfers: subtract from source, add to destination
                const sourceAccount = account;
                const destinationAccount = t.accountTo || 'Cheques';
                
                // Subtract from source account (treat as expense for that account)
                balances[sourceAccount].expense += amount;
                // Add to destination account (treat as income for that account)
                balances[destinationAccount].income += amount;
            }
        });

        // Calculate balance for each account
        ACCOUNTS.forEach((acc) => {
            balances[acc].balance = balances[acc].income - balances[acc].expense;
        });

        return balances;
    }, [transactions]);

    const reportData = useMemo(() => {
        let totals = { ing: 0, egr: 0, mIng: 0, lEgr: 0, dIng: 0, dEgr: 0 };
        const rows = Array.from({ length: 26 }).map((_, i) => {
            const { start, end } = getPeriodDates(i, seedDate);
            const b = budgets[i] || { income: 0, expense: 0 };
            let qIng = 0, qEgr = 0;

            transactions.forEach(t => {
                const d = new Date(t.date + 'T00:00:00');
                if (d >= start && d <= end) {
                    // Only count ingreso and egreso for period totals (transfers are neutral)
                    if (t.type === 'ingreso') {
                        qIng += Number(t.amount);
                    } else if (t.type === 'egreso') {
                        qEgr += Number(t.amount);
                    }
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
                <div className="bg-green-700 px-6 py-3 text-white text-center flex-shrink-0">
                    <h3 className="text-lg font-bold">📊 Resumen Anual Quincenal 2026</h3>
                    <p className="text-white/80 text-xs mt-0.5">Reporte detallado del desempeño financiero</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Estado de Cuentas Section */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 text-center">Estado de Cuentas</h4>
                        <div className="grid grid-cols-3 gap-3">
                            {ACCOUNTS.map((acc) => {
                                const config = ACCOUNT_CONFIG[acc];
                                const Icon = config.icon;
                                const data = accountBalances[acc];
                                
                                return (
                                    <div 
                                        key={acc} 
                                        className={`${config.bg} ${config.border} border rounded-xl p-3 text-center`}
                                    >
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <Icon size={16} className={config.color} />
                                            <span className={`text-xs font-semibold ${config.color}`}>{acc}</span>
                                        </div>
                                        <div className={`text-lg font-black ${data.balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                                            {formatCurrency(data.balance)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">
                                            <span className="text-green-600">+{formatCurrency(data.income)}</span>
                                            {' / '}
                                            <span className="text-red-600">-{formatCurrency(data.expense)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-3">
                        <table className="w-full text-xs text-right border-collapse">
                            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                                <tr>
                                    <th className="p-1 border text-left bg-gray-100 text-xs">Quincena</th>
                                    <th className="p-1 border bg-gray-100 text-xs">Ing. Real</th>
                                    <th className="p-1 border bg-gray-100 text-xs">Egr. Real</th>
                                    <th className="p-1 border bg-gray-100 italic opacity-70 text-xs">Meta Ing.</th>
                                    <th className="p-1 border bg-gray-100 italic opacity-70 text-xs">Lím. Egr.</th>
                                    <th className="p-1 border bg-gray-100 text-xs">Dif. Ing.</th>
                                    <th className="p-1 border bg-gray-100 text-xs">Dif. Egr.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-1 border text-left font-medium text-gray-600 text-xs">{row.label}</td>
                                        <td className="p-1 border font-bold text-green-600 text-xs">{formatCurrency(row.qIng)}</td>
                                        <td className="p-1 border font-bold text-red-600 text-xs">{formatCurrency(row.qEgr)}</td>
                                        <td className="p-1 border text-gray-400 text-xs">{formatCurrency(row.metaIng)}</td>
                                        <td className="p-1 border text-gray-400 text-xs">{formatCurrency(row.metaEgr)}</td>
                                        <td className={`p-1 border font-black text-xs ${row.diffI <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {formatCurrency(row.diffI)}
                                        </td>
                                        <td className={`p-1 border font-black text-xs ${row.diffE >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {formatCurrency(row.diffE)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-blue-50 z-10 border-t-2 border-blue-300 shadow-lg">
                                <tr>
                                    <td className="p-1 border text-left font-black text-blue-900 text-xs">TOTAL ANUAL</td>
                                    <td className="p-1 border font-black text-blue-900 text-xs">{formatCurrency(reportData.totals.ing)}</td>
                                    <td className="p-1 border font-black text-blue-900 text-xs">{formatCurrency(reportData.totals.egr)}</td>
                                    <td className="p-1 border font-black text-blue-900 opacity-75 text-xs">{formatCurrency(reportData.totals.mIng)}</td>
                                    <td className="p-1 border font-black text-blue-900 opacity-75 text-xs">{formatCurrency(reportData.totals.lEgr)}</td>
                                    <td className="p-1 border font-black text-blue-900 text-xs">{formatCurrency(reportData.totals.dIng)}</td>
                                    <td className="p-1 border font-black text-blue-900 text-xs">{formatCurrency(reportData.totals.dEgr)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="px-4 py-2 bg-white border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 h-full">
                        <div id="annual-balance-box" className="bg-blue-50 px-3 py-1.5 rounded border border-blue-200 text-center flex flex-col justify-center items-center">
                            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-tight mb-0.5">Balance real anual</h4>
                            <div className={`net-amount text-sm md:text-base font-black leading-tight ${reportData.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(reportData.netResult)}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 bg-gray-800 text-white rounded font-semibold hover:bg-gray-900 transition-all text-xs md:text-sm"
                        >
                            Cerrar Reporte
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
