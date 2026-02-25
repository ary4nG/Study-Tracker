import { useState, useRef } from 'react';
import { parseSyllabus } from '../../utils/syllabusParser';
import { syllabusParser as syllabusApi } from '../../services/api';
import type { Topic } from '../../types';

interface SyllabusImporterProps {
    subjectId: number;
    subjectName: string;
    onSaved: (topics: Topic[]) => void;
    onCancel: () => void;
}

type Mode = 'ai' | 'manual';
type Step = 'input' | 'preview';

interface AiTopic { name: string; difficulty: 'easy' | 'medium' | 'hard'; }

const DIFFICULTY_COLORS: Record<AiTopic['difficulty'], { bg: string; text: string; label: string }> = {
    easy: { bg: '#dcfce7', text: '#15803d', label: 'Easy' },
    medium: { bg: '#fef9c3', text: '#92400e', label: 'Medium' },
    hard: { bg: '#fee2e2', text: '#b91c1c', label: 'Hard' },
};

export default function SyllabusImporter({ subjectId, subjectName, onSaved, onCancel }: SyllabusImporterProps) {
    const [mode, setMode] = useState<Mode>('ai');
    const [step, setStep] = useState<Step>('input');

    // AI mode state
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [aiTopics, setAiTopics] = useState<AiTopic[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual mode state
    const [rawText, setRawText] = useState('');
    const [manualTopics, setManualTopics] = useState<string[]>([]);

    // Shared
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ── File helpers ──────────────────────────────────────────────────────────

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped?.type === 'application/pdf') { setFile(dropped); setError(''); }
        else setError('Only PDF files are supported.');
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0] ?? null;
        if (picked?.type === 'application/pdf') { setFile(picked); setError(''); }
        else if (picked) setError('Only PDF files are supported.');
    };

    // ── AI parse ─────────────────────────────────────────────────────────────

    const handleAiParse = async () => {
        if (!file) return;
        setParsing(true);
        setError('');
        try {
            const res = await syllabusApi.aiParse(subjectId, file);
            const topics: AiTopic[] = (res.data as Topic[]).map(t => ({
                name: t.name,
                difficulty: t.difficulty ?? 'medium',
            }));
            if (topics.length === 0) { setError('AI could not extract any topics. Try a different file.'); return; }
            setAiTopics(topics);
            setStep('preview');
        } catch (err: any) {
            const msg = err?.response?.data?.error ?? 'AI parsing failed. Please try again.';
            setError(msg);
        } finally {
            setParsing(false);
        }
    };

    // ── Manual parse ──────────────────────────────────────────────────────────

    const handleManualParse = () => {
        const parsed = parseSyllabus(rawText);
        if (parsed.length === 0) { setError('No topics found. Use bullet points or numbered lists.'); return; }
        setError('');
        setManualTopics(parsed);
        setStep('preview');
    };

    // ── Save ─────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            if (mode === 'ai') {
                // Topics are already created by the backend during AI parse — just return them
                const savedTopics: Topic[] = aiTopics.map((t, i) => ({
                    id: i, // placeholder; parent will refetch
                    subject: subjectId,
                    name: t.name,
                    status: 'not_started',
                    difficulty: t.difficulty,
                    created_at: '',
                    updated_at: '',
                }));
                onSaved(savedTopics);
            } else {
                const valid = manualTopics.filter(t => t.trim().length > 0);
                if (valid.length === 0) { setError('Add at least one topic.'); setSaving(false); return; }
                const res = await syllabusApi.save(subjectId, valid);
                onSaved(res.data as Topic[]);
            }
        } catch {
            setError('Failed to save topics. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const resetAll = () => {
        setStep('input');
        setFile(null);
        setAiTopics([]);
        setRawText('');
        setManualTopics([]);
        setError('');
    };

    return (
        <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onCancel()}>
            <div style={modalStyle}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Import Syllabus</h2>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>{subjectName}</p>
                    </div>
                    <button onClick={onCancel} style={closeBtn}>✕</button>
                </div>

                {/* Mode Tabs — only on input step */}
                {step === 'input' && (
                    <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        {(['ai', 'manual'] as Mode[]).map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(''); }}
                                style={{
                                    flex: 1, padding: '9px 0', fontSize: '13px', fontWeight: mode === m ? 700 : 400,
                                    border: 'none', cursor: 'pointer',
                                    background: mode === m ? '#2563EB' : '#f8fafc',
                                    color: mode === m ? '#fff' : '#64748b',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {m === 'ai' ? '✨ AI Upload (PDF)' : '✏️ Paste Text'}
                            </button>
                        ))}
                    </div>
                )}

                {error && (
                    <p style={{ color: '#dc2626', fontSize: '13px', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                        {error}
                    </p>
                )}

                {/* ── AI MODE — Input ── */}
                {mode === 'ai' && step === 'input' && (
                    <>
                        <div
                            style={{
                                border: `2px dashed ${dragOver ? '#2563EB' : file ? '#22c55e' : '#e2e8f0'}`,
                                borderRadius: '10px',
                                padding: '36px 20px',
                                textAlign: 'center',
                                background: dragOver ? '#eff6ff' : file ? '#f0fdf4' : '#f8fafc',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                marginBottom: '16px',
                            }}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>{file ? '✅' : '📄'}</div>
                            {file ? (
                                <>
                                    <p style={{ margin: 0, fontWeight: 600, color: '#15803d', fontSize: '14px' }}>{file.name}</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                                        {(file.size / 1024).toFixed(0)} KB — click to change
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>Drop your syllabus PDF here</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>or click to browse</p>
                                </>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileInput} />

                        <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#1d4ed8' }}>
                            ✨ <strong>AI-powered:</strong> Extracts topics automatically and estimates difficulty (Easy / Medium / Hard) using LLaMA-3.1.
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
                            <button
                                onClick={handleAiParse}
                                disabled={!file || parsing}
                                style={{ ...primaryBtnStyle, opacity: !file || parsing ? 0.6 : 1, minWidth: '140px' }}
                            >
                                {parsing ? '⏳ Analysing…' : '✨ Parse with AI'}
                            </button>
                        </div>
                    </>
                )}

                {/* ── MANUAL MODE — Input ── */}
                {mode === 'manual' && step === 'input' && (
                    <>
                        <label style={labelStyle}>Paste your syllabus below</label>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                            Works with bullet lists (•, -, *), numbered lists (1., 1), and plain text.
                        </p>
                        <textarea
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                            placeholder={`Example:\n• Introduction to Calculus\n• Derivatives and Integrals\n1. Linear Algebra\n2. Matrix Operations`}
                            rows={10}
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                            <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
                            <button onClick={handleManualParse} disabled={!rawText.trim()} style={primaryBtnStyle}>
                                Parse Topics →
                            </button>
                        </div>
                    </>
                )}

                {/* ── AI MODE — Preview ── */}
                {mode === 'ai' && step === 'preview' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                <strong style={{ color: '#1e293b' }}>{aiTopics.length}</strong> topics extracted by AI
                            </p>
                            <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                                {(['easy', 'medium', 'hard'] as AiTopic['difficulty'][]).map(d => (
                                    <span key={d} style={{ padding: '2px 8px', borderRadius: '99px', background: DIFFICULTY_COLORS[d].bg, color: DIFFICULTY_COLORS[d].text, fontWeight: 600 }}>
                                        {DIFFICULTY_COLORS[d].label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            {aiTopics.map((topic, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '9px 12px',
                                    borderBottom: i < aiTopics.length - 1 ? '1px solid #f1f5f9' : 'none',
                                }}>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', minWidth: '20px' }}>{i + 1}</span>
                                    <span style={{ flex: 1, fontSize: '14px', color: '#1e293b' }}>{topic.name}</span>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                                        background: DIFFICULTY_COLORS[topic.difficulty].bg,
                                        color: DIFFICULTY_COLORS[topic.difficulty].text,
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {DIFFICULTY_COLORS[topic.difficulty].label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
                            Topics were already saved. Click confirm to update the subject view.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                            <button onClick={resetAll} style={cancelBtnStyle}>← Start Over</button>
                            <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
                                {saving ? 'Saving…' : `✓ Confirm ${aiTopics.length} Topics`}
                            </button>
                        </div>
                    </>
                )}

                {/* ── MANUAL MODE — Preview ── */}
                {mode === 'manual' && step === 'preview' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                <strong style={{ color: '#1e293b' }}>{manualTopics.length}</strong> topics extracted — edit or remove as needed
                            </p>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            {manualTopics.map((topic, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 10px',
                                    borderBottom: i < manualTopics.length - 1 ? '1px solid #f1f5f9' : 'none',
                                }}>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', minWidth: '20px' }}>{i + 1}</span>
                                    <input
                                        value={topic}
                                        onChange={e => setManualTopics(prev => prev.map((t, j) => j === i ? e.target.value : t))}
                                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#1e293b', background: 'transparent' }}
                                    />
                                    <button
                                        onClick={() => setManualTopics(prev => prev.filter((_, j) => j !== i))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', padding: '0 4px' }}
                                    >×</button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                            <button onClick={() => setStep('input')} style={cancelBtnStyle}>← Back</button>
                            <button onClick={handleSave} disabled={saving || manualTopics.length === 0} style={primaryBtnStyle}>
                                {saving ? 'Saving…' : `Save ${manualTopics.length} Topics`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
};
const modalStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px', padding: '28px',
    width: '100%', maxWidth: '540px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
    maxHeight: '90vh', overflowY: 'auto',
};
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px',
};
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '6px',
    fontSize: '14px', marginBottom: '14px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
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
