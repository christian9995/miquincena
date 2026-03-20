'use client';

import { useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Balances } from '@/types';
import { X, Edit2, Check, DollarSign, PiggyBank, Wallet, ArrowRightLeft } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

type AccountKey = 'cheques' | 'ahorros' | 'efectivo';

const ACCOUNT_NAMES: Record<AccountKey, string> = {
    cheques: 'Cuenta de Cheques',
    ahorros: 'Cuenta de Ahorros',
    efectivo: 'Efectivo',
};

interface BalanceRealModalProps {
    isOpen: boolean;
    onClose: () => void;
    balances: Balances;
    onUpdateBalances: (newBalances: Partial<Balances>) => void;
}

export default function BalanceRealModal({ isOpen, onClose, balances, onUpdateBalances }: BalanceRealModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        cheques: balances.cheques,
        ahorros: balances.ahorros,
        efectivo: balances.efectivo,
    });

    // Transfer state
    const [fromAccount, setFromAccount] = useState<AccountKey>('cheques');
    const [toAccount, setToAccount] = useState<AccountKey>('ahorros');
    const [transferAmount, setTransferAmount] = useState<number>(0);
    const [transferError, setTransferError] = useState<string | null>(null);
    const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

    if (!isOpen) return null;

    const total = balances.cheques + balances.ahorros + balances.efectivo;

    const chartData = {
        labels: [
            `Cuenta de Cheques ($${balances.cheques.toLocaleString()})`,
            `Cuenta de Ahorros ($${balances.ahorros.toLocaleString()})`,
            `Efectivo ($${balances.efectivo.toLocaleString()})`,
        ],
        datasets: [
            {
                data: [balances.cheques, balances.ahorros, balances.efectivo],
                backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b'],
                borderColor: ['#2563eb', '#16a34a', '#d97706'],
                borderWidth: 2,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    padding: 16,
                    usePointStyle: true,
                    font: { size: 12 },
                },
            },
        },
        cutout: '55%',
    };

    const handleSave = () => {
        onUpdateBalances({
            cheques: Number(editValues.cheques) || 0,
            ahorros: Number(editValues.ahorros) || 0,
            efectivo: Number(editValues.efectivo) || 0,
        });
        setIsEditing(false);
    };

    const handleStartEdit = () => {
        setEditValues({
            cheques: balances.cheques,
            ahorros: balances.ahorros,
            efectivo: balances.efectivo,
        });
        setIsEditing(true);
    };

    const handleTransfer = () => {
        setTransferError(null);
        setTransferSuccess(null);

        // Validations
        if (fromAccount === toAccount) {
            setTransferError('Las cuentas de origen y destino deben ser diferentes.');
            return;
        }

        if (transferAmount <= 0) {
            setTransferError('El monto debe ser mayor a cero.');
            return;
        }

        if (transferAmount > balances[fromAccount]) {
            setTransferError(`Saldo insuficiente en ${ACCOUNT_NAMES[fromAccount]}.`);
            return;
        }

        // Execute transfer - subtract from source, add to destination
        const newBalances = {
            cheques: balances.cheques,
            ahorros: balances.ahorros,
            efectivo: balances.efectivo,
        };

        newBalances[fromAccount] -= transferAmount;
        newBalances[toAccount] += transferAmount;

        onUpdateBalances(newBalances);

        // Show success message
        setTransferSuccess('Transferencia Exitosa');

        // Reset form
        setTransferAmount(0);

        // Close modal after 1.5 seconds
        setTimeout(() => {
            setTransferSuccess(null);
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
                    <h3 className="text-lg font-bold">Distribucion Real Anual de Activos</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Total Banner */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl p-4 text-center">
                        <p className="text-sm opacity-90">Balance Total</p>
                        <p className="text-3xl font-bold">${total.toLocaleString()}</p>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        {total > 0 ? (
                            <div className="h-64">
                                <Doughnut data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400 italic">
                                Sin saldo registrado
                            </div>
                        )}
                    </div>

                    {/* Summary Table */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-700">Detalle de Cuentas</h4>
                            {!isEditing ? (
                                <button
                                    onClick={handleStartEdit}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    <Edit2 size={14} /> Editar
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 transition-colors"
                                >
                                    <Check size={14} /> Guardar
                                </button>
                            )}
                        </div>

                        <div className="divide-y divide-gray-100">
                            {/* Cheques */}
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <DollarSign size={16} className="text-blue-600" />
                                    </div>
                                    <span className="font-medium text-gray-700">Cuenta de Cheques</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editValues.cheques}
                                        onChange={(e) => setEditValues({ ...editValues, cheques: Number(e.target.value) })}
                                        className="w-28 text-right px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                ) : (
                                    <span className="font-semibold text-blue-600">${balances.cheques.toLocaleString()}</span>
                                )}
                            </div>

                            {/* Ahorros */}
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <PiggyBank size={16} className="text-green-600" />
                                    </div>
                                    <span className="font-medium text-gray-700">Cuenta de Ahorros</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editValues.ahorros}
                                        onChange={(e) => setEditValues({ ...editValues, ahorros: Number(e.target.value) })}
                                        className="w-28 text-right px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                ) : (
                                    <span className="font-semibold text-green-600">${balances.ahorros.toLocaleString()}</span>
                                )}
                            </div>

                            {/* Efectivo */}
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                        <Wallet size={16} className="text-amber-600" />
                                    </div>
                                    <span className="font-medium text-gray-700">Efectivo</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editValues.efectivo}
                                        onChange={(e) => setEditValues({ ...editValues, efectivo: Number(e.target.value) })}
                                        className="w-28 text-right px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                ) : (
                                    <span className="font-semibold text-amber-600">${balances.efectivo.toLocaleString()}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Transfer Section */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <ArrowRightLeft size={18} className="text-gray-600" />
                            <h4 className="font-semibold text-gray-700">Transferir entre Cuentas</h4>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* From Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">De Cuenta</label>
                                <select
                                    value={fromAccount}
                                    onChange={(e) => setFromAccount(e.target.value as AccountKey)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="cheques">Cuenta de Cheques (${balances.cheques.toLocaleString()})</option>
                                    <option value="ahorros">Cuenta de Ahorros (${balances.ahorros.toLocaleString()})</option>
                                    <option value="efectivo">Efectivo (${balances.efectivo.toLocaleString()})</option>
                                </select>
                            </div>

                            {/* To Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">A Cuenta</label>
                                <select
                                    value={toAccount}
                                    onChange={(e) => setToAccount(e.target.value as AccountKey)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="cheques">Cuenta de Cheques (${balances.cheques.toLocaleString()})</option>
                                    <option value="ahorros">Cuenta de Ahorros (${balances.ahorros.toLocaleString()})</option>
                                    <option value="efectivo">Efectivo (${balances.efectivo.toLocaleString()})</option>
                                </select>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Monto $</label>
                                <input
                                    type="number"
                                    value={transferAmount || ''}
                                    onChange={(e) => setTransferAmount(Number(e.target.value))}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            {/* Error Message */}
                            {transferError && (
                                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {transferError}
                                </div>
                            )}

                            {/* Success Message */}
                            {transferSuccess && (
                                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                                    {transferSuccess}
                                </div>
                            )}

                            {/* Transfer Button */}
                            <button
                                onClick={handleTransfer}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowRightLeft size={18} />
                                Ejecutar Transferencia
                            </button>
                        </div>
                    </div>

                    {/* Last Updated */}
                    {balances.updatedAt && (
                        <p className="text-xs text-gray-400 text-center">
                            Ultima actualizacion: {new Date(balances.updatedAt).toLocaleString('es-ES')}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
