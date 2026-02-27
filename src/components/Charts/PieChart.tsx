'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
    categoryTotals: Record<string, number>;
}

export default function PieChart({ categoryTotals }: PieChartProps) {
    const activeCats = Object.keys(categoryTotals).filter(k => categoryTotals[k] > 0);

    if (activeCats.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg text-gray-400 italic">
                Sin gastos registrados
            </div>
        );
    }

    const data = {
        labels: activeCats.map(k => `${k} ($${categoryTotals[k].toFixed(0)})`),
        datasets: [
            {
                data: activeCats.map(k => categoryTotals[k]),
                backgroundColor: [
                    '#fbbc05',
                    '#4285f4',
                    '#34a853',
                    '#9c27b0',
                    '#ff5722',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
            title: {
                display: true,
                text: 'Distribución de Gastos',
            },
        },
        cutout: '60%',
    };

    return <Doughnut data={data} options={options} />;
}
