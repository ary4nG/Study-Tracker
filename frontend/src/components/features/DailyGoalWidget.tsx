import { useState } from 'react';
import { formatTime } from '../../utils/formatTime';
import type { DailyGoalState } from '../../hooks/useDailyGoal';

const PRESETS = [30, 60, 90, 120];

interface DailyGoalWidgetProps {
    state: DailyGoalState;
}

export default function DailyGoalWidget({ state }: DailyGoalWidgetProps) {
    const { goalMinutes, setGoal, todayMinutes, todaySeconds, pct, goalAchieved, loading } = state;
    const [editing, setEditing] = useState(goalMinutes === null); // open on first visit
    const [customInput, setCustomInput] = useState('');

    const handlePreset = (mins: number) => {
        setGoal(mins);
        setEditing(false);
        setCustomInput('');
    };

    const handleCustomSave = () => {
        const n = parseInt(customInput, 10);
        if (!isNaN(n) && n > 0) {
            setGoal(n);
            setEditing(false);
            setCustomInput('');
        }
    };

    const handleClearGoal = () => {
        setGoal(null);
        setEditing(true);
    };

    // ── No goal set yet ──────────────────────────────────────────────────────
    if (editing || goalMinutes === null) {
        return (
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>🎯 Set Daily Goal</span>
                    {goalMinutes !== null && (
                        <button onClick={() => setEditing(false)} style={textBtn}>Cancel</button>
                    )}
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b' }}>
                    How many minutes do you want to study today?
                </p>
                {/* Presets */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {PRESETS.map((mins) => (
                        <button key={mins} onClick={() => handlePreset(mins)} style={presetBtn}>
                            {mins} min
                        </button>
                    ))}
                </div>
                {/* Custom input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="number"
                        min="1"
                        max="480"
                        placeholder="Custom (min)"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSave()}
                        style={inputStyle}
                    />
                    <button onClick={handleCustomSave} disabled={!customInput} style={primaryBtn}>
                        Set
                    </button>
                </div>
            </div>
        );
    }

    // ── Goal achieved ────────────────────────────────────────────────────────
    if (goalAchieved) {
        return (
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#15803d' }}>
                        🎉 Daily Goal Achieved!
                    </span>
                    <button onClick={() => setEditing(true)} style={{ ...textBtn, color: '#15803d' }} title="Change goal">✏️</button>
                </div>
                {/* Overfill bar */}
                <div style={barTrack}>
                    <div style={{ ...barFill, width: '100%', background: '#22c55e', animation: 'goalPulse 2s ease-in-out infinite' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                        {formatTime(todaySeconds)} studied today
                    </span>
                    <span style={{ fontSize: '12px', color: '#16a34a' }}>
                        Goal: {goalMinutes} min ✅
                    </span>
                </div>
                <style>{`@keyframes goalPulse { 0%,100% { opacity:1 } 50% { opacity:0.7 } }`}</style>
            </div>
        );
    }

    // ── In progress ──────────────────────────────────────────────────────────
    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>🎯 Daily Goal</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {loading && <span style={{ fontSize: '11px', color: '#94a3b8' }}>updating…</span>}
                    <button onClick={() => setEditing(true)} style={textBtn} title="Change goal">✏️</button>
                    <button onClick={handleClearGoal} style={{ ...textBtn, fontSize: '11px' }} title="Remove goal">✕</button>
                </div>
            </div>

            {/* Progress bar */}
            <div style={barTrack}>
                <div style={{
                    ...barFill,
                    width: `${Math.min(pct, 100)}%`,
                    background: pct >= 75 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#2563EB',
                    transition: 'width 0.5s ease',
                }} />
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', color: '#475569' }}>
                    <strong style={{ color: '#1e293b' }}>{todayMinutes}</strong> / {goalMinutes} min
                </span>
                <span style={{ fontSize: '12px', color: pct >= 100 ? '#15803d' : '#64748b', fontWeight: 600 }}>
                    {Math.min(pct, 100)}%
                </span>
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: '10px', padding: '14px 16px',
    minWidth: '240px', maxWidth: '340px',
};
const barTrack: React.CSSProperties = {
    background: '#f1f5f9', borderRadius: '99px', height: '8px', overflow: 'hidden',
};
const barFill: React.CSSProperties = {
    height: '100%', borderRadius: '99px',
};
const presetBtn: React.CSSProperties = {
    padding: '6px 14px', background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: '99px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: '#1e293b',
};
const primaryBtn: React.CSSProperties = {
    padding: '7px 14px', background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
};
const inputStyle: React.CSSProperties = {
    flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px',
    fontSize: '13px', boxSizing: 'border-box',
};
const textBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '13px', color: '#94a3b8', padding: '0 2px',
};
