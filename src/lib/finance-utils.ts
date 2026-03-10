export const START_DATE_2026 = new Date('2026-01-02T00:00:00');

export function getPeriodDates(index: number, seedDate?: string) {
    let baseDate: Date;
    
    if (seedDate) {
        baseDate = new Date(seedDate + 'T00:00:00');
    } else {
        baseDate = new Date(START_DATE_2026);
    }
    
    const start = new Date(baseDate);
    start.setDate(start.getDate() + (index * 14));
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    return { start, end };
}

export function getCurrentPeriodIndex(date: Date = new Date(), seedDate?: string): number {
    let baseDate: Date;
    
    if (seedDate) {
        baseDate = new Date(seedDate + 'T00:00:00');
    } else {
        baseDate = new Date(START_DATE_2026);
    }
    
    const diffTime = date.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const estimatedIndex = Math.floor(diffDays / 14);
    return Math.max(0, Math.min(25, estimatedIndex));
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(amount);
}

export function formatDateShort(date: Date): string {
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
    });
}
