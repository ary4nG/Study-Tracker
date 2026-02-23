import { useEffect, useRef } from 'react';

export interface BarItem {
    label: string;
    count: number;
    color: string;
}

interface MasteredBarChartProps {
    bars: BarItem[];
}

export default function MasteredBarChart({ bars }: MasteredBarChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Trigger CSS transitions after first render
    useEffect(() => {
        const els = containerRef.current?.querySelectorAll<HTMLDivElement>('.bar-fill');
        els?.forEach((el) => {
            el.style.width = el.dataset.target ?? '0%';
        });
    }, [bars]);

    const maxCount = Math.max(...bars.map((b) => b.count), 1);
    const total = bars.reduce((a, b) => a + b.count, 0);

    // ── No data ──────────────────────────────────────────────────────────────
    if (total === 0) {
        return (
            <div style={emptyStyle}>
                <p style={{ fontSize: '24px', margin: '0 0 6px' }}>🎯</p>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No topics mastered this week</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bars.filter((b) => b.count > 0).map((b, i) => {
                const pct = Math.round((b.count / maxCount) * 100);
                return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Subject name */}
                        <span style={{
                            fontSize: '12px', color: '#475569', textAlign: 'right',
                            minWidth: '80px', maxWidth: '80px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {b.label}
                        </span>

                        {/* Bar track */}
                        <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                            <div
                                className="bar-fill"
                                data-target={`${pct}%`}
                                style={{
                                    width: '0%',           // start at 0, JS sets to target
                                    background: b.color,
                                    height: '100%',
                                    borderRadius: '99px',
                                    transition: 'width 0.6s ease',
                                }}
                            />
                        </div>

                        {/* Count */}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', minWidth: '18px' }}>
                            {b.count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

const emptyStyle: React.CSSProperties = {
    textAlign: 'center', padding: '20px',
    background: '#f8fafc', borderRadius: '8px',
};
