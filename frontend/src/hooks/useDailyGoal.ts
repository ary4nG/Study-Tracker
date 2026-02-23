import { useCallback, useEffect, useState } from 'react';
import { sessions as sessionsApi } from '../services/api';
import type { Session } from '../types';

const STORAGE_KEY = 'daily_goal_minutes';
const todayStr = () => new Date().toLocaleDateString('en-CA'); // "2026-02-23"

export interface DailyGoalState {
    goalMinutes: number | null;
    setGoal: (n: number | null) => void;
    todaySeconds: number;
    todayMinutes: number;
    pct: number;           // 0–100+ (can exceed 100 when overachieved)
    goalAchieved: boolean;
    loading: boolean;
    refresh: () => void;
}

export function useDailyGoal(refreshKey?: number): DailyGoalState {
    const [goalMinutes, setGoalState] = useState<number | null>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? parseInt(stored, 10) : NaN;
        return isNaN(parsed) || parsed <= 0 ? null : parsed;
    });

    const [todaySeconds, setTodaySeconds] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchToday = useCallback(() => {
        setLoading(true);
        sessionsApi
            .list({ days: 1 })
            .then((res) => {
                const data = res.data;
                const all: Session[] = Array.isArray(data) ? data : (data.results ?? []);
                const today = todayStr();
                const secs = all
                    .filter((s) => new Date(s.created_at).toLocaleDateString('en-CA') === today)
                    .reduce((acc, s) => acc + s.duration_seconds, 0);
                setTodaySeconds(secs);
            })
            .catch(() => setTodaySeconds(0))
            .finally(() => setLoading(false));
    }, []);

    // Re-fetch whenever refreshKey changes (after a session is saved)
    useEffect(() => {
        fetchToday();
    }, [fetchToday, refreshKey]);

    const setGoal = (n: number | null) => {
        setGoalState(n);
        if (n === null) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, String(n));
        }
    };

    const todayMinutes = Math.floor(todaySeconds / 60);
    const pct = goalMinutes ? Math.min(Math.round((todaySeconds / (goalMinutes * 60)) * 100), 999) : 0;
    const goalAchieved = goalMinutes !== null && todaySeconds >= goalMinutes * 60;

    return { goalMinutes, setGoal, todaySeconds, todayMinutes, pct, goalAchieved, loading, refresh: fetchToday };
}
