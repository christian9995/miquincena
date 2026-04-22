'use client';

import { useState, useRef, useEffect } from 'react';
import { Workspace } from '@/types';
import { ChevronDown, Plus, Settings } from 'lucide-react';

interface WorkspaceSwitcherProps {
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    onSwitch: (workspaceId: string) => void;
    onOpenManager: () => void;
}

export default function WorkspaceSwitcher({
    workspaces,
    activeWorkspace,
    onSwitch,
    onOpenManager,
}: WorkspaceSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (workspaceId: string) => {
        onSwitch(workspaceId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
                <span className="max-w-[120px] truncate">
                    {activeWorkspace?.name || 'Seleccionar'}
                </span>
                <ChevronDown 
                    size={16} 
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {/* Workspace List */}
                    <div className="max-h-48 overflow-y-auto py-1">
                        {workspaces.map((ws) => (
                            <button
                                key={ws.id}
                                onClick={() => handleSelect(ws.id)}
                                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                                    ws.id === activeWorkspace?.id 
                                        ? 'bg-blue-50 text-blue-700 font-medium' 
                                        : 'text-gray-700'
                                }`}
                            >
                                <span 
                                    className={`w-2 h-2 rounded-full ${
                                        ws.id === activeWorkspace?.id ? 'bg-blue-500' : 'bg-gray-300'
                                    }`} 
                                />
                                <span className="truncate flex-1">{ws.name}</span>
                                <span className="text-xs text-gray-400">
                                    {ws.transactions.length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Manage Button */}
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            onOpenManager();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <Settings size={14} />
                        <span>Administrar Espacios</span>
                    </button>
                </div>
            )}
        </div>
    );
}
