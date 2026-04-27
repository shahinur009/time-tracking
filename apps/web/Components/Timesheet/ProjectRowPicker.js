import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Star, ChevronUp, ChevronDown, ExternalLink, Check, X } from 'lucide-react';
import { useRouter } from 'next/router';
import {
    useProjects,
    useToggleProjectFavorite,
    useCreateProject,
    useAddProjectTask,
} from '@/api/queries/projects';
import useAuth from '@/hooks/useAuth';
import ProjectForm from '@/Modals/ProjectForm';

function PlusBadge() {
    return (
        <span
            style={{
                position: 'relative',
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '1.5px solid #03A9F4',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#03A9F4',
            }}
        >
            <Plus size={11} strokeWidth={2.5} />
            <span
                style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    color: '#ef4444',
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1,
                }}
            >
                *
            </span>
        </span>
    );
}

function ProjectRowPicker({ usedIds = [], onPick }) {
    const router = useRouter();
    const { user } = useAuth();
    const { data: projects = [] } = useProjects();
    const toggleFavorite = useToggleProjectFavorite();
    const createProject = useCreateProject();
    const addTask = useAddProjectTask();

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [collapsedClients, setCollapsedClients] = useState(new Set());
    const [taskFor, setTaskFor] = useState(null);
    const [taskName, setTaskName] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        function handler(e) {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) {
                setOpen(false);
                setTaskFor(null);
            }
        }
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return projects
            .filter((p) => !usedIds.includes(p._id))
            .filter((p) => {
                if (!q) return true;
                const projectName = (p.name || '').toLowerCase();
                const clientName = (p.clientId?.name || '').toLowerCase();
                return projectName.includes(q) || clientName.includes(q);
            });
    }, [projects, usedIds, query]);

    const groups = useMemo(() => {
        const map = new Map();
        filtered.forEach((p) => {
            const cid = p.clientId?._id || 'no-client';
            const cname = p.clientId?.name || 'NO CLIENT';
            if (!map.has(cid)) map.set(cid, { id: cid, name: cname, projects: [] });
            map.get(cid).projects.push(p);
        });
        return Array.from(map.values()).sort((a, b) => {
            if (a.id === 'no-client') return -1;
            if (b.id === 'no-client') return 1;
            return a.name.localeCompare(b.name);
        });
    }, [filtered]);

    const toggleGroup = (id) => {
        setCollapsedClients((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const isFavorited = (p) =>
        Array.isArray(p.favoriteBy) &&
        p.favoriteBy.some((id) => String(id) === String(user?._id));

    const submitTask = (projectId) => {
        const name = taskName.trim();
        if (!name) {
            setTaskFor(null);
            return;
        }
        addTask.mutate(
            { id: projectId, name },
            {
                onSuccess: () => {
                    setTaskFor(null);
                    setTaskName('');
                },
            },
        );
    };

    const handleCreateProject = (body) => {
        createProject.mutate(body, {
            onSuccess: (created) => {
                setCreateOpen(false);
                if (created?._id) {
                    onPick?.(created);
                    setOpen(false);
                }
            },
        });
    };

    return (
        <div
            ref={wrapRef}
            style={{ position: 'relative', display: 'inline-block' }}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                style={{
                    all: 'unset',
                    cursor: 'pointer',
                    color: '#03A9F4',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                }}
            >
                <PlusBadge />
                Select project
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        width: 360,
                        maxHeight: 460,
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 1500,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <div style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>
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
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search Project or Client"
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    flex: 1,
                                    fontSize: 13,
                                    background: 'transparent',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                        {groups.length === 0 ? (
                            <div
                                style={{
                                    padding: 16,
                                    color: '#9ca3af',
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}
                            >
                                No projects available.
                            </div>
                        ) : (
                            groups.map((g) => {
                                const collapsed = collapsedClients.has(g.id);
                                return (
                                    <div key={g.id}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 14px',
                                                fontSize: 11,
                                                color: '#9ca3af',
                                                fontWeight: 600,
                                                letterSpacing: 0.5,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            <span>{g.name}</span>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        textTransform: 'none',
                                                        letterSpacing: 0,
                                                        fontWeight: 400,
                                                        color: '#6b7280',
                                                    }}
                                                >
                                                    {g.projects.length}{' '}
                                                    {g.projects.length === 1
                                                        ? 'Project'
                                                        : 'Projects'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(g.id)}
                                                    style={iconButtonStyle}
                                                    title={collapsed ? 'Expand' : 'Collapse'}
                                                >
                                                    {collapsed ? (
                                                        <ChevronDown size={14} />
                                                    ) : (
                                                        <ChevronUp size={14} />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const url =
                                                            g.id === 'no-client'
                                                                ? '/projects'
                                                                : `/projects?clientId=${g.id}`;
                                                        router.push(url);
                                                    }}
                                                    style={iconButtonStyle}
                                                    title="Open in Projects"
                                                >
                                                    <ExternalLink size={13} />
                                                </button>
                                            </span>
                                        </div>
                                        {!collapsed &&
                                            g.projects.map((p) => {
                                                const fav = isFavorited(p);
                                                const editingTask = taskFor === p._id;
                                                return (
                                                    <div key={p._id}>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 10,
                                                                padding: '8px 14px',
                                                                cursor: 'pointer',
                                                            }}
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.background =
                                                                    '#f5f5f5')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.background =
                                                                    'transparent')
                                                            }
                                                            onClick={() => {
                                                                if (editingTask) return;
                                                                onPick?.(p);
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    display: 'inline-block',
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    background:
                                                                        p.color || '#8C8C8C',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            <span
                                                                style={{
                                                                    flex: 1,
                                                                    fontSize: 13,
                                                                    color: p.color || '#1f2937',
                                                                }}
                                                            >
                                                                {p.name}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setTaskFor(p._id);
                                                                    setTaskName('');
                                                                }}
                                                                style={{
                                                                    all: 'unset',
                                                                    cursor: 'pointer',
                                                                    color: '#03A9F4',
                                                                    fontSize: 13,
                                                                }}
                                                            >
                                                                Create Task
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleFavorite.mutate(p._id);
                                                                }}
                                                                style={iconButtonStyle}
                                                                title={
                                                                    fav
                                                                        ? 'Remove from favorites'
                                                                        : 'Mark as favorite'
                                                                }
                                                            >
                                                                <Star
                                                                    size={14}
                                                                    fill={
                                                                        fav ? '#fbbf24' : 'none'
                                                                    }
                                                                    color={
                                                                        fav
                                                                            ? '#fbbf24'
                                                                            : '#9ca3af'
                                                                    }
                                                                />
                                                            </button>
                                                        </div>
                                                        {editingTask && (
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    padding: '4px 14px 10px 32px',
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <input
                                                                    autoFocus
                                                                    value={taskName}
                                                                    onChange={(e) =>
                                                                        setTaskName(e.target.value)
                                                                    }
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            submitTask(p._id);
                                                                        } else if (
                                                                            e.key === 'Escape'
                                                                        ) {
                                                                            setTaskFor(null);
                                                                        }
                                                                    }}
                                                                    placeholder="Task name"
                                                                    style={{
                                                                        flex: 1,
                                                                        fontSize: 12,
                                                                        height: 28,
                                                                        padding: '0 8px',
                                                                        border:
                                                                            '1px solid #d8dde3',
                                                                        borderRadius: 3,
                                                                        outline: 'none',
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        submitTask(p._id)
                                                                    }
                                                                    style={miniBtn('#03A9F4')}
                                                                    title="Save"
                                                                >
                                                                    <Check
                                                                        size={12}
                                                                        color="#fff"
                                                                    />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setTaskFor(null)
                                                                    }
                                                                    style={miniBtn('#e5e7eb')}
                                                                    title="Cancel"
                                                                >
                                                                    <X
                                                                        size={12}
                                                                        color="#6b7280"
                                                                    />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div
                        style={{
                            borderTop: '1px solid #f0f0f0',
                            padding: '10px 14px',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            style={{
                                all: 'unset',
                                cursor: 'pointer',
                                color: '#03A9F4',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 10,
                                fontSize: 13,
                            }}
                        >
                            <span
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: '1.5px solid #03A9F4',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Plus size={11} strokeWidth={2.5} />
                            </span>
                            Create new Project
                        </button>
                    </div>
                </div>
            )}

            <ProjectForm
                open={createOpen}
                initial={null}
                onCancel={() => setCreateOpen(false)}
                onSubmit={handleCreateProject}
                loading={createProject.isLoading}
            />
        </div>
    );
}

const iconButtonStyle = {
    all: 'unset',
    cursor: 'pointer',
    color: '#9ca3af',
    width: 22,
    height: 22,
    borderRadius: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
};

function miniBtn(bg) {
    return {
        all: 'unset',
        cursor: 'pointer',
        width: 22,
        height: 22,
        borderRadius: 3,
        background: bg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
}

export default ProjectRowPicker;
