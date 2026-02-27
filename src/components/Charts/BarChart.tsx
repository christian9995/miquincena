'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface BarChartProps {
    realIncome: number;
    realExpense: number;
    metaIncome: number;
    metaExpense: number;
}

export default function BarChart({ realIncome, realExpense, metaIncome, metaExpense }: BarChartProps) {
    const data = {
        labels: ['Ingresos', 'Egresos'],
        datasets: [
            {
                label: 'Real',
                data: [realIncome, realExpense],
                backgroundColor: ['#34a853', '#ea4335'],
            },
            {
                label: 'Meta',
                data: [metaIncome, metaExpense],
                backgroundColor: ['#a8dab5', '#f5b7b1'],
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Comparativa vs Presupuesto',
            },
        },
    };

    return <Bar options={options} data={data} />;
}
