import type { StreakState } from '../../hooks/useStreak';

interface StreakWidgetProps {
    state: StreakState;
}

export default function StreakWidget({ state }: StreakWidgetProps) {
    const { streak, studiedToday, loading } = state;

    if (loading) {
        return (
            <div style={cardStyle}>
                <div style={{ width: '80px', height: '40px', background: '#f1f5f9', borderRadius: '6px' }} />
            </div>
        );
    }

    // ── No streak yet ────────────────────────────────────────────────────────
    if (streak === 0) {
        return (
            <div style={cardStyle}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>🔥</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>No streak yet</div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>Study today to start one!</div>
            </div>
        );
    }

    // ── Active streak ────────────────────────────────────────────────────────
    const isFirePulse = streak >= 3 && studiedToday;

    return (
        <div style={{
            ...cardStyle,
            background: studiedToday
                ? 'linear-gradient(135deg, #fff7ed, #fef3c7)'
                : '#fff',
            border: studiedToday ? '1px solid #fcd34d' : '1px solid #e2e8f0',
        }}>
            {/* Flame + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{
                    fontSize: '26px',
                    display: 'inline-block',
                    animation: isFirePulse ? 'flamePulse 1.5s ease-in-out infinite' : 'none',
                }}>
                    🔥
                </span>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                    {streak}
                </span>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                {streak === 1 ? 'day streak' : 'day streak'}
            </div>

            {/* Status line */}
            {studiedToday ? (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#d97706', fontWeight: 600 }}>
                    ✅ Studied today
                </div>
            ) : (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                    ⏰ Study today to keep it!
                </div>
            )}

            <style>{`
        @keyframes flamePulse {
          0%, 100% { transform: scale(1) rotate(-3deg); }
          50%       { transform: scale(1.15) rotate(3deg); }
        }
      `}</style>
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px 16px',
    minWidth: '130px',
    maxWidth: '180px',
};
