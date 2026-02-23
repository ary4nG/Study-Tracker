export type TopicStatus = 'not_started' | 'in_progress' | 'mastered';

const cycle: TopicStatus[] = ['not_started', 'in_progress', 'mastered'];

/** Advance to the next status in the cycle. */
export function cycleStatus(current: TopicStatus): TopicStatus {
    return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}

/** Map a status to its display color. */
export function statusColor(status: TopicStatus): string {
    switch (status) {
        case 'mastered': return '#22c55e';  // green
        case 'in_progress': return '#f59e0b';  // amber
        default: return '#e2e8f0';  // grey
    }
}

/** Human-readable label for a status. */
export function statusLabel(status: TopicStatus): string {
    switch (status) {
        case 'mastered': return 'Mastered';
        case 'in_progress': return 'In Progress';
        default: return 'Not Started';
    }
}

/** Next status label (for tooltip). */
export function nextStatusLabel(current: TopicStatus): string {
    return statusLabel(cycleStatus(current));
}
