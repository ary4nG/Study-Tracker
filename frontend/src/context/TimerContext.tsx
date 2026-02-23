import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';

interface TimerContextValue {
    elapsed: number;        // total seconds elapsed
    isRunning: boolean;
    startTime: Date | null; // wall-clock start (used by Story 2.2 to save session)
    start: () => void;
    pause: () => void;
    reset: () => void;      // called by Story 2.2 after session is saved
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    // useRef so interval ID doesn't cause re-renders
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const start = useCallback(() => {
        if (isRunning) return;
        // Only record the wall-clock start on the very first start (not resumes)
        setStartTime((prev) => prev ?? new Date());
        setIsRunning(true);
        intervalRef.current = setInterval(() => {
            setElapsed((prev) => prev + 1);
        }, 1000);
    }, [isRunning]);

    const pause = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setElapsed(0);
        setIsRunning(false);
        setStartTime(null);
    }, []);

    return (
        <TimerContext.Provider value={{ elapsed, isRunning, startTime, start, pause, reset }}>
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer(): TimerContextValue {
    const ctx = useContext(TimerContext);
    if (!ctx) throw new Error('useTimer must be used within <TimerProvider>');
    return ctx;
}
