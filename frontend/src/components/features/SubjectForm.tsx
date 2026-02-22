import { useState } from 'react';
import type { Subject, SubjectFormData } from '../../types';
import { subjects as subjectsApi } from '../../services/api';

interface SubjectFormProps {
    onCreated: (subject: Subject) => void;
    onCancel: () => void;
}

export default function SubjectForm({ onCreated, onCancel }: SubjectFormProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#2563EB');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Name is required'); return; }

        setSaving(true);
        setError('');
        try {
            const payload: SubjectFormData = { name: name.trim(), description: description.trim(), color };
            const res = await subjectsApi.create(payload);
            onCreated(res.data as Subject);
        } catch {
            setError('Failed to create subject. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onCancel()}>
            <form onSubmit={handleSubmit} style={formStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Add Subject</h2>
                    <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

                <label style={labelStyle}>Subject Name *</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mathematics"
                    style={inputStyle}
                    autoFocus
                />

                <label style={labelStyle}>Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Calculus and Algebra for Semester 3"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />

                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ width: '44px', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', padding: '2px' }}
                    />
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: color, border: '1px solid #e2e8f0' }} />
                    <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{color}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
                    <button type="submit" disabled={saving} style={submitBtnStyle}>
                        {saving ? 'Creating…' : 'Create Subject'}
                    </button>
                </div>
            </form>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
};
const formStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    padding: '28px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
};
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '4px',
};
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
};
const submitBtnStyle: React.CSSProperties = {
    padding: '9px 20px',
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
};
const cancelBtnStyle: React.CSSProperties = {
    padding: '9px 20px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '7px',
    fontSize: '14px',
    cursor: 'pointer',
};
