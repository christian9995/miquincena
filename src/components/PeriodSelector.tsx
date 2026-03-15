'use client';

import { getAllPeriods, formatDateShort } from '@/lib/finance-utils';

interface PeriodSelectorProps {
    currentIndex: number;
    onChange: (index: number) => void;
    seedDate?: string;
}

export default function PeriodSelector({ currentIndex, onChange, seedDate }: PeriodSelectorProps) {
    const allPeriods = getAllPeriods(seedDate);
    const currentPeriod = allPeriods[currentIndex];
    const { start, end } = currentPeriod || { start: new Date(), end: new Date() };
    const today = new Date();
    const lastIndex = allPeriods.length - 1;

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
                        {allPeriods.map((period, i) => {
                            const isCurrent = today >= period.start && today <= period.end;
                            return (
                                <option key={i} value={i} className="text-gray-800">
                                    Q{i + 1}: {formatDateShort(period.start)} {isCurrent ? '(Hoy)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    <span className="text-sm opacity-90 range-label">
                        Del {start.toLocaleDateString()} al {end.toLocaleDateString()}
                    </span>
                </div>
            </div>

            <button
                onClick={() => onChange(Math.min(lastIndex, currentIndex + 1))}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                disabled={currentIndex === lastIndex}
            >
                Sig. ▶
            </button>
        </header>
    );
}
