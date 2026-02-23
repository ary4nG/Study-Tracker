import { useTimer } from '../../context/TimerContext';
import { formatTime } from '../../utils/formatTime';

/**
 * StudyTimerWidget
 *
 * Before timer starts: renders a "▶ Start Study Session" button
 * in the top-right area (rendered by the page headers that include it).
 *
 * After timer starts: renders a sticky floating pill fixed at
 * bottom-right corner of the viewport showing elapsed time and
 * Pause/Resume + End Session controls.
 */
export default function StudyTimerWidget() {
    const { elapsed, isRunning, start, pause, reset } = useTimer();

    const hasStarted = elapsed > 0 || isRunning;

    const handleEndSession = () => {
        // Story 2.2 will hook this properly. For now: confirm + reset.
        if (window.confirm(`End session? Duration: ${formatTime(elapsed)}\n\n(Session logging coming in Story 2.2)`)) {
            reset();
        }
    };

    // ── Pre-start: inline button shown in page headers ──────────────────────
    if (!hasStarted) {
        return (
            <button onClick={start} style={startBtnStyle}>
                ▶ Start Study Session
            </button>
        );
    }

    // ── Active: floating pill fixed at bottom-right ──────────────────────────
    return (
        <div style={pillStyle}>
            {/* Timer icon + elapsed */}
            <span style={{ fontSize: '13px' }}>⏱</span>
            <span style={timeStyle}>{formatTime(elapsed)}</span>

            {/* Divider */}
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>|</span>

            {/* Pause / Resume */}
            <button
                onClick={isRunning ? pause : start}
                style={controlBtnStyle}
                title={isRunning ? 'Pause' : 'Resume'}
            >
                {isRunning ? '⏸ Pause' : '▶ Resume'}
            </button>

            {/* End session */}
            <button onClick={handleEndSession} style={endBtnStyle}>
                ✓ End Session
            </button>
        </div>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const startBtnStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
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
    backdropFilter: 'blur(8px)',
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
