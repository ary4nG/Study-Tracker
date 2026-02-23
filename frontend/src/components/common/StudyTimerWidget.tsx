import { useState } from 'react';
import { useTimer } from '../../context/TimerContext';
import { formatTime } from '../../utils/formatTime';
import EndSessionModal from '../features/EndSessionModal';

export default function StudyTimerWidget() {
    const { elapsed, isRunning, startTime, start, pause, reset } = useTimer();
    const [showEndModal, setShowEndModal] = useState(false);

    const hasStarted = elapsed > 0 || isRunning;

    const handleEndClick = () => {
        if (isRunning) pause(); // auto-pause before showing modal
        setShowEndModal(true);
    };

    const handleSessionSaved = () => {
        setShowEndModal(false);
        reset();
    };

    const handleModalCancel = () => {
        setShowEndModal(false);
        // Resume if it was running before user opened modal
        if (elapsed > 0) start();
    };

    // ── Pre-start: inline button shown in page headers ──────────────────────
    if (!hasStarted) {
        return (
            <button onClick={start} style={startBtnStyle}>
                ▶ Study
            </button>
        );
    }

    // ── Active: floating pill fixed at bottom-right ──────────────────────────
    return (
        <>
            <div style={pillStyle}>
                <span style={{ fontSize: '13px' }}>⏱</span>
                <span style={timeStyle}>{formatTime(elapsed)}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>|</span>

                <button
                    onClick={isRunning ? pause : start}
                    style={controlBtnStyle}
                    title={isRunning ? 'Pause' : 'Resume'}
                >
                    {isRunning ? '⏸ Pause' : '▶ Resume'}
                </button>

                <button onClick={handleEndClick} style={endBtnStyle}>
                    ✓ End Session
                </button>
            </div>

            {showEndModal && (
                <EndSessionModal
                    elapsed={elapsed}
                    startTime={startTime}
                    onSaved={handleSessionSaved}
                    onCancel={handleModalCancel}
                />
            )}
        </>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const startBtnStyle: React.CSSProperties = {
    padding: '7px 14px',
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

const pillStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, #1e3a8a, #2563EB)',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '50px',
    boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
    zIndex: 100,
    userSelect: 'none',
};

const timeStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
    minWidth: '70px',
    textAlign: 'center',
};

const controlBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    borderRadius: '20px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

const endBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.9)',
    border: 'none',
    color: '#1e3a8a',
    borderRadius: '20px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};
