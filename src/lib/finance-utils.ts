export const START_DATE_2026 = new Date('2026-01-01T00:00:00');
export const END_DATE_2026 = new Date('2026-12-31T23:59:59');

export function getPeriodDates(index: number, seedDate?: string) {
    // Calculate day-of-week offset from seedDate
    let offsetDays = 0;
    if (seedDate) {
        const seedDateObj = new Date(seedDate + 'T00:00:00');
        const jan1 = new Date('2026-01-01T00:00:00');
        offsetDays = Math.floor((seedDateObj.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Generate period starting from January 1st, 2026 with offset
    const start = new Date(START_DATE_2026);
    start.setDate(start.getDate() + offsetDays + (index * 14));
    
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    
    // Constrain to 2026 bounds
    if (start > END_DATE_2026) {
        start.setTime(END_DATE_2026.getTime());
    }
    if (end > END_DATE_2026) {
        end.setTime(END_DATE_2026.getTime());
    }
    
    return { start, end };
}

export function getCurrentPeriodIndex(date: Date = new Date(), seedDate?: string): number {
    // Calculate day-of-week offset from seedDate
    let offsetDays = 0;
    if (seedDate) {
        const seedDateObj = new Date(seedDate + 'T00:00:00');
        const jan1 = new Date('2026-01-01T00:00:00');
        offsetDays = Math.floor((seedDateObj.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const baseDate = new Date(START_DATE_2026);
    baseDate.setDate(baseDate.getDate() + offsetDays);
    
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
