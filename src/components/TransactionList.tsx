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
                        className={`flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-8 transition-transform hover:scale-[1.01] ${t.type === 'ingreso' ? 'border-green-500' : 'border-red-500'
                            }`}
                    >
                        <div className="flex-1">
                            <div className="font-bold text-gray-800">{t.desc}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                                    {t.date}
                                </span>
                                {t.type === 'egreso' && (
                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Tag size={10} /> {t.category}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                {t.type === 'transferencia' ? (
                                    <>
                                        <div className={`text-sm font-bold ${TRANSFER_COLOR}`}>
                                            Transferencia: {t.account} ➔ {t.accountTo || 'N/A'}
                                        </div>
                                        <span className={`text-lg font-black text-gray-600 block mt-1`}>
                                            {formatCurrency(Number(t.amount))}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className={`text-lg font-black ${t.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'ingreso' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                                        </span>
                                        {t.account && (
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 ${ACCOUNT_COLORS[t.account] || 'text-gray-600 bg-gray-50'}`}>
                                                <Wallet size={10} /> {t.account}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => onEdit((t as any).originalIndex)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => onDelete((t as any).originalIndex)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
