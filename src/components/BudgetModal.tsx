'use client';

import { useState, useEffect } from 'react';

interface BudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (budget: { income: number; expense: number }) => void;
    currentBudget: { income: number; expense: number };
}

export default function BudgetModal({ isOpen, onClose, onSave, currentBudget }: BudgetModalProps) {
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);

    useEffect(() => {
        setIncome(currentBudget.income);
        setExpense(currentBudget.expense);
    }, [currentBudget, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-purple-600 p-6 text-white text-center">
                    <h3 className="text-2xl font-bold">🎯 Metas del Periodo</h3>
                    <p className="text-white/80 text-sm mt-1">Define tus objetivos financieros para esta quincena</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block">Meta de Ingresos ($):</label>
                        <input
                            type="number"
                            step="0.01"
                            value={income}
                            onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                            className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block">Límite de Egresos ($):</label>
                        <input
                            type="number"
                            step="0.01"
                            value={expense}
                            onChange={(e) => setExpense(parseFloat(e.target.value) || 0)}
                            className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-lg"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => onSave({ income, expense })}
                            className="flex-1 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all"
                        >
                            Guardar Metas
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
