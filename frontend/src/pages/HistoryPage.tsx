import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subjects as subjectsApi, sessions as sessionsApi } from '../services/api';
import { formatTime } from '../utils/formatTime';
import { formatRelativeDate } from '../utils/formatDate';
import StudyTimerWidget from '../components/common/StudyTimerWidget';
import type { Subject, Session } from '../types';
import { useAuth } from '../context/AuthContext';

const DAY_OPTIONS = [
    { label: 'All time', value: undefined },
    { label: 'Today', value: 1 },
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
];

export default function HistoryPage() {
    const { logout } = useAuth();
    const [sessionList, setSessionList] = useState<Session[]>([]);
    const [subjectList, setSubjectList] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
    const [selectedDays, setSelectedDays] = useState<number | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    // Build a quick colour map from subjects for the stripe
    const colorMap = new Map(subjectList.map((s) => [s.id, s.color]));

    // Fetch subjects once
    useEffect(() => {
        subjectsApi.list().then((res) => {
            const data = res.data;
            setSubjectList(Array.isArray(data) ? data : (data.results ?? []));
        });
    }, []);

    // Re-fetch sessions when filters change
    useEffect(() => {
        setLoading(true);
        sessionsApi
            .list({ subject: selectedSubjectId, days: selectedDays })
            .then((res) => {
                const data = res.data;
                setSessionList(Array.isArray(data) ? data : (data.results ?? []));
            })
            .finally(() => setLoading(false));
    }, [selectedSubjectId, selectedDays]);

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px' }}>
                <div style={{ maxWidth: '960px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Link to="/dashboard" style={{ fontWeight: 700, fontSize: '18px', color: '#2563EB', textDecoration: 'none' }}>
                            SyllabusTracker
                        </Link>
                        <nav style={{ display: 'flex', gap: '16px' }}>
                            <Link to="/dashboard" style={navLink}>Dashboard</Link>
                            <span style={{ ...navLink, color: '#1e293b', fontWeight: 600, borderBottom: '2px solid #2563EB', paddingBottom: '2px' }}>History</span>
                            <Link to="/reports" style={navLink}>Reports</Link>
                        </nav>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StudyTimerWidget />
                        <button onClick={logout} style={ghostBtn}>Logout</button>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px' }}>
                {/* Page title + filter bar */}
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ margin: '0 0 16px', fontSize: '22px', fontWeight: 700, color: '#1e293b' }}>Study History</h1>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Subject filter */}
                        <select
                            value={selectedSubjectId ?? ''}
                            onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
                            style={filterSelect}
                        >
                            <option value="">All subjects</option>
                            {subjectList.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        {/* Day range pills */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {DAY_OPTIONS.map(({ label, value }) => (
                                <button
                                    key={label}
                                    onClick={() => setSelectedDays(value)}
                                    style={{
                                        ...pillBtn,
                                        background: selectedDays === value ? '#2563EB' : '#fff',
                                        color: selectedDays === value ? '#fff' : '#64748b',
                                        border: `1px solid ${selectedDays === value ? '#2563EB' : '#e2e8f0'}`,
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} style={{ height: '60px', borderRadius: '8px', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%' }} />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && sessionList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '64px 32px', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                        <p style={{ fontSize: '32px', margin: '0 0 8px' }}>📋</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>No sessions found</p>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                            {selectedSubjectId || selectedDays
                                ? 'Try adjusting your filters'
                                : 'Start your first study session to see it here'}
                        </p>
                    </div>
                )}

                {/* Session list */}
                {!loading && sessionList.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        {/* Table header */}
                        <div style={{ ...tableRow, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span style={{ flex: 2 }}>Date</span>
                            <span style={{ flex: 2 }}>Subject</span>
                            <span style={{ flex: 2 }}>Topic</span>
                            <span style={{ flex: 1, textAlign: 'right' }}>Duration</span>
                        </div>

                        {sessionList.map((session, index) => {
                            const subjectColor = session.subject ? (colorMap.get(session.subject) ?? '#94a3b8') : '#94a3b8';
                            return (
                                <div
                                    key={session.id}
                                    style={{
                                        ...tableRow,
                                        borderBottom: index < sessionList.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        position: 'relative',
                                    }}
                                >
                                    {/* Coloured left stripe */}
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: subjectColor }} />

                                    <span style={{ flex: 2, fontSize: '13px', color: '#64748b', paddingLeft: '8px' }}>
                                        {formatRelativeDate(session.created_at)}
                                    </span>
                                    <span style={{ flex: 2, fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                                        {session.subject_name ?? <span style={{ color: '#94a3b8' }}>Unknown</span>}
                                    </span>
                                    <span style={{ flex: 2, fontSize: '13px', color: session.topic_name ? '#475569' : '#cbd5e1' }}>
                                        {session.topic_name ?? '—'}
                                    </span>
                                    <span style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                                        {formatTime(session.duration_seconds)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Summary row */}
                {!loading && sessionList.length > 0 && (
                    <p style={{ marginTop: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'right' }}>
                        {sessionList.length} session{sessionList.length !== 1 ? 's' : ''} ·{' '}
                        Total: {formatTime(sessionList.reduce((acc, s) => acc + s.duration_seconds, 0))}
                    </p>
                )}
            </main>
        </div>
    );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const navLink: React.CSSProperties = {
    fontSize: '14px', color: '#64748b', textDecoration: 'none', fontWeight: 500,
};
const ghostBtn: React.CSSProperties = {
    padding: '7px 14px', background: 'transparent', color: '#64748b',
    border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', cursor: 'pointer',
};
const filterSelect: React.CSSProperties = {
    padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: '7px',
    fontSize: '13px', background: '#fff', color: '#1e293b', cursor: 'pointer',
};
const pillBtn: React.CSSProperties = {
    padding: '6px 14px', borderRadius: '99px', fontSize: '13px',
    fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
};
const tableRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 16px',
};
