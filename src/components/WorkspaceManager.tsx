'use client';

import { useState } from 'react';
import { Workspace } from '@/types';
import { X, Plus, Pencil, Trash2, Check, FolderOpen } from 'lucide-react';

interface WorkspaceManagerProps {
    isOpen: boolean;
    onClose: () => void;
    workspaces: Workspace[];
    activeWorkspaceId: string | undefined;
    onCreate: (name: string) => string;
    onRename: (workspaceId: string, newName: string) => void;
    onDelete: (workspaceId: string) => boolean;
    onSwitch: (workspaceId: string) => void;
}

export default function WorkspaceManager({
    isOpen,
    onClose,
    workspaces,
    activeWorkspaceId,
    onCreate,
    onRename,
    onDelete,
    onSwitch,
}: WorkspaceManagerProps) {
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCreate = () => {
        const trimmedName = newWorkspaceName.trim();
        if (!trimmedName) {
            setError('El nombre no puede estar vacio.');
            return;
        }
        if (workspaces.some(ws => ws.name.toLowerCase() === trimmedName.toLowerCase())) {
            setError('Ya existe un espacio con ese nombre.');
            return;
        }
        
        const newId = onCreate(trimmedName);
        setNewWorkspaceName('');
        setError(null);
        onSwitch(newId); // Switch to the new workspace
    };

    const handleStartEdit = (ws: Workspace) => {
        setEditingId(ws.id);
        setEditingName(ws.name);
        setError(null);
    };

    const handleSaveEdit = () => {
        if (!editingId) return;
        
        const trimmedName = editingName.trim();
        if (!trimmedName) {
            setError('El nombre no puede estar vacio.');
            return;
        }
        if (workspaces.some(ws => ws.id !== editingId && ws.name.toLowerCase() === trimmedName.toLowerCase())) {
            setError('Ya existe un espacio con ese nombre.');
            return;
        }

        onRename(editingId, trimmedName);
        setEditingId(null);
        setEditingName('');
        setError(null);
    };

    const handleDelete = (workspaceId: string) => {
        if (workspaces.length <= 1) {
            setError('No puedes eliminar el ultimo espacio.');
            return;
        }
        
        const ws = workspaces.find(w => w.id === workspaceId);
        if (confirm(`¿Eliminar "${ws?.name}"? Esto borrara todas sus transacciones.`)) {
            const success = onDelete(workspaceId);
            if (!success) {
                setError('No se pudo eliminar el espacio.');
            }
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FolderOpen size={20} className="text-blue-600" />
                        <h2 className="text-lg font-bold text-gray-800">Espacios de Trabajo</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Create New Workspace */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="Nombre del nuevo espacio..."
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm font-medium"
                        >
                            <Plus size={16} />
                            Crear
                        </button>
                    </div>
                    {error && (
                        <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                </div>

                {/* Workspace List */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    {workspaces.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No hay espacios de trabajo.</p>
                    ) : (
                        <div className="space-y-2">
                            {workspaces.map((ws) => (
                                <div
                                    key={ws.id}
                                    className={`p-3 rounded-xl border transition-colors ${
                                        ws.id === activeWorkspaceId 
                                            ? 'border-blue-200 bg-blue-50' 
                                            : 'border-gray-100 bg-white hover:bg-gray-50'
                                    }`}
                                >
                                    {editingId === ws.id ? (
                                        /* Edit Mode */
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                autoFocus
                                                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <button
                                                onClick={handleSaveEdit}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(null); setError(null); }}
                                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div className="flex items-center justify-between">
                                            <div 
                                                className="flex-1 cursor-pointer"
                                                onClick={() => onSwitch(ws.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span 
                                                        className={`w-2 h-2 rounded-full ${
                                                            ws.id === activeWorkspaceId ? 'bg-blue-500' : 'bg-gray-300'
                                                        }`} 
                                                    />
                                                    <span className="font-medium text-gray-800">{ws.name}</span>
                                                    {ws.id === activeWorkspaceId && (
                                                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                                            Activo
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500 ml-4">
                                                    {ws.transactions.length} transacciones • Creado {formatDate(ws.createdAt)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleStartEdit(ws)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ws.id)}
                                                    disabled={workspaces.length <= 1}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        workspaces.length <= 1 
                                                            ? 'text-gray-200 cursor-not-allowed' 
                                                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
