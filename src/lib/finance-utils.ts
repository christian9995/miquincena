export const START_DATE_2026 = new Date('2026-01-01T00:00:00');
export const END_DATE_2026 = new Date('2026-12-31T23:59:59');
export const DEFAULT_SEED_DATE = '2026-01-02';

/**
 * Calculate the first period start date by working backwards from the anchor date
 * to find the starting point for the 26-period cycle within 2026.
 */
function getFirstPeriodStart(seedDate?: string): Date {
    // Use seed date or default
    const anchorDate = seedDate ? new Date(seedDate + 'T00:00:00') : new Date(DEFAULT_SEED_DATE + 'T00:00:00');
    
    // Calculate how many days back we need to go to find the start of the cycle
    // We work backwards from the anchor date in 14-day increments until we find
    // a date that would encompass January 1, 2026
    let cycleStart = new Date(anchorDate);
    
    // Calculate days between Jan 1, 2026 and anchor date
    const daysSinceJan1 = Math.floor((anchorDate.getTime() - START_DATE_2026.getTime()) / (1000 * 60 * 60 * 24));
    
    // Find how many complete 14-day periods fit between Jan 1 and anchor date
    // Then calculate backwards to find the true cycle start
    const periodsFromStart = Math.floor(daysSinceJan1 / 14);
    const daysToFirstPeriod = periodsFromStart * 14;
    
    cycleStart = new Date(START_DATE_2026);
    cycleStart.setDate(cycleStart.getDate() + daysToFirstPeriod);
    
    return cycleStart;
}

export function getPeriodDates(index: number, seedDate?: string) {
    // Get the first period start date using anchor date logic
    const firstPeriodStart = getFirstPeriodStart(seedDate);
    
    // Calculate start and end dates for this period
    const start = new Date(firstPeriodStart);
    start.setDate(start.getDate() + (index * 14));
    
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    
    // If period extends beyond 2026, cap it
    if (end > END_DATE_2026) {
        end.setTime(END_DATE_2026.getTime());
    }
    
    // Return empty period if start is beyond 2026
    if (start > END_DATE_2026) {
        return { start: END_DATE_2026, end: END_DATE_2026 };
    }
    
    return { start, end };
}

export function getCurrentPeriodIndex(date: Date = new Date(), seedDate?: string): number {
    // Get the first period start date using anchor date logic
    const firstPeriodStart = getFirstPeriodStart(seedDate);
    
    // Calculate which period the given date falls into
    const diffTime = date.getTime() - firstPeriodStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const periodIndex = Math.floor(diffDays / 14);
    
    // Constrain to valid range (0-25 for 26 periods)
    return Math.max(0, Math.min(25, periodIndex));
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
