/**
 * Format an ISO date string into a human-readable relative date/time.
 * - "Today, 2:35 PM"
 * - "Yesterday, 10:00 AM"
 * - "22 Feb 2026"
 */
export function formatRelativeDate(iso: string): string {
    const date = new Date(iso);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (date >= startOfToday) {
        return `Today, ${timeStr}`;
    }
    if (date >= startOfYesterday) {
        return `Yesterday, ${timeStr}`;
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
