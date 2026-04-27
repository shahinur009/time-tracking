import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

const SHOW_OPTIONS = [
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'all', label: 'All' },
];

function TeammatesDropdown({ users = [], selectedId, onSelect }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [show, setShow] = useState('active');
    const [showOpen, setShowOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        function handler(e) {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) {
                setOpen(false);
                setShowOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return users
            .filter((u) => {
                const isActive = (u.status || 'active') === 'active';
                if (show === 'active') return isActive;
                if (show === 'inactive') return !isActive;
                return true;
            })
            .filter((u) => {
                if (!q) return true;
                return (
                    (u.name || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q)
                );
            });
    }, [users, query, show]);

    const showLabel = SHOW_OPTIONS.find((o) => o.key === show)?.label;

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                style={{
                    height: 36,
                    padding: '0 14px',
                    background: '#fff',
                    border: '1px solid #d8dde3',
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    color: '#374151',
                }}
            >
                Teammates
                <ChevronDown size={12} color="#6b7280" />
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        width: 280,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        zIndex: 1000,
                        padding: 10,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            border: '1px solid #d8dde3',
                            borderRadius: 4,
                            padding: '6px 10px',
                        }}
                    >
                        <Search size={14} color="#9ca3af" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search teammates"
                            style={{
                                border: 'none',
                                outline: 'none',
                                flex: 1,
                                fontSize: 13,
                                background: 'transparent',
                            }}
                        />
                    </div>

                    <div style={{ marginTop: 10, position: 'relative' }}>
                        <div
                            onClick={() => setShowOpen((v) => !v)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 4px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f0f0f0',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#9ca3af',
                                    letterSpacing: 0.5,
                                }}
                            >
                                SHOW
                            </span>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    gap: 4,
                                    color: '#374151',
                                    fontSize: 13,
                                    alignItems: 'center',
                                }}
                            >
                                {showLabel}
                                <ChevronDown size={12} />
                            </span>
                        </div>
                        {showOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 4,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    zIndex: 5,
                                }}
                            >
                                {SHOW_OPTIONS.map((opt) => (
                                    <div
                                        key={opt.key}
                                        onClick={() => {
                                            setShow(opt.key);
                                            setShowOpen(false);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            background: show === opt.key ? '#f3f4f6' : '#fff',
                                            fontSize: 13,
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 4, maxHeight: 240, overflow: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div
                                style={{
                                    padding: 12,
                                    color: '#9ca3af',
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}
                            >
                                No teammates found
                            </div>
                        ) : (
                            filtered.map((u) => {
                                const isSelected = u._id === selectedId;
                                const isActive = (u.status || 'active') === 'active';
                                const baseBg = isSelected ? '#f3f4f6' : 'transparent';
                                return (
                                    <div
                                        key={u._id}
                                        onClick={() => {
                                            onSelect?.(u._id);
                                            setOpen(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 6px',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            color: isActive ? '#1f2937' : '#9ca3af',
                                            background: baseBg,
                                            borderRadius: 4,
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.background = '#f5f5f5')
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.background = baseBg)
                                        }
                                    >
                                        <span>{u.name || u.email}</span>
                                        {isActive && <Check size={14} color="#22c55e" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeammatesDropdown;
