export const START_DATE_2026 = new Date('2026-01-01T00:00:00');
export const END_DATE_2026 = new Date('2026-12-31T23:59:59');
export const DEFAULT_SEED_DATE = '2026-01-02';

/**
 * Infinite Anchor System:
 * The seed date is treated as the START of a fortnight (day 1 of a 14-day period).
 * We calculate backwards in 14-day increments to find the first period that starts
 * within the year 2026 (closest to January 1st). This becomes 'Period 1'.
 * Then we generate forward consecutive 14-day periods.
 */
function getFirstPeriodStart(seedDate?: string): Date {
    // Use seed date or default as the anchor - it MUST be the start of a fortnight
    const anchorDate = seedDate ? new Date(seedDate + 'T00:00:00') : new Date(DEFAULT_SEED_DATE + 'T00:00:00');
    
    // Calculate backwards from anchor in 14-day increments until we find the first period in 2026
    let periodStart = new Date(anchorDate);
    
    // Keep going back 14 days at a time until start date is in 2026 or earlier
    while (periodStart > START_DATE_2026) {
        const testDate = new Date(periodStart);
        testDate.setDate(testDate.getDate() - 14);
        
        // If going back another 14 days would take us before Jan 1, 2026, stop
        if (testDate < START_DATE_2026) {
            break;
        }
        
        periodStart = testDate;
    }
    
    return periodStart;
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
    // Get all valid periods for 2026
    const allPeriods = getAllPeriods(seedDate);
    
    // Find which period contains the given date
    for (let i = 0; i < allPeriods.length; i++) {
        const period = allPeriods[i];
        if (date >= period.start && date <= period.end) {
            return i;
        }
    }
    
    // If date is before the first period, return 0
    if (date < allPeriods[0].start) {
        return 0;
    }
    
    // If date is after the last period, return last index
    return allPeriods.length - 1;
}

/**
 * Generate all periods for 2026 based on the seed date anchor.
 * Only includes periods whose start date falls within 2026.
 * Returns an array of period objects with start and end dates.
 */
export function getAllPeriods(seedDate?: string): Array<{ start: Date; end: Date; index: number }> {
    const periods: Array<{ start: Date; end: Date; index: number }> = [];
    let index = 0;
    
    // Generate periods until the start date goes beyond 2026
    while (true) {
        const { start, end } = getPeriodDates(index, seedDate);
        
        // If period starts after Dec 31, 2026, stop
        if (start > END_DATE_2026) {
            break;
        }
        
        periods.push({ start, end, index: periods.length });
        index++;
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
