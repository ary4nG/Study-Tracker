import { useState } from 'react';
import { parseSyllabus } from '../../utils/syllabusParser';
import { syllabusParser as syllabusApi } from '../../services/api';
import type { Topic } from '../../types';

interface SyllabusImporterProps {
    subjectId: number;
    subjectName: string;
    onSaved: (topics: Topic[]) => void;
    onCancel: () => void;
}

type Step = 'paste' | 'preview';

export default function SyllabusImporter({
    subjectId,
    subjectName,
    onSaved,
    onCancel,
}: SyllabusImporterProps) {
    const [step, setStep] = useState<Step>('paste');
    const [rawText, setRawText] = useState('');
    const [topics, setTopics] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleParse = () => {
        const parsed = parseSyllabus(rawText);
        if (parsed.length === 0) {
            setError('No topics found. Make sure your syllabus has bullet points or numbered items.');
            return;
        }
        setError('');
        setTopics(parsed);
        setStep('preview');
    };

    const handleTopicChange = (index: number, value: string) => {
        setTopics((prev) => prev.map((t, i) => (i === index ? value : t)));
    };

    const handleRemoveTopic = (index: number) => {
        setTopics((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        const valid = topics.filter((t) => t.trim().length > 0);
        if (valid.length === 0) { setError('Add at least one topic.'); return; }

        setSaving(true);
        setError('');
        try {
            const res = await syllabusApi.save(subjectId, valid);
            onSaved(res.data as Topic[]);
        } catch {
            setError('Failed to save topics. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onCancel()}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                            Import Syllabus
                        </h2>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                            {subjectName}
                        </p>
                    </div>
                    <button onClick={onCancel} style={closeBtn}>✕</button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    {(['paste', 'preview'] as Step[]).map((s, i) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: step === s ? '#2563EB' : (i < (['paste', 'preview'] as Step[]).indexOf(step) ? '#22c55e' : '#e2e8f0'),
                                color: step === s || i < (['paste', 'preview'] as Step[]).indexOf(step) ? '#fff' : '#94a3b8',
                                fontSize: '12px', fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {i < (['paste', 'preview'] as Step[]).indexOf(step) ? '✓' : i + 1}
                            </span>
                            <span style={{ fontSize: '13px', color: step === s ? '#1e293b' : '#94a3b8', fontWeight: step === s ? 600 : 400 }}>
                                {s === 'paste' ? 'Paste Text' : 'Review & Save'}
                            </span>
                            {i < 1 && <span style={{ color: '#e2e8f0', margin: '0 4px' }}>›</span>}
                        </div>
                    ))}
                </div>

                {error && (
                    <p style={{ color: '#dc2626', fontSize: '13px', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                        {error}
                    </p>
                )}

                {/* ── Step 1: Paste ── */}
                {step === 'paste' && (
                    <>
                        <label style={labelStyle}>Paste your syllabus below</label>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                            Works with bullet lists (•, -, *), numbered lists (1., 1), and plain text.
                        </p>
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder={`Example:\n• Introduction to Calculus\n• Derivatives and Integrals\n1. Linear Algebra\n2. Matrix Operations`}
                            rows={10}
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                            <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
                            <button onClick={handleParse} disabled={!rawText.trim()} style={primaryBtnStyle}>
                                Parse Topics →
                            </button>
                        </div>
                    </>
                )}

                {/* ── Step 2: Preview & Edit ── */}
                {step === 'preview' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                <strong style={{ color: '#1e293b' }}>{topics.length}</strong> topics extracted — edit or remove as needed
                            </p>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            {topics.map((topic, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 10px',
                                    borderBottom: i < topics.length - 1 ? '1px solid #f1f5f9' : 'none',
                                }}>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', minWidth: '20px' }}>{i + 1}</span>
                                    <input
                                        value={topic}
                                        onChange={(e) => handleTopicChange(i, e.target.value)}
                                        style={{
                                            flex: 1, border: 'none', outline: 'none',
                                            fontSize: '14px', color: '#1e293b', background: 'transparent',
                                        }}
                                    />
                                    <button
                                        onClick={() => handleRemoveTopic(i)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', padding: '0 4px' }}
                                        title="Remove"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                            <button onClick={() => setStep('paste')} style={cancelBtnStyle}>← Back</button>
                            <button onClick={handleSave} disabled={saving || topics.length === 0} style={primaryBtnStyle}>
                                {saving ? 'Saving…' : `Save ${topics.length} Topics`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
};
const modalStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px',
    padding: '28px', width: '100%', maxWidth: '520px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
    maxHeight: '90vh', overflowY: 'auto',
};
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px',
};
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #e2e8f0', borderRadius: '6px',
    fontSize: '14px', marginBottom: '14px',
    boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
};
const primaryBtnStyle: React.CSSProperties = {
    padding: '9px 20px', background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};
const cancelBtnStyle: React.CSSProperties = {
    padding: '9px 20px', background: 'transparent', color: '#64748b',
    border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '14px', cursor: 'pointer',
};
const closeBtn: React.CSSProperties = {
    background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8',
};
