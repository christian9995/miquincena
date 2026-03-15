export const START_DATE_2026 = new Date('2026-01-01T00:00:00');
export const END_DATE_2026 = new Date('2026-12-31T23:59:59');
export const DEFAULT_SEED_DATE = '2026-01-02';

/**
 * Calculate the first period start date (Period 0) by working backwards from the anchor date
 * in 14-day increments to find the starting point for the 26-period cycle.
 * Period 0 will be the first period that starts on or after January 1st, 2026.
 */
function getFirstPeriodStart(seedDate?: string): Date {
    // Use seed date or default as the anchor reference point
    const anchorDate = seedDate ? new Date(seedDate + 'T00:00:00') : new Date(DEFAULT_SEED_DATE + 'T00:00:00');
    
    // Calculate days between Jan 1, 2026 and anchor date
    const daysSinceJan1 = Math.floor((anchorDate.getTime() - START_DATE_2026.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate how many complete 14-day periods fit between Jan 1 and anchor date
    // This tells us which period the anchor date falls into
    const periodIndexFromAnchor = Math.floor(daysSinceJan1 / 14);
    
    // Calculate the start date of Period 0 by going back from Jan 1 in 14-day increments
    // The number of periods before Jan 1 that we need to calculate backwards
    // We ensure Period 0 starts on or after Jan 1, 2026
    const daysToFirstPeriod = periodIndexFromAnchor * 14;
    
    const firstPeriodStart = new Date(START_DATE_2026);
    firstPeriodStart.setDate(firstPeriodStart.getDate() + daysToFirstPeriod);
    
    return firstPeriodStart;
}

export function getPeriodDates(index: number, seedDate?: string) {
    // Get the first period start date (Period 0) using anchor date logic
    const firstPeriodStart = getFirstPeriodStart(seedDate);
    
    // Calculate start and end dates for this period
    // Each period is exactly 14 days, allowing natural year boundary crossing
    const start = new Date(firstPeriodStart);
    start.setDate(start.getDate() + (index * 14));
    
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    
    return { start, end };
}

export function getCurrentPeriodIndex(date: Date = new Date(), seedDate?: string): number {
    // Get the first period start date (Period 0)
    const firstPeriodStart = getFirstPeriodStart(seedDate);
    
    // Calculate which period the given date falls into
    const diffTime = date.getTime() - firstPeriodStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const periodIndex = Math.floor(diffDays / 14);
    
    // Constrain to valid range (0-25 for 26 periods)
    // If the date is before Period 0, return 0
    // If the date is after Period 25 ends, return 25
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
