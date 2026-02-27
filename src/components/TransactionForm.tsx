'use client';

import { useState, useEffect } from 'react';
import { Transaction, TransactionType, CATEGORIES } from '@/types';

interface TransactionFormProps {
    onSubmit: (t: Transaction) => void;
    editingTransaction?: Transaction | null;
    onCancelEdit?: () => void;
}

export default function TransactionForm({ onSubmit, editingTransaction, onCancelEdit }: TransactionFormProps) {
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<TransactionType>('ingreso');
    const [category, setCategory] = useState(CATEGORIES[0]);

    useEffect(() => {
        if (editingTransaction) {
            setDesc(editingTransaction.desc);
            setAmount(editingTransaction.amount.toString());
            setDate(editingTransaction.date);
            setType(editingTransaction.type);
            setCategory(editingTransaction.category as any);
        } else {
            reset();
        }
    }, [editingTransaction]);

    const reset = () => {
        setDesc('');
        setAmount('');
        // Keep date as is or reset to today
        setType('ingreso');
        setCategory(CATEGORIES[0]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            desc,
            amount: parseFloat(amount),
            date,
            type,
            category: type === 'egreso' ? category : 'INGRESO',
        });
        if (!editingTransaction) reset();
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="Descripción"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="number"
                    placeholder="Monto $"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                </select>
            </div>

            {type === 'egreso' && (
                <div>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    type="submit"
                    className={`flex-1 p-3 rounded-lg font-bold text-white transition-all ${editingTransaction ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {editingTransaction ? 'Actualizar Movimiento' : 'Registrar Movimiento'}
                </button>
                {editingTransaction && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300"
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
}
