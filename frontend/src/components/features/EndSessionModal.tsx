import { useEffect, useState } from 'react';
import { subjects as subjectsApi, topics as topicsApi, sessions as sessionsApi } from '../../services/api';
import { formatTime } from '../../utils/formatTime';
import type { Subject, Topic } from '../../types';

interface EndSessionModalProps {
    elapsed: number;          // seconds from TimerContext
    startTime: Date | null;   // wall-clock start from TimerContext
    onSaved: () => void;      // called after save → triggers reset()
    onCancel: () => void;
}

export default function EndSessionModal({
    elapsed,
    startTime,
    onSaved,
    onCancel,
}: EndSessionModalProps) {
    const [subjectList, setSubjectList] = useState<Subject[]>([]);
    const [topicList, setTopicList] = useState<Topic[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [selectedTopicId, setSelectedTopicId] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Fetch subjects on mount
    useEffect(() => {
        subjectsApi.list().then((res) => {
            const data = res.data;
            setSubjectList(Array.isArray(data) ? data : data.results ?? []);
        });
    }, []);

    // Fetch topics when subject changes
    useEffect(() => {
        if (!selectedSubjectId) { setTopicList([]); return; }
        topicsApi.list(selectedSubjectId as number).then((res) => {
            const data = res.data;
            setTopicList(Array.isArray(data) ? data : data.results ?? []);
            setSelectedTopicId('');
        });
    }, [selectedSubjectId]);

    const handleSave = async () => {
        if (!selectedSubjectId) { setError('Please select a subject.'); return; }
        setSaving(true);
        setError('');
        try {
            const endTime = new Date();
            await sessionsApi.create({
                subject: selectedSubjectId as number,
                topic: selectedTopicId || null,
                start_time: (startTime ?? new Date(Date.now() - elapsed * 1000)).toISOString(),
                end_time: endTime.toISOString(),
                duration_seconds: elapsed,
                notes,
            });
            onSaved();
        } catch {
            setError('Failed to save session. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const isShort = elapsed < 60;

    return (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onCancel()}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                        End Study Session
                    </h2>
                    <button onClick={onCancel} style={closeBtn}>✕</button>
                </div>

                {/* Duration display */}
                <div style={durationBox}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Session Duration</span>
                    <span style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', letterSpacing: '0.05em' }}>
                        {formatTime(elapsed)}
                    </span>
                </div>

                {/* Short session warning */}
                {isShort && (
                    <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '6px', padding: '8px 12px', marginBottom: '14px', fontSize: '13px', color: '#854d0e' }}>
                        ⚠️ Session is under 1 minute — you can still save it.
                    </div>
                )}

                {error && (
                    <p style={{ color: '#dc2626', fontSize: '13px', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                        {error}
                    </p>
                )}

                {/* Subject */}
                <label style={labelStyle}>Subject *</label>
                <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : '')}
                    style={selectStyle}
                >
                    <option value="">— Select a subject —</option>
                    {subjectList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                {/* Topic */}
                <label style={labelStyle}>Topic <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value ? Number(e.target.value) : '')}
                    style={selectStyle}
                    disabled={!selectedSubjectId}
                >
                    <option value="">— No specific topic —</option>
                    {topicList.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                {/* Notes */}
                <label style={labelStyle}>Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What did you cover? Any blockers?"
                    rows={3}
                    style={{ ...selectStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: '20px' }}
                />

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onCancel} style={cancelBtn}>Cancel</button>
                    <button onClick={handleSave} disabled={saving || !selectedSubjectId} style={saveBtn}>
                        {saving ? 'Saving…' : '✓ Save Session'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
};
const modalStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px',
    padding: '28px', width: '100%', maxWidth: '440px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
};
const durationBox: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '4px', padding: '16px', background: '#f8fafc',
    borderRadius: '10px', marginBottom: '18px',
};
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#374151', marginBottom: '4px',
};
const selectStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #e2e8f0', borderRadius: '6px',
    fontSize: '14px', marginBottom: '14px',
    boxSizing: 'border-box', background: '#fff',
};
const saveBtn: React.CSSProperties = {
    padding: '9px 20px', background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: '7px', fontWeight: 600,
    fontSize: '14px', cursor: 'pointer',
};
const cancelBtn: React.CSSProperties = {
    padding: '9px 20px', background: 'transparent', color: '#64748b',
    border: '1px solid #e2e8f0', borderRadius: '7px',
    fontSize: '14px', cursor: 'pointer',
};
const closeBtn: React.CSSProperties = {
    background: 'none', border: 'none', fontSize: '18px',
    cursor: 'pointer', color: '#94a3b8',
};
