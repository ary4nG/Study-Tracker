import { useEffect, useState, useCallback } from 'react';
import { topics as topicsApi } from '../../services/api';
import type { Topic } from '../../types';

interface Props {
    subjectId: number;
    /** Pass the current topicList so the widget re-fetches when statuses change */
    topicList: Topic[];
    onStartStudying?: (topic: Topic) => void;
}

const DIFFICULTY_BADGE: Record<Topic['difficulty'], { bg: string; text: string; label: string; icon: string }> = {
    easy: { bg: '#dcfce7', text: '#15803d', label: 'Easy', icon: '🟢' },
    medium: { bg: '#fef9c3', text: '#92400e', label: 'Medium', icon: '🟡' },
    hard: { bg: '#fee2e2', text: '#b91c1c', label: 'Hard', icon: '🔴' },
};

const STATUS_LABEL: Record<Topic['status'], string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    mastered: 'Mastered',
};

export default function DailyFocusWidget({ subjectId, topicList, onStartStudying }: Props) {
    const [recommendation, setRecommendation] = useState<Topic | null>(null);
    const [loading, setLoading] = useState(true);
    const [allDone, setAllDone] = useState(false);

    const fetchRecommendation = useCallback(async () => {
        setLoading(true);
        try {
            const res = await topicsApi.recommend(subjectId);
            setRecommendation(res.data as Topic);
            setAllDone(false);
        } catch (err: any) {
            if (err?.response?.status === 204) {
                setAllDone(true);
                setRecommendation(null);
            }
        } finally {
            setLoading(false);
        }
    }, [subjectId]);

    // Re-fetch whenever the topic list changes (e.g. status updated)
    useEffect(() => {
        if (topicList.length === 0 && !loading) return;
        fetchRecommendation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subjectId, topicList]);

    // Don't render if no topics at all
    if (!loading && topicList.length === 0) return null;

    // All mastered!
    if (!loading && allDone) {
        return (
            <div style={containerStyle('#f0fdf4', '#86efac')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>🎉</span>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#15803d' }}>
                            All topics mastered!
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#16a34a' }}>
                            Outstanding work — you've conquered this subject.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const badge = recommendation ? DIFFICULTY_BADGE[recommendation.difficulty] : null;

    return (
        <div style={containerStyle('#eff6ff', '#bfdbfe')}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px' }}>🎯</span>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#3b82f6' }}>
                    Daily Focus
                </span>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={skeletonStyle('160px')} />
                    <div style={skeletonStyle('90px')} />
                </div>
            ) : recommendation ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                            {recommendation.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {badge && (
                                <span style={{
                                    fontSize: '11px', fontWeight: 600, padding: '2px 9px', borderRadius: '99px',
                                    background: badge.bg, color: badge.text,
                                }}>
                                    {badge.icon} {badge.label}
                                </span>
                            )}
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {STATUS_LABEL[recommendation.status]}
                            </span>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                            {recommendation.status === 'in_progress'
                                ? "You're already working on this — keep the momentum going!"
                                : "Start here to build on what you know before tackling harder topics."}
                        </p>
                    </div>
                    {onStartStudying && (
                        <button
                            onClick={() => onStartStudying(recommendation)}
                            style={{
                                padding: '8px 18px', background: '#2563EB', color: '#fff',
                                border: 'none', borderRadius: '7px', fontWeight: 600,
                                fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            Study Now →
                        </button>
                    )}
                </div>
            ) : null}
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function containerStyle(bg: string, borderColor: string): React.CSSProperties {
    return {
        background: bg,
        border: `1.5px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
    };
}

function skeletonStyle(width: string): React.CSSProperties {
    return {
        width,
        height: '14px',
        borderRadius: '4px',
        background: 'linear-gradient(90deg, #dbeafe 25%, #bfdbfe 50%, #dbeafe 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
    };
}
