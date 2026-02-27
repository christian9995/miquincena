'use client';

import { getPeriodDates, formatDateShort } from '@/lib/finance-utils';

interface PeriodSelectorProps {
    currentIndex: number;
    onChange: (index: number) => void;
}

export default function PeriodSelector({ currentIndex, onChange }: PeriodSelectorProps) {
    const { start, end } = getPeriodDates(currentIndex);
    const today = new Date();

    return (
        <header className="bg-blue-600 text-white flex justify-between items-center p-4 rounded-xl mb-6 shadow-md">
            <button
                onClick={() => onChange(Math.max(0, currentIndex - 1))}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                disabled={currentIndex === 0}
            >
                ◀ Ant.
            </button>

            <div className="text-center">
                <small className="block opacity-80 uppercase tracking-wide text-xs font-bold mb-1">Quincena Iniciando el</small>
                <div className="flex flex-col items-center">
                    <select
                        value={currentIndex}
                        onChange={(e) => onChange(parseInt(e.target.value))}
                        className="bg-white/20 text-white font-bold text-lg p-1 rounded-md border border-white/40 cursor-pointer outline-none mb-1"
                    >
                        {Array.from({ length: 26 }).map((_, i) => {
                            const { start: s, end: e } = getPeriodDates(i);
                            const isCurrent = today >= s && today <= e;
                            return (
                                <option key={i} value={i} className="text-gray-800">
                                    Q{i + 1}: {formatDateShort(s)} {isCurrent ? '(Hoy)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    <span className="text-sm opacity-90">
                        Del {start.toLocaleDateString()} al {end.toLocaleDateString()}
                    </span>
                </div>
            </div>

            <button
                onClick={() => onChange(Math.min(25, currentIndex + 1))}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                disabled={currentIndex === 25}
            >
                Sig. ▶
            </button>
        </header>
    );
}
