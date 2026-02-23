import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subjects as subjectsApi } from '../services/api';
import type { Subject } from '../types';
import SubjectCard from '../components/features/SubjectCard';
import SubjectForm from '../components/features/SubjectForm';
import StudyTimerWidget from '../components/common/StudyTimerWidget';
import DailyGoalWidget from '../components/features/DailyGoalWidget';
import StreakWidget from '../components/features/StreakWidget';
import { useDailyGoal } from '../hooks/useDailyGoal';
import { useStreak } from '../hooks/useStreak';
import { useTimer } from '../context/TimerContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [subjectList, setSubjectList] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [sessionRefreshKey, setSessionRefreshKey] = useState(0);

    // When timer resets after a session is saved, increment refreshKey so
    // DailyGoalWidget re-fetches today's total.
    const { elapsed } = useTimer();
    const [prevElapsed, setPrevElapsed] = useState(elapsed);
    useEffect(() => {
        if (prevElapsed > 0 && elapsed === 0) {
            // Timer was just reset → a session was saved
            setSessionRefreshKey((k) => k + 1);
        }
        setPrevElapsed(elapsed);
    }, [elapsed, prevElapsed]);

    const dailyGoal = useDailyGoal(sessionRefreshKey);
    const streak = useStreak(sessionRefreshKey);

    useEffect(() => {
        subjectsApi
            .list()
            .then((res) => {
                const data = res.data;
                setSubjectList(Array.isArray(data) ? data : data.results ?? []);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleCreated = (subject: Subject) => {
        setSubjectList((prev) => [subject, ...prev]);
        setShowForm(false);
    };

    const handleUpdated = (updated: Subject) => {
        setSubjectList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    };

    const handleDeleted = (id: number) => {
        setSubjectList((prev) => prev.filter((s) => s.id !== id));
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#2563EB' }}>SyllabusTracker</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Link to="/history" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>History</Link>
                        <StudyTimerWidget />
                        {user?.avatar_url && (
                            <img src={user.avatar_url} alt={user.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                        )}
                        <span style={{ fontSize: '14px', color: '#374151' }}>{user?.name || user?.username}</span>
                        <button onClick={logout} style={ghostBtn}>Logout</button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>

                {/* Daily Goal Widget + subjects header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#1e293b' }}>My Subjects</h1>
                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                            {loading ? 'Loading…' : `${subjectList.length} subject${subjectList.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <StreakWidget state={streak} />
                        <DailyGoalWidget state={dailyGoal} />
                        <button onClick={() => setShowForm(true)} style={{ ...primaryBtn, alignSelf: 'flex-start', marginTop: '2px' }}>
                            + Add Subject
                        </button>
                    </div>
                </div>

                {/* Skeleton loader */}
                {loading && (
                    <div style={gridStyle}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} style={{ ...skeletonCard, animationDelay: `${i * 0.1}s` }} />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && subjectList.length === 0 && (
                    <div style={emptyState}>
                        <p style={{ fontSize: '32px', margin: '0 0 8px' }}>📚</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>
                            No subjects yet
                        </p>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>
                            Add your first subject to start tracking your syllabus
                        </p>
                        <button onClick={() => setShowForm(true)} style={primaryBtn}>
                            + Add your first subject
                        </button>
                    </div>
                )}

                {/* Subject grid */}
                {!loading && subjectList.length > 0 && (
                    <div style={gridStyle}>
                        {subjectList.map((subject) => (
                            <SubjectCard
                                key={subject.id}
                                subject={subject}
                                onUpdated={handleUpdated}
                                onDeleted={handleDeleted}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Add Subject Modal */}
            {showForm && (
                <SubjectForm
                    onCreated={handleCreated}
                    onCancel={() => setShowForm(false)}
                />
            )}
        </div>
    );
}

const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
};

const skeletonCard: React.CSSProperties = {
    height: '110px',
    borderRadius: '8px',
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
};

const emptyState: React.CSSProperties = {
    textAlign: 'center',
    padding: '64px 32px',
    background: '#fff',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
};

const primaryBtn: React.CSSProperties = {
    padding: '9px 18px',
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
    padding: '7px 14px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '7px',
    fontSize: '13px',
    cursor: 'pointer',
};
