import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { subjects as subjectsApi, topics as topicsApi } from '../services/api';
import type { Subject, Topic } from '../types';
import SyllabusImporter from '../components/features/SyllabusImporter';

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

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
            {/* Color header bar */}
            <div style={{ height: '6px', background: colorBar }} />

            {/* Nav */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', height: '56px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link to="/dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
                        My Subjects
                    </Link>
                    <span style={{ color: '#cbd5e1' }}>›</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{subject?.name}</span>
                </div>
            </div>

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                    <div>
                        <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
                            {subject?.name}
                        </h1>
                        {subject?.description && (
                            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{subject.description}</p>
                        )}
                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                            {topicList.length} {topicList.length === 1 ? 'topic' : 'topics'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
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

                                {/* Status dot */}
                                <span
                                    title={topic.status}
                                    style={{
                                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                        background: topic.status === 'mastered' ? '#22c55e' : topic.status === 'in_progress' ? '#f59e0b' : '#e2e8f0',
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
                                    <span style={{ flex: 1, fontSize: '14px', color: '#1e293b' }}>{topic.name}</span>
                                )}

                                {/* Actions */}
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
