import { useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, ExternalLink, Star, Plus } from 'lucide-react';

function ProjectPicker({
    projects = [],
    clients = [],
    value,
    onChange,
    onCreateProject,
    onCreateTask,
    onToggleFavorite,
    onOpenClient,
    currentUserId,
}) {
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(() => new Set(['__no_client__']));

    const q = query.trim().toLowerCase();
    const filtered = projects.filter(
        (p) =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.clientId?.name || '').toLowerCase().includes(q),
    );

    const groups = useMemo(() => {
        const map = new Map();
        const noKey = '__no_client__';
        map.set(noKey, { key: noKey, label: 'NO CLIENT', items: [] });
        for (const c of clients) {
            map.set(c._id, { key: c._id, label: c.name, items: [] });
        }
        for (const p of filtered) {
            const cid = p.clientId?._id || p.clientId || noKey;
            if (!map.has(cid))
                map.set(cid, { key: cid, label: 'Unknown', items: [] });
            map.get(cid).items.push(p);
        }
        return Array.from(map.values()).filter((g) => g.items.length > 0);
    }, [filtered, clients]);

    const toggleGroup = (k) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    };

    return (
        <div style={{ width: 360, padding: 12 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '8px 12px',
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
            <div style={{ marginTop: 10, maxHeight: 320, overflowY: 'auto' }}>
                {groups.length === 0 ? (
                    <div
                        style={{
                            padding: '14px 4px',
                            color: '#8c8c8c',
                            fontSize: 13,
                        }}
                    >
                        No projects
                    </div>
                ) : (
                    groups.map((g) => {
                        const isOpen = expanded.has(g.key);
                        return (
                            <div key={g.key}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 4px',
                                        fontSize: 12,
                                        letterSpacing: 0.5,
                                        color: '#8c8c8c',
                                        textTransform: 'uppercase',
                                        borderTop: '1px solid #f0f0f0',
                                    }}
                                >
                                    <span>{g.label}</span>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <span
                                            onClick={() => toggleGroup(g.key)}
                                            style={{
                                                cursor: 'pointer',
                                                color: '#333',
                                                textTransform: 'none',
                                                fontSize: 13,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            {g.items.length} Project
                                            {isOpen ? (
                                                <ChevronUp size={14} />
                                            ) : (
                                                <ChevronDown size={14} />
                                            )}
                                        </span>
                                        {g.key !== '__no_client__' && onOpenClient && (
                                            <ExternalLink
                                                size={14}
                                                color="#8c8c8c"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => onOpenClient(g.key)}
                                            />
                                        )}
                                        {g.key === '__no_client__' && onOpenClient && (
                                            <ExternalLink
                                                size={14}
                                                color="#8c8c8c"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() =>
                                                    onOpenClient(null)
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                                {isOpen &&
                                    g.items.map((p) => {
                                        const favIds = (
                                            p.favoriteBy || []
                                        ).map((u) => u._id || u);
                                        const isFav =
                                            !!currentUserId &&
                                            favIds.some(
                                                (id) =>
                                                    String(id) ===
                                                    String(currentUserId),
                                            );
                                        return (
                                            <ProjectRow
                                                key={p._id}
                                                project={p}
                                                active={value === p._id}
                                                favorited={isFav}
                                                onClick={() => onChange(p._id)}
                                                onCreateTask={() =>
                                                    onCreateTask?.(p)
                                                }
                                                onToggleFavorite={() =>
                                                    onToggleFavorite?.(p)
                                                }
                                            />
                                        );
                                    })}
                            </div>
                        );
                    })
                )}
            </div>
            {onCreateProject && (
                <div
                    onClick={onCreateProject}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 4px',
                        cursor: 'pointer',
                        color: '#1677ff',
                        borderTop: '1px solid #f0f0f0',
                        width: '100%',
                        marginTop: 6,
                        fontSize: 14,
                    }}
                >
                    <span
                        style={{
                            width: 20,
                            height: 20,
                            border: '1.5px solid #1677ff',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Plus size={12} />
                    </span>
                    Create new Project
                </div>
            )}
        </div>
    );
}

function ProjectRow({
    project,
    active,
    favorited,
    onClick,
    onCreateTask,
    onToggleFavorite,
}) {
    const [hover, setHover] = useState(false);
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 6px',
                borderRadius: 4,
                background: active ? '#eaf4ff' : hover ? '#f5f7fa' : 'transparent',
                cursor: 'pointer',
                transition: 'background 150ms ease',
            }}
        >
            <span
                onClick={onClick}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    flex: 1,
                    color: '#333',
                    fontSize: 14,
                }}
            >
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: project.color,
                    }}
                />
                {project.name}
            </span>
            {onCreateTask && (
                <span
                    onClick={onCreateTask}
                    style={{
                        color: '#1677ff',
                        fontSize: 13,
                        cursor: 'pointer',
                    }}
                >
                    Create Task
                </span>
            )}
            {onToggleFavorite && (
                <Star
                    size={14}
                    color={favorited ? '#f5a623' : '#bfbfbf'}
                    fill={favorited ? '#f5a623' : 'none'}
                    style={{
                        cursor: 'pointer',
                        transition: 'color 150ms ease, fill 150ms ease',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite();
                    }}
                />
            )}
        </div>
    );
}

export default ProjectPicker;
