import { useState } from 'react';
import type { Subject } from '../../types';
import { subjects as subjectsApi } from '../../services/api';

interface SubjectCardProps {
    subject: Subject;
    onUpdated: (subject: Subject) => void;
    onDeleted: (id: number) => void;
}

export default function SubjectCard({ subject, onUpdated, onDeleted }: SubjectCardProps) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(subject.name);
    const [description, setDescription] = useState(subject.description);
    const [color, setColor] = useState(subject.color);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const res = await subjectsApi.update(subject.id, { name, description, color });
            onUpdated(res.data as Subject);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${subject.name}"? This will also remove all its topics.`)) return;
        await subjectsApi.remove(subject.id);
        onDeleted(subject.id);
    };

    if (editing) {
        return (
            <div style={cardStyle}>
                <div style={{ width: '4px', background: color, borderRadius: '4px 0 0 4px', position: 'absolute', top: 0, left: 0, bottom: 0 }} />
                <div style={{ paddingLeft: '12px' }}>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Subject name"
                        style={inputStyle}
                        autoFocus
                    />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <label style={{ fontSize: '13px', color: '#64748b' }}>Color:</label>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            style={{ width: '36px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        />
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{color}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(false)} style={ghostBtnStyle}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...cardStyle, position: 'relative' }}>
            <div style={{ width: '4px', background: subject.color, borderRadius: '4px 0 0 4px', position: 'absolute', top: 0, left: 0, bottom: 0 }} />
            <div style={{ paddingLeft: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                        {subject.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                        <button onClick={() => setEditing(true)} style={iconBtnStyle} title="Edit">✏️</button>
                        <button onClick={handleDelete} style={iconBtnStyle} title="Delete">🗑️</button>
                    </div>
                </div>
                {subject.description && (
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {subject.description}
                    </p>
                )}
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {subject.topic_count} {subject.topic_count === 1 ? 'topic' : 'topics'}
                </span>
            </div>
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '8px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
};

const primaryBtnStyle: React.CSSProperties = {
    padding: '7px 16px',
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
};

const ghostBtnStyle: React.CSSProperties = {
    padding: '7px 16px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
};

const iconBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px',
    lineHeight: 1,
};
