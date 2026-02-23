import { useState } from 'react';
import { formatTime } from '../../utils/formatTime';

export interface DonutSegment {
    label: string;
    seconds: number;
    color: string;
}

interface StudyTimeDonutChartProps {
    segments: DonutSegment[];
}

const SVG_SIZE = 160;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const RADIUS = 56;
const STROKE_WIDTH = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StudyTimeDonutChart({ segments }: StudyTimeDonutChartProps) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const total = segments.reduce((a, s) => a + s.seconds, 0);

    // ── No data state ─────────────────────────────────────────────────────────
    if (total === 0 || segments.length === 0) {
        return (
            <div style={wrapStyle}>
                <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
                    <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth={STROKE_WIDTH} />
                    <text x={CX} y={CY - 6} textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="600">
                        No sessions
                    </text>
                    <text x={CX} y={CY + 10} textAnchor="middle" fontSize="10" fill="#cbd5e1">
                        this week
                    </text>
                </svg>
            </div>
        );
    }

    // Build segments with cumulative offset
    let cumulativeFraction = 0;
    const svgSegments = segments.map((s, i) => {
        const fraction = s.seconds / total;
        const dash = fraction * CIRCUMFERENCE;
        const gap = CIRCUMFERENCE - dash;
        const offset = -(cumulativeFraction * CIRCUMFERENCE); // negative = clockwise from top
        cumulativeFraction += fraction;
        return { ...s, fraction, dash, gap, offset, idx: i };
    });

    const hovered = hoveredIdx !== null ? svgSegments[hoveredIdx] : null;
    const centreLabel = hovered
        ? formatTime(hovered.seconds)
        : formatTime(total);
    const centreSub = hovered
        ? `${Math.round(hovered.fraction * 100)}%`
        : 'total';

    return (
        <div style={wrapStyle}>
            <svg
                width={SVG_SIZE} height={SVG_SIZE}
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                style={{ overflow: 'visible' }}
            >
                {/* Track */}
                <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE_WIDTH} />

                {/* Segments */}
                {svgSegments.map((seg) => (
                    <circle
                        key={seg.idx}
                        cx={CX} cy={CY} r={RADIUS}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={hoveredIdx === seg.idx ? STROKE_WIDTH + 4 : STROKE_WIDTH}
                        strokeDasharray={`${seg.dash} ${seg.gap}`}
                        strokeDashoffset={seg.offset}
                        transform={`rotate(-90 ${CX} ${CY})`}
                        strokeLinecap="butt"
                        style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                        onMouseEnter={() => setHoveredIdx(seg.idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    />
                ))}

                {/* Centre text */}
                <text x={CX} y={CY - 7} textAnchor="middle" fontSize="14" fontWeight="800" fill="#1e293b">
                    {centreLabel}
                </text>
                <text x={CX} y={CY + 10} textAnchor="middle" fontSize="11" fill="#64748b">
                    {hovered ? hovered.label : centreSub}
                </text>
            </svg>

            {/* Legend */}
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {segments.map((s, i) => (
                    <div
                        key={i}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' }}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                            {formatTime(s.seconds)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const wrapStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center' };
