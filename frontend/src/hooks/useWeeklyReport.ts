import { useCallback, useEffect, useState } from 'react';
import API from '../services/api';

export interface WeeklyReportData {
    week_start: string;
    week_end: string;
    total_duration_seconds: number;
    session_count: number;
    unique_subjects_count: number;
    topics_mastered_count: number;
    days_studied: number;
}

export interface WeeklyReportState {
    data: WeeklyReportData | null;
    loading: boolean;
    weekOffset: number;           // 0 = current, -1 = last, etc.
    weekLabel: string;
    goToPrevWeek: () => void;
    goToNextWeek: () => void;
    canGoNext: boolean;           // false when offset === 0 (can't go into future)
}

/** Returns the ISO week string 'YYYY-WW' for a date offset by N weeks from today. */
function getISOWeek(offsetWeeks: number): { param: string; monday: Date } {
    const now = new Date();
    // Move to Monday of current week
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - day + offsetWeeks * 7);

    // ISO week number: Jan 4 is always in week 1
    const target = new Date(monday);
    target.setDate(target.getDate() + 3); // Thursday of the week
    const yearStart = new Date(target.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    const isoYear = target.getFullYear();
    const param = `${isoYear}-${String(weekNum).padStart(2, '0')}`;
    return { param, monday };
}

function buildWeekLabel(offset: number, monday: Date): string {
    if (offset === 0) return 'This Week';
    if (offset === -1) return 'Last Week';
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(monday)} – ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function useWeeklyReport(): WeeklyReportState {
    const [weekOffset, setWeekOffset] = useState(0);
    const [data, setData] = useState<WeeklyReportData | null>(null);
    const [loading, setLoading] = useState(true);

    const { param, monday } = getISOWeek(weekOffset);
    const weekLabel = buildWeekLabel(weekOffset, monday);

    const fetchReport = useCallback(() => {
        setLoading(true);
        const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
        API.get(`/api/reports/weekly/?week=${param}&tz=${tz}`)
            .then((res) => setData(res.data as WeeklyReportData))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [param]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    return {
        data,
        loading,
        weekOffset,
        weekLabel,
        goToPrevWeek: () => setWeekOffset((n) => n - 1),
        goToNextWeek: () => setWeekOffset((n) => n + 1),
        canGoNext: weekOffset < 0,
    };
}
