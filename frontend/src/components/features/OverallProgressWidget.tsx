import { Link } from 'react-router-dom';
import type { Subject } from '../../types';

interface OverallProgressWidgetProps {
    subjects: Subject[];
    loading?: boolean;
}

const RADIUS = 40;
const STROKE = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = 100;

export default function OverallProgressWidget({ subjects, loading }: OverallProgressWidgetProps) {
    const totalTopics = subjects.reduce((a, s) => a + s.topic_count, 0);
    const totalMastered = subjects.reduce((a, s) => a + s.mastered_count, 0);
    const overallPct = totalTopics > 0 ? Math.round((totalMastered / totalTopics) * 100) : 0;
    const offset = CIRCUMFERENCE - (overallPct / 100) * CIRCUMFERENCE;
    const isComplete = overallPct === 100 && totalTopics > 0;
    const arcColor = isComplete ? '#22c55e' : overallPct >= 60 ? '#f59e0b' : '#2563EB';

    // ── Loading skeleton ────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={cardStyle}>
                <div style={{ ...skeletonBox, width: '120px', height: '16px', marginBottom: '14px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ ...skeletonBox, width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ ...skeletonBox, width: '100%', height: '12px', marginBottom: '6px' }} />
                        <div style={{ ...skeletonBox, width: '70%', height: '10px' }} />
                    </div>
                </div>
                {[1, 2, 3].map((i) => (
                    <div key={i} style={{ marginBottom: '10px' }}>
                        <div style={{ ...skeletonBox, width: '100%', height: '8px', marginBottom: '4px' }} />
                        <div style={{ ...skeletonBox, width: '100%', height: '4px', borderRadius: '2px' }} />
                    </div>
                ))}
            </div>
        );
    }

    // ── Empty state ─────────────────────────────────────────────────────────
    if (subjects.length === 0 || totalTopics === 0) {
        return (
            <div style={{ ...cardStyle, textAlign: 'center' }}>
                <p style={{ fontSize: '20px', margin: '0 0 6px' }}>📊</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>Overall Progress</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                    Add subjects & topics to see your mastery here
                </p>
            </div>
        );
    }

    return (
        <div style={cardStyle}>
            <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                📊 Overall Progress
            </p>

            {/* Arc ring + centre text */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
                    {/* Track */}
                    <circle
                        cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                        fill="none" stroke="#e2e8f0" strokeWidth={STROKE}
                    />
                    {/* Fill */}
                    <circle
                        cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                        fill="none"
                        stroke={arcColor}
                        strokeWidth={STROKE}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                        style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.4s ease' }}
                    />
                    {/* Centre text */}
                    <text
                        x={SIZE / 2} y={SIZE / 2 - 5}
                        textAnchor="middle"
                        fontSize="17" fontWeight="800" fill="#1e293b"
                    >
                        {overallPct}%
                    </text>
                    <text
                        x={SIZE / 2} y={SIZE / 2 + 12}
                        textAnchor="middle"
                        fontSize="9" fill="#94a3b8"
                    >
                        mastered
                    </text>
                </svg>

                {/* Summary stats */}
                <div>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginBottom: '2px' }}>
                        {totalMastered} / {totalTopics} topics
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        across {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
                    </div>
                    {isComplete && (
                        <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                            🎉 Syllabus Complete!
                        </div>
                    )}
                </div>
            </div>

            {/* Per-subject breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {subjects.map((s) => {
                    const pct = s.topic_count > 0 ? Math.round((s.mastered_count / s.topic_count) * 100) : 0;
                    return (
                        <Link
                            key={s.id}
                            to={`/subjects/${s.id}`}
                            style={{ display: 'block', textDecoration: 'none' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Colour dot */}
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                {/* Name */}
                                <span style={{ fontSize: '12px', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {s.name}
                                </span>
                                {/* Pct */}
                                <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>{pct}%</span>
                            </div>
                            {/* Mini progress bar */}
                            <div style={{ background: '#f1f5f9', borderRadius: '99px', height: '4px', marginTop: '3px', overflow: 'hidden', marginLeft: '16px' }}>
                                <div style={{
                                    width: `${pct}%`, height: '100%', borderRadius: '99px',
                                    background: pct === 100 ? '#22c55e' : s.color,
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
};

const skeletonBox: React.CSSProperties = {
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: '4px',
};
