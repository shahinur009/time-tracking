import { useState } from 'react';
import { Checkbox } from 'antd';
import { Search } from 'lucide-react';

function SearchablePicker({
    items = [],
    selected = [],
    onToggle,
    onCreate,
    placeholder = 'Add/Search',
    emptyTitle = 'No items yet',
    emptyHint = 'Start typing to create one.',
    allowCreate = true,
    width = 300,
}) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const filtered = items.filter((t) =>
        (t.name || '').toLowerCase().includes(q),
    );
    const exact = items.some(
        (t) => (t.name || '').toLowerCase() === q,
    );

    const submitCreate = () => {
        const name = query.trim();
        if (!name || exact || !onCreate) return;
        onCreate(name);
        setQuery('');
    };

    return (
        <div
            style={{
                width,
                padding: 16,
                background: '#fff',
                borderRadius: 8,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '8px 12px',
                    background: '#fff',
                    transition: 'border-color 180ms ease, box-shadow 180ms ease',
                }}
            >
                <Search size={16} color="#9aa3af" />
                <input
                    autoFocus
                    type="text"
                    value={query}
                    placeholder={placeholder}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCreate();
                    }}
                    style={{
                        border: 'none',
                        outline: 'none',
                        flex: 1,
                        fontSize: 14,
                        background: 'transparent',
                        color: '#333',
                    }}
                />
            </div>
            <div style={{ marginTop: 14 }}>
                {items.length === 0 ? (
                    <div style={{ padding: '6px 2px' }}>
                        <div
                            style={{
                                color: '#1f2937',
                                fontSize: 15,
                                fontWeight: 700,
                                marginBottom: 4,
                            }}
                        >
                            {emptyTitle}
                        </div>
                        <div style={{ color: '#9aa3af', fontSize: 13 }}>
                            {emptyHint}
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        style={{
                            padding: '10px 2px',
                            color: '#9aa3af',
                            fontSize: 13,
                        }}
                    >
                        No matches
                    </div>
                ) : (
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {filtered.map((t) => (
                            <label
                                key={t._id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '8px 6px',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    borderRadius: 4,
                                    transition: 'background 150ms ease',
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = '#f5f7fa')
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                        'transparent')
                                }
                            >
                                <Checkbox
                                    checked={selected.includes(t._id)}
                                    onChange={() => onToggle(t._id)}
                                />
                                <span style={{ color: '#333' }}>{t.name}</span>
                            </label>
                        ))}
                    </div>
                )}
                {allowCreate && onCreate && query.trim() && !exact && (
                    <div
                        onClick={submitCreate}
                        style={{
                            marginTop: 8,
                            padding: '8px 6px',
                            cursor: 'pointer',
                            color: '#1677ff',
                            fontSize: 14,
                            borderRadius: 4,
                            transition: 'background 150ms ease',
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.background = '#eaf4ff')
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.background = 'transparent')
                        }
                    >
                        + Create &quot;{query.trim()}&quot;
                    </div>
                )}
            </div>
        </div>
    );
}

export default SearchablePicker;
