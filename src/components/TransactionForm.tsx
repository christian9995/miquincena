'use client';

import { useState, useEffect } from 'react';
import { Transaction, TransactionType, AccountType, CATEGORIES, ACCOUNTS } from '@/types';

interface TransactionFormProps {
    onSubmit: (t: Transaction) => void;
    editingTransaction?: Transaction | null;
    onCancelEdit?: () => void;
}

export default function TransactionForm({ onSubmit, editingTransaction, onCancelEdit }: TransactionFormProps) {
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [type, setType] = useState<TransactionType>('ingreso');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [account, setAccount] = useState<AccountType>('Cheques');
    const [toAccount, setToAccount] = useState<AccountType>('Ahorros');

    useEffect(() => {
        if (editingTransaction) {
            setDesc(editingTransaction.desc);
            setAmount(editingTransaction.amount.toString());
            setDate(editingTransaction.date);
            setType(editingTransaction.type);
            setCategory(editingTransaction.category as any);
            setAccount(editingTransaction.account || 'Cheques');
            setToAccount(editingTransaction.toAccount || 'Ahorros');
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
        setAccount('Cheques');
        setToAccount('Ahorros');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate transfer: origin and destination must be different
        if (type === 'transferencia' && account === toAccount) {
            alert('La cuenta de origen y destino deben ser diferentes.');
            return;
        }
        
        onSubmit({
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique transaction ID
            desc: type === 'transferencia' ? (desc || `Transferencia ${account} a ${toAccount}`) : desc,
            amount: parseFloat(amount),
            date,
            type,
            category: type === 'egreso' ? category : (type === 'transferencia' ? 'TRANSFERENCIA' : 'INGRESO'),
            account,
            toAccount: type === 'transferencia' ? toAccount : undefined,
            updatedAt: new Date().toISOString(),
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

            <div className={`grid grid-cols-1 gap-4 ${type === 'transferencia' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
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
                    <option value="transferencia">Transferencia</option>
                </select>
                {type === 'transferencia' ? (
                    <>
                        <select
                            value={account}
                            onChange={(e) => setAccount(e.target.value as AccountType)}
                            className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {ACCOUNTS.map((acc) => (
                                <option key={acc} value={acc}>De: {acc}</option>
                            ))}
                        </select>
                        <select
                            value={toAccount}
                            onChange={(e) => setToAccount(e.target.value as AccountType)}
                            className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {ACCOUNTS.map((acc) => (
                                <option key={acc} value={acc}>A: {acc}</option>
                            ))}
                        </select>
                    </>
                ) : (
                    <select
                        value={account}
                        onChange={(e) => setAccount(e.target.value as AccountType)}
                        className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {ACCOUNTS.map((acc) => (
                            <option key={acc} value={acc}>{acc}</option>
                        ))}
                    </select>
                )}
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

            <div className="form-btns flex gap-2">
                <button
                    type="submit"
                    className={`flex-1 p-3 rounded-lg font-bold text-white transition-all ${editingTransaction ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {editingTransaction ? 'Update Movement' : 'Registrar Movimiento'}
                </button>
                <button
                    id="cancel-edit-btn"
                    type="button"
                    onClick={onCancelEdit}
                    className={`px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 ${!editingTransaction ? 'hidden' : ''}`}
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}
