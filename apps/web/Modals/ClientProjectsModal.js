import { useState } from 'react';
import { Modal } from 'antd';
import { Search, Star } from 'lucide-react';

function ClientProjectsModal({
    open,
    onClose,
    clientId,
    clientName,
    projects = [],
    currentUserId,
    onSelectProject,
    onCreateTask,
    onToggleFavorite,
}) {
    const [query, setQuery] = useState('');

    const filtered = projects
        .filter((p) => {
            const cid = p.clientId?._id || p.clientId || null;
            return clientId ? cid === clientId : !cid;
        })
        .filter((p) =>
            (p.name || '').toLowerCase().includes(query.trim().toLowerCase()),
        );

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title={clientName || 'No Client'}
            width={680}
            destroyOnClose
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '8px 12px',
                    marginBottom: 14,
                }}
            >
                <Search size={16} color="#9aa3af" />
                <input
                    autoFocus
                    type="text"
                    value={query}
                    placeholder="Search Project or Client"
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        border: 'none',
                        outline: 'none',
                        flex: 1,
                        fontSize: 14,
                        background: 'transparent',
                    }}
                />
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                    <div style={{ color: '#8c8c8c', padding: 12 }}>
                        No projects
                    </div>
                ) : (
                    filtered.map((p) => {
                        const favIds = (p.favoriteBy || []).map(
                            (u) => u._id || u,
                        );
                        const isFav =
                            !!currentUserId &&
                            favIds.some(
                                (id) =>
                                    String(id) === String(currentUserId),
                            );
                        return (
                            <div
                                key={p._id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '12px 6px',
                                    borderTop: '1px solid #f0f0f0',
                                    fontSize: 14,
                                }}
                            >
                                <span
                                    onClick={() => {
                                        onSelectProject?.(p);
                                        onClose();
                                    }}
                                    style={{
                                        flex: 1,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                        color: p.color || '#e91e63',
                                    }}
                                >
                                    {p.name}
                                </span>
                                <span
                                    onClick={() => onCreateTask?.(p)}
                                    style={{
                                        color: '#1677ff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                    }}
                                >
                                    Create task
                                </span>
                                <Star
                                    size={16}
                                    color={isFav ? '#f5a623' : '#bfbfbf'}
                                    fill={isFav ? '#f5a623' : 'none'}
                                    style={{
                                        cursor: 'pointer',
                                        transition:
                                            'color 150ms ease, fill 150ms ease',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavorite?.(p);
                                    }}
                                />
                            </div>
                        );
                    })
                )}
            </div>
        </Modal>
    );
}

export default ClientProjectsModal;
