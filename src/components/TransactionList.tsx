'use client';

import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/finance-utils';
import { Pencil, Trash2, Tag, Wallet } from 'lucide-react';

const ACCOUNT_COLORS: Record<string, string> = {
    'Cheques': 'text-blue-600 bg-blue-50',
    'Ahorros': 'text-green-600 bg-green-50',
    'Efectivo': 'text-amber-600 bg-amber-50',
};

const TRANSFER_COLOR = 'text-gray-600 bg-gray-50';

interface TransactionListProps {
    transactions: Transaction[];
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
    searchTerm: string;
}

export default function TransactionList({ transactions, onEdit, onDelete, searchTerm }: TransactionListProps) {
    const filtered = transactions.filter(t =>
        t.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-3">
            {filtered.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                    No hay movimientos encontrados
                </div>
            ) : (
                filtered.map((t, i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-3 px-3 py-3 md:px-4 md:py-4 bg-white rounded-xl shadow-sm border-l-8 transition-transform hover:scale-[1.01] ${
                            t.type === 'ingreso' ? 'border-green-500' :
                            t.type === 'transferencia' ? 'border-gray-400' :
                            'border-red-500'
                        }`}
                    >
                        {/* Left: description + meta */}
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 truncate pr-1">{t.desc}</div>

                            {/* Meta badges row — wraps on small screens */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {t.date}
                                </span>
                                {t.type === 'egreso' && (
                                    <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Tag size={9} /> {t.category}
                                    </span>
                                )}
                                {t.type === 'transferencia' && (
                                    <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {t.account} &#8594; {t.accountTo || 'N/A'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: amount + account badge + action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                            {/* Amount + badge stacked */}
                            <div className="text-right mr-1">
                                {t.type === 'transferencia' ? (
                                    <span className="text-base font-black text-gray-600 whitespace-nowrap">
                                        {formatCurrency(Number(t.amount))}
                                    </span>
                                ) : (
                                    <>
                                        <div className={`text-base font-black whitespace-nowrap ${t.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'ingreso' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                                        </div>
                                        {t.account && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-0.5 ${ACCOUNT_COLORS[t.account] || 'text-gray-600 bg-gray-50'}`}>
                                                <Wallet size={9} /> {t.account}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Action buttons */}
                            <button
                                onClick={() => onEdit((t as any).originalIndex)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                            >
                                <Pencil size={15} />
                            </button>
                            <button
                                onClick={() => onDelete((t as any).originalIndex)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
