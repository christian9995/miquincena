export const START_DATE_2026 = new Date('2026-01-01T00:00:00');
export const END_DATE_2026 = new Date('2026-12-31T23:59:59');
export const DEFAULT_SEED_DATE = '2026-01-02';

/**
 * Calculate the first period start date (Period 0) using the anchor date.
 * 
 * The seed date serves as a fixed reference point. We calculate backwards from it
 * in 14-day increments to determine the day-of-cycle, then calculate where Period 0
 * should start within January 2026.
 * 
 * This ensures exactly 26 consecutive 14-day periods are generated, with the first
 * period starting on or near January 1st, 2026, and the 26th period ending on or before
 * December 31st, 2026 (or naturally extending into early January if needed).
 */
function getFirstPeriodStart(seedDate?: string): Date {
    // Use seed date or default as the anchor reference point
    const anchorDate = seedDate ? new Date(seedDate + 'T00:00:00') : new Date(DEFAULT_SEED_DATE + 'T00:00:00');
    
    // Calculate days elapsed from Jan 1, 2026 to the anchor date
    const daysSinceJan1 = Math.floor((anchorDate.getTime() - START_DATE_2026.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate which 14-day period the anchor date falls into (0-indexed)
    // This tells us the "phase" of the cycle at the anchor point
    const periodOffset = daysSinceJan1 % 14;
    
    // Period 0 starts when we go back from Jan 1 by periodOffset days
    // This aligns the entire 26-period cycle with the anchor's phase
    const firstPeriodStart = new Date(START_DATE_2026);
    firstPeriodStart.setDate(firstPeriodStart.getDate() - periodOffset);
    
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

/**
 * Generate all 26 periods for the 2026 calendar based on the seed date anchor.
 * Returns an array of 26 period objects with start and end dates.
 */
export function getAllPeriods(seedDate?: string): Array<{ start: Date; end: Date; index: number }> {
    const periods: Array<{ start: Date; end: Date; index: number }> = [];
    
    for (let i = 0; i < 26; i++) {
        const { start, end } = getPeriodDates(i, seedDate);
        periods.push({ start, end, index: i });
    }
    
    return periods;
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
