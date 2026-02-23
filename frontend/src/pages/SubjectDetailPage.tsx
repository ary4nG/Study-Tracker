import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { subjects as subjectsApi, topics as topicsApi } from '../services/api';
import type { Subject, Topic } from '../types';
import SyllabusImporter from '../components/features/SyllabusImporter';
import StudyTimerWidget from '../components/common/StudyTimerWidget';
import { cycleStatus, statusColor, nextStatusLabel } from '../utils/cycleStatus';

export default function SubjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const subjectId = Number(id);

    const [subject, setSubject] = useState<Subject | null>(null);
    const [topicList, setTopicList] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [showImporter, setShowImporter] = useState(false);
    const [addingTopic, setAddingTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            subjectsApi.get(subjectId),
            topicsApi.list(subjectId),
        ])
            .then(([subRes, topRes]) => {
                setSubject(subRes.data as Subject);
                const data = topRes.data;
                setTopicList(Array.isArray(data) ? data : data.results ?? []);
            })
            .catch(() => navigate('/dashboard'))
            .finally(() => setLoading(false));
    }, [subjectId, navigate]);

    // ── Status cycle (optimistic update) ───────────────────────────────────────
    const handleStatusClick = async (topic: Topic) => {
        const next = cycleStatus(topic.status);
        // 1. Update UI instantly
        setTopicList((prev) => prev.map((t) => t.id === topic.id ? { ...t, status: next } : t));
        try {
            // 2. Persist
            await topicsApi.update(topic.id, { status: next });
        } catch {
            // 3. Revert on failure
            setTopicList((prev) => prev.map((t) => t.id === topic.id ? { ...t, status: topic.status } : t));
        }
    };

    // ── Add topic ──────────────────────────────────────────────────────────────
    const handleAddTopic = async () => {
        if (!newTopicName.trim()) return;
        setSaving(true);
        try {
            const res = await topicsApi.create(subjectId, newTopicName.trim());
            setTopicList((prev) => [...prev, res.data as Topic]);
            setNewTopicName('');
            setAddingTopic(false);
        } finally {
            setSaving(false);
        }
    };

    // ── Edit topic ─────────────────────────────────────────────────────────────
    const startEdit = (topic: Topic) => {
        setEditingId(topic.id);
        setEditingName(topic.name);
    };

    const handleSaveEdit = async (topicId: number) => {
        if (!editingName.trim()) return;
        setSaving(true);
        try {
            const res = await topicsApi.update(topicId, { name: editingName.trim() });
            setTopicList((prev) =>
                prev.map((t) => (t.id === topicId ? (res.data as Topic) : t))
            );
            setEditingId(null);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete topic ───────────────────────────────────────────────────────────
    const handleDelete = async (topic: Topic) => {
        if (!window.confirm(`Delete "${topic.name}"?`)) return;
        await topicsApi.remove(topic.id);
        setTopicList((prev) => prev.filter((t) => t.id !== topic.id));
    };

    // ── Syllabus importer callback ─────────────────────────────────────────────
    const handleSyllabusImported = (imported: Topic[]) => {
        setTopicList((prev) => [...prev, ...imported]);
        setShowImporter(false);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p style={{ color: '#64748b' }}>Loading…</p>
            </div>
        );
    }

    const colorBar = subject?.color ?? '#2563EB';
    const total = topicList.length;
    const mastered = topicList.filter((t) => t.status === 'mastered').length;
    const inProgress = topicList.filter((t) => t.status === 'in_progress').length;
    const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
            {/* Color header bar */}
            <div style={{ height: '6px', background: colorBar }} />

            {/* Nav */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link to="/dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
                            My Subjects
                        </Link>
                        <span style={{ color: '#cbd5e1' }}>›</span>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{subject?.name}</span>
                    </div>
                    <StudyTimerWidget />
                </div>
            </div>

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
                            {subject?.name}
                        </h1>
                        {subject?.description && (
                            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{subject.description}</p>
                        )}
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                            {total} {total === 1 ? 'topic' : 'topics'}
                            {inProgress > 0 && <span style={{ marginLeft: '8px', color: '#f59e0b' }}>· {inProgress} in progress</span>}
                        </p>

                        {/* Progress bar — only show when there are topics */}
                        {total > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Mastery Progress</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: mastered === total ? '#22c55e' : '#1e293b' }}>
                                        {mastered} / {total} mastered ({pct}%)
                                    </span>
                                </div>
                                <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '7px', overflow: 'hidden', maxWidth: '320px' }}>
                                    <div style={{
                                        width: `${pct}%`,
                                        background: mastered === total ? '#22c55e' : 'linear-gradient(90deg, #2563EB, #22c55e)',
                                        height: '100%',
                                        borderRadius: '99px',
                                        transition: 'width 0.4s ease',
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px', flexShrink: 0 }}>
                        <button onClick={() => setShowImporter(true)} style={ghostBtn}>
                            📥 Import Syllabus
                        </button>
                        <button onClick={() => setAddingTopic(true)} style={primaryBtn}>
                            + Add Topic
                        </button>
                    </div>
                </div>

                {/* Add topic form */}
                {addingTopic && (
                    <div style={cardStyle({ borderColor: '#2563EB' })}>
                        <input
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic(); if (e.key === 'Escape') setAddingTopic(false); }}
                            placeholder="Topic name (e.g. Derivatives & Integrals)"
                            style={inputStyle}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button onClick={handleAddTopic} disabled={saving || !newTopicName.trim()} style={primaryBtn}>
                                {saving ? 'Adding…' : 'Add'}
                            </button>
                            <button onClick={() => setAddingTopic(false)} style={ghostBtn}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {topicList.length === 0 && !addingTopic && (
                    <div style={{ textAlign: 'center', padding: '64px 32px', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                        <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📖</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>No topics yet</p>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>
                            Add topics manually or import your syllabus
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setAddingTopic(true)} style={primaryBtn}>+ Add Topic</button>
                            <button onClick={() => setShowImporter(true)} style={ghostBtn}>📥 Import Syllabus</button>
                        </div>
                    </div>
                )}

                {/* Topic list */}
                {topicList.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        {topicList.map((topic, index) => (
                            <div
                                key={topic.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '13px 16px',
                                    borderBottom: index < topicList.length - 1 ? '1px solid #f1f5f9' : 'none',
                                    background: editingId === topic.id ? '#f8fafc' : '#fff',
                                }}
                            >
                                {/* Index number */}
                                <span style={{ fontSize: '13px', color: '#cbd5e1', minWidth: '24px', textAlign: 'right' }}>
                                    {index + 1}
                                </span>

                                {/* Clickable status dot */}
                                <span
                                    onClick={() => handleStatusClick(topic)}
                                    title={`${topic.status.replace('_', ' ')} → click to mark as ${nextStatusLabel(topic.status)}`}
                                    style={{
                                        width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                                        background: statusColor(topic.status),
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s, box-shadow 0.15s',
                                        display: 'inline-block',
                                        boxShadow: '0 0 0 0px rgba(34,197,94,0)',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.35)';
                                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${statusColor(topic.status)}33`;
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0px rgba(34,197,94,0)';
                                    }}
                                />

                                {/* Name / inline edit */}
                                {editingId === topic.id ? (
                                    <input
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(topic.id); if (e.key === 'Escape') setEditingId(null); }}
                                        style={{ ...inputStyle, margin: 0, flex: 1 }}
                                        autoFocus
                                    />
                                ) : (
                                    <span style={{
                                        flex: 1, fontSize: '14px',
                                        color: topic.status === 'mastered' ? '#86efac' : '#1e293b',
                                        textDecoration: topic.status === 'mastered' ? 'line-through' : 'none',
                                        transition: 'color 0.2s, text-decoration 0.2s',
                                    }}>
                                        {topic.name}
                                    </span>
                                )}

                                {/* Status badge */}
                                {editingId !== topic.id && topic.status !== 'not_started' && (
                                    <span style={{
                                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                                        background: topic.status === 'mastered' ? '#dcfce7' : '#fef9c3',
                                        color: topic.status === 'mastered' ? '#15803d' : '#92400e',
                                    }}>
                                        {topic.status === 'mastered' ? 'Mastered' : 'In Progress'}
                                    </span>
                                )}

                                {/* Edit / Delete actions */}
                                {editingId === topic.id ? (
                                    <>
                                        <button onClick={() => handleSaveEdit(topic.id)} disabled={saving} style={{ ...primaryBtn, padding: '5px 12px', fontSize: '13px' }}>
                                            Save
                                        </button>
                                        <button onClick={() => setEditingId(null)} style={{ ...ghostBtn, padding: '5px 12px', fontSize: '13px' }}>
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(topic)} style={iconBtn} title="Edit">✏️</button>
                                        <button onClick={() => handleDelete(topic)} style={iconBtn} title="Delete">🗑️</button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Legend */}
                {topicList.length > 0 && (
                    <p style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        Click the coloured dot to cycle status: ⬜ Not Started → 🟡 In Progress → 🟢 Mastered
                    </p>
                )}
            </main>

            {/* Syllabus Importer Modal */}
            {showImporter && subject && (
                <SyllabusImporter
                    subjectId={subject.id}
                    subjectName={subject.name}
                    onSaved={handleSyllabusImported}
                    onCancel={() => setShowImporter(false)}
                />
            )}
        </div>
    );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const cardStyle = ({ borderColor = '#e2e8f0' } = {}): React.CSSProperties => ({
    background: '#fff', border: `1px solid ${borderColor}`,
    borderRadius: '10px', padding: '16px', marginBottom: '16px',
});

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #e2e8f0', borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box',
    fontFamily: 'inherit', outline: 'none',
};

const primaryBtn: React.CSSProperties = {
    padding: '9px 16px', background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
    padding: '8px 14px', background: 'transparent', color: '#64748b',
    border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '14px', cursor: 'pointer',
};

const iconBtn: React.CSSProperties = {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: '14px', padding: '2px 4px',
};
