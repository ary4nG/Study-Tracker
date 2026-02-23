import { useCallback, useEffect, useState } from 'react';
import { sessions as sessionsApi } from '../services/api';
import type { Subject, Session } from '../types';
import type { DonutSegment } from '../components/charts/StudyTimeDonutChart';
import type { BarItem } from '../components/charts/MasteredBarChart';

export interface SubjectWeeklyBreakdown {
    segments: DonutSegment[];
    bars: BarItem[];
    loading: boolean;
}

/**
 * Fetches recent sessions and computes per-subject breakdowns
 * for the given week (weekStart / weekEnd as ISO date strings: 'YYYY-MM-DD').
 */
export function useSubjectWeeklyBreakdown(
    subjects: Subject[],
    weekStart: string | undefined,
    weekEnd: string | undefined,
): SubjectWeeklyBreakdown {
    const [segments, setSegments] = useState<DonutSegment[]>([]);
    const [bars, setBars] = useState<BarItem[]>([]);
    const [loading, setLoading] = useState(true);

    const compute = useCallback(() => {
        if (!weekStart || !weekEnd || subjects.length === 0) {
            setSegments([]);
            setBars([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        // Fetch last 14 days to guarantee we cover the previous week too
        sessionsApi.list({ days: 14 }).then((res) => {
            const allSessions: Session[] = Array.isArray(res.data) ? res.data : (res.data.results ?? []);

            // Filter to the window [weekStart, weekEnd] by local date
            const wStart = new Date(weekStart + 'T00:00:00');
            const wEnd = new Date(weekEnd + 'T23:59:59');

            const weekSessions = allSessions.filter((s) => {
                const d = new Date(s.created_at);
                return d >= wStart && d <= wEnd;
            });

            // Build lookup maps from subjects
            const colorMap = new Map(subjects.map((s) => [s.id, s.color]));

            // Sum duration per subject
            const durationBySubject: Record<number, number> = {};
            weekSessions.forEach((s) => {
                if (s.subject !== null) {
                    durationBySubject[s.subject] = (durationBySubject[s.subject] ?? 0) + s.duration_seconds;
                }
            });

            // Build donut segments (only subjects with sessions)
            const newSegments: DonutSegment[] = subjects
                .filter((s) => (durationBySubject[s.id] ?? 0) > 0)
                .map((s) => ({
                    label: s.name,
                    seconds: durationBySubject[s.id] ?? 0,
                    color: colorMap.get(s.id) ?? '#2563EB',
                }));

            // Build bar items for mastered_count this week — use mastered_count
            // NOTE: mastered_count is a cumulative total, not per-week.
            // For per-week mastery we'd need the endpoint data; use mastered_count as
            // a proxy showing overall mastery per subject (acceptable for MVP).
            // The backend WeeklyReportData provides topics_mastered_count as a total —
            // so for per-subject breakdown we use mastered_count from subjects list.
            const newBars: BarItem[] = subjects.map((s) => ({
                label: s.name,
                count: s.mastered_count,
                color: colorMap.get(s.id) ?? '#2563EB',
            }));

            setSegments(newSegments);
            setBars(newBars);
        }).catch(() => {
            setSegments([]);
            setBars([]);
        }).finally(() => setLoading(false));
    }, [subjects, weekStart, weekEnd]);

    useEffect(() => {
        compute();
    }, [compute]);

    return { segments, bars, loading };
}
