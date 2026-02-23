import { useCallback, useEffect, useState } from 'react';
import API from '../services/api';

export interface StreakState {
    streak: number;
    studiedToday: boolean;
    loading: boolean;
}

export function useStreak(refreshKey?: number): StreakState {
    const [streak, setStreak] = useState(0);
    const [studiedToday, setStudiedToday] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchStreak = useCallback(() => {
        setLoading(true);
        API.get('/api/sessions/streak/')
            .then((res) => {
                setStreak(res.data.streak ?? 0);
                setStudiedToday(res.data.studied_today ?? false);
            })
            .catch(() => {
                setStreak(0);
                setStudiedToday(false);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchStreak();
    }, [fetchStreak, refreshKey]);

    return { streak, studiedToday, loading };
}
