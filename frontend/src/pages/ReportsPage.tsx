import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subjects as subjectsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWeeklyReport } from '../hooks/useWeeklyReport';
import { useSubjectWeeklyBreakdown } from '../hooks/useSubjectWeeklyBreakdown';
import { formatTime } from '../utils/formatTime';
import StudyTimerWidget from '../components/common/StudyTimerWidget';
import StudyTimeDonutChart from '../components/charts/StudyTimeDonutChart';
import MasteredBarChart from '../components/charts/MasteredBarChart';
import type { Subject } from '../types';

// ── Inline stat card ─────────────────────────────────────────────────────────
function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '16px', flex: '1 1 120px', textAlign: 'center', minWidth: '110px',
        }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{label}</div>
        </div>
    );
}

export default function ReportsPage() {
    const { logout } = useAuth();
    const report = useWeeklyReport();
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        subjectsApi.list().then((res) => {
            const data = res.data;
            setSubjects(Array.isArray(data) ? data : (data.results ?? []));
        });
    }, []);

    const breakdown = useSubjectWeeklyBreakdown(
        subjects,
        report.data?.week_start,
        report.data?.week_end,
    );

    const d = report.data;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Link to="/dashboard" style={{ fontWeight: 700, fontSize: '18px', color: '#2563EB', textDecoration: 'none' }}>SyllabusTracker</Link>
                        <nav style={{ display: 'flex', gap: '16px' }}>
                            <Link to="/dashboard" style={navLink}>Dashboard</Link>
                            <Link to="/history" style={navLink}>History</Link>
                            <span style={{ ...navLink, color: '#1e293b', fontWeight: 600, borderBottom: '2px solid #2563EB', paddingBottom: '2px' }}>Reports</span>
                        </nav>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StudyTimerWidget />
                        <button onClick={logout} style={ghostBtn}>Logout</button>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>

                {/* Week navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <button onClick={report.goToPrevWeek} style={navBtn}>← Prev</button>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                            {report.weekLabel}
                        </h1>
                        {d && (
                            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                                {d.week_start} – {d.week_end}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={report.goToNextWeek}
                        disabled={!report.canGoNext}
                        style={{ ...navBtn, opacity: report.canGoNext ? 1 : 0.3, cursor: report.canGoNext ? 'pointer' : 'not-allowed' }}
                    >
                        Next →
                    </button>
                </div>

                {/* Loading state */}
                {report.loading && (
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} style={{ flex: 1, height: '90px', borderRadius: '10px', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%' }} />
                        ))}
                    </div>
                )}

                {/* Stats loaded */}
                {!report.loading && d && (
                    <>
                        {/* Stat cards */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <StatCard icon="📚" value={String(d.session_count)} label="sessions" />
                            <StatCard icon="⏱️" value={formatTime(d.total_duration_seconds)} label="studied" />
                            <StatCard icon="📅" value={`${d.days_studied}/7`} label="days studied" />
                            <StatCard icon="🏆" value={String(d.topics_mastered_count)} label="topics mastered" />
                        </div>

                        {/* Empty state */}
                        {d.session_count === 0 && (
                            <div style={{ textAlign: 'center', padding: '64px 32px', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                <p style={{ fontSize: '36px', margin: '0 0 8px' }}>📭</p>
                                <p style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>No activity this week</p>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>
                                    {report.weekOffset === 0
                                        ? 'Start a study session to see your weekly report!'
                                        : 'No sessions were recorded in this week.'}
                                </p>
                                {report.weekOffset < 0 && (
                                    <button onClick={report.goToNextWeek} style={primaryBtn}>View this week</button>
                                )}
                            </div>
                        )}

                        {/* Charts */}
                        {d.session_count > 0 && (
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                {/* Donut chart card */}
                                <div style={{ ...chartCard, flex: '1 1 280px' }}>
                                    <h2 style={chartTitle}>🍩 Time by Subject</h2>
                                    {breakdown.loading
                                        ? <div style={{ height: '160px', background: '#f1f5f9', borderRadius: '50%', width: '160px', margin: '0 auto' }} />
                                        : <StudyTimeDonutChart segments={breakdown.segments} />
                                    }
                                </div>

                                {/* Bar chart card */}
                                <div style={{ ...chartCard, flex: '1 1 340px' }}>
                                    <h2 style={chartTitle}>📊 Mastery by Subject</h2>
                                    {breakdown.loading
                                        ? <div style={{ height: '120px', background: '#f1f5f9', borderRadius: '8px' }} />
                                        : <MasteredBarChart bars={breakdown.bars} />
                                    }
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const navLink: React.CSSProperties = {
    fontSize: '14px', color: '#64748b', textDecoration: 'none', fontWeight: 500,
};
const ghostBtn: React.CSSProperties = {
    padding: '7px 14px', background: 'transparent', color: '#64748b',
    border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', cursor: 'pointer',
};
const navBtn: React.CSSProperties = {
    padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#374151',
    cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
    padding: '9px 18px', background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};
const chartCard: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px',
};
const chartTitle: React.CSSProperties = {
    margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1e293b',
};
