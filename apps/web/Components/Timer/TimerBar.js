import { useEffect, useState } from 'react';
import { AutoComplete, Dropdown, Tag, Popover, Checkbox } from 'antd';
import { Tag as TagIcon, Plus, MoreVertical, X } from 'lucide-react';
import {
    useCurrentEntry,
    useStartEntry,
    useStopEntry,
} from '../../lib/queries/entries';
import {
    useProjects,
    useCreateProject,
    useAddProjectTask,
    useToggleProjectFavorite,
} from '../../lib/queries/projects';
import { useClients } from '../../lib/queries/clients';
import { useTags, useCreateTag } from '../../lib/queries/tags';
import { useClickupStatus } from '../../lib/queries/clickup';
import useAuth from '../../hooks/useAuth';
import SearchablePicker from './SearchablePicker';
import ProjectPicker from './ProjectPicker';
import ClickUpTaskPicker from './ClickUpTaskPicker';
import ProjectForm from '../../Modals/ProjectForm';
import CreateTaskModal from '../../Modals/CreateTaskModal';
import ClientProjectsModal from '../../Modals/ClientProjectsModal';
import { useTimer } from '../../hooks/useTimer';
import { formatDuration } from '../../utils/format';
import ConfirmStop from '../../Modals/ConfirmStop';

function TimerBar() {
    const { user } = useAuth();
    const currentUserId = user?._id || user?.id;
    const { data: current } = useCurrentEntry();
    const { data: projects = [] } = useProjects();
    const { data: clients = [] } = useClients();
    const { data: tagsList = [] } = useTags();
    const createTag = useCreateTag();
    const createProject = useCreateProject();
    const addTask = useAddProjectTask();
    const toggleFav = useToggleProjectFavorite();
    const start = useStartEntry();
    const stop = useStopEntry();
    const { data: cuStatus } = useClickupStatus();
    const cuConnected = !!cuStatus?.connected;

    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState(null);
    const [tagIds, setTagIds] = useState([]);
    const [billable, setBillable] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [projectOpen, setProjectOpen] = useState(false);
    const [descFocused, setDescFocused] = useState(false);
    const [projectHover, setProjectHover] = useState(false);
    const [projectFormOpen, setProjectFormOpen] = useState(false);
    const [taskProject, setTaskProject] = useState(null);
    const [clientModal, setClientModal] = useState(null);
    const [clickupTask, setClickupTask] = useState(null);
    const [cuPickerOpen, setCuPickerOpen] = useState(false);

    const running = current && current.status === 'running' ? current : null;
    const seconds = useTimer(running?.startTime, running?._id);

    useEffect(() => {
        if (running) {
            setDescription(running.description || '');
            setProjectId(running.projectId?._id || running.projectId || null);
            setBillable(!!running.billable);
            setTagIds((running.tags || []).map((t) => t._id || t));
            if (running.clickupTaskId) {
                setClickupTask({
                    clickupTaskId: running.clickupTaskId,
                    name: running.clickupTaskTitle,
                    clickupListId: running.clickupListId,
                    clickupSpaceId: running.clickupSpaceId,
                    clickupTeamId: running.clickupTeamId,
                });
            } else {
                setClickupTask(null);
            }
        } else {
            setDescription('');
            setProjectId(null);
            setBillable(false);
            setTagIds([]);
            setClickupTask(null);
        }
    }, [running?._id]);

    const onStart = () =>
        start.mutate({
            description,
            projectId,
            billable,
            tags: tagIds,
            clickupTaskId: clickupTask?.clickupTaskId,
            clickupTaskTitle: clickupTask?.name,
            clickupListId: clickupTask?.clickupListId,
            clickupSpaceId: clickupTask?.clickupSpaceId,
            clickupTeamId: clickupTask?.clickupTeamId,
        });

    const requestStop = () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const n = new Notification('Stop timer?', {
                body: 'Click Done in the app to finalize the entry.',
                requireInteraction: true,
            });
            n.onclick = () => {
                window.focus();
                setConfirmOpen(true);
                n.close();
            };
        }
        setConfirmOpen(true);
    };

    const confirmStop = () => {
        stop.mutate(undefined, {
            onSuccess: () => setConfirmOpen(false),
        });
    };

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }, []);

    const selectedProject = projects.find((p) => p._id === projectId);

    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: 3,
                position: 'sticky',
                top: 64,
                zIndex: 15,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 20px',
                    gap: 12,
                }}
            >
                <AutoComplete
                    variant={descFocused ? 'outlined' : 'borderless'}
                    size="large"
                    value={description}
                    onChange={(val) => setDescription(val)}
                    onSelect={(val, opt) => {
                        setDescription(val);
                        if (opt?.projectId) setProjectId(opt.projectId);
                    }}
                    onFocus={() => setDescFocused(true)}
                    onBlur={() => setDescFocused(false)}
                    placeholder="What are you working on?"
                    style={{ flex: 1 }}
                    filterOption={(input, option) =>
                        (option?.projectName || '')
                            .toLowerCase()
                            .includes((input || '').toLowerCase())
                    }
                    options={projects.map((p) => ({
                        value: p.name,
                        projectId: p._id,
                        projectName: p.name,
                        label: (
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: p.color,
                                    }}
                                />
                                {p.name}
                            </span>
                        ),
                    }))}
                />
                {cuConnected && (
                    <Popover
                        trigger="click"
                        open={cuPickerOpen}
                        onOpenChange={setCuPickerOpen}
                        placement="bottomRight"
                        autoAdjustOverflow={false}
                        overlayInnerStyle={{
                            padding: 0,
                            borderRadius: 8,
                            boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                        }}
                        content={
                            <ClickUpTaskPicker
                                value={clickupTask?.clickupTaskId}
                                onSelect={(task) => {
                                    setClickupTask({
                                        clickupTaskId: task.clickupTaskId,
                                        name: task.name,
                                        clickupListId: task.clickupListId,
                                        clickupSpaceId: task.clickupSpaceId,
                                        clickupTeamId: task.clickupTeamId,
                                    });
                                    if (!description) setDescription(task.name);
                                    setCuPickerOpen(false);
                                }}
                            />
                        }
                    >
                        <button type="button" style={cuPickBtn(!!clickupTask)}>
                            {clickupTask ? (
                                <>
                                    <span
                                        style={{
                                            maxWidth: 180,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        CU: {clickupTask.name}
                                    </span>
                                    <span
                                        role="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setClickupTask(null);
                                        }}
                                        style={{ display: 'inline-flex', cursor: 'pointer' }}
                                    >
                                        <X size={12} />
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Plus size={12} /> ClickUp task
                                </>
                            )}
                        </button>
                    </Popover>
                )}

                <Popover
                    trigger="click"
                    open={projectOpen}
                    onOpenChange={setProjectOpen}
                    placement="bottomRight"
                    autoAdjustOverflow={false}
                    overlayInnerStyle={{
                        padding: 0,
                        borderRadius: 8,
                        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                    }}
                    content={
                        <ProjectPicker
                            projects={projects}
                            clients={clients}
                            value={projectId}
                            currentUserId={currentUserId}
                            onChange={(id) => {
                                setProjectId(id);
                                setProjectOpen(false);
                            }}
                            onCreateProject={() => {
                                setProjectOpen(false);
                                setProjectFormOpen(true);
                            }}
                            onCreateTask={(p) => {
                                setProjectOpen(false);
                                setTaskProject(p);
                            }}
                            onToggleFavorite={(p) => toggleFav.mutate(p._id)}
                            onOpenClient={(cid) => {
                                setProjectOpen(false);
                                const c = clients.find((x) => x._id === cid);
                                setClientModal({
                                    clientId: cid,
                                    clientName: c?.name || 'No Client',
                                });
                            }}
                        />
                    }
                >
                    <div
                        onMouseEnter={() => setProjectHover(true)}
                        onMouseLeave={() => setProjectHover(false)}
                        style={{ cursor: 'pointer' }}
                    >
                        {projectId ? (
                            <ProjectSelectedLabel
                                project={projects.find(
                                    (p) => p._id === projectId,
                                )}
                                hover={projectHover}
                            />
                        ) : (
                            <ProjectPlaceholder hover={projectHover} />
                        )}
                    </div>
                </Popover>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    borderTop: '1px solid #f0f0f0',
                    alignItems: 'stretch',
                }}
            >
                <CenterCell divider>
                    <Popover
                        trigger="click"
                        placement="bottom"
                        autoAdjustOverflow={false}
                        overlayInnerStyle={{
                            padding: 0,
                            borderRadius: 8,
                            boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                        }}
                        content={
                            <SearchablePicker
                                items={tagsList}
                                selected={tagIds}
                                onToggle={(id) =>
                                    setTagIds((prev) =>
                                        prev.includes(id)
                                            ? prev.filter((x) => x !== id)
                                            : [...prev, id],
                                    )
                                }
                                onCreate={(name) =>
                                    createTag.mutate(
                                        { name },
                                        {
                                            onSuccess: (data) => {
                                                const id = data?._id || data?.id;
                                                if (id)
                                                    setTagIds((prev) => [
                                                        ...prev,
                                                        id,
                                                    ]);
                                            },
                                        },
                                    )
                                }
                                placeholder="Add/Search tags"
                                emptyTitle="No tags yet"
                                emptyHint="Start typing to create one."
                            />
                        }
                    >
                        <button type="button" style={iconBtn}>
                            <TagIcon
                                size={16}
                                color={tagIds.length ? '#1677ff' : '#8c8c8c'}
                            />
                        </button>
                    </Popover>
                </CenterCell>
                <CenterCell divider>
                    <Popover
                        trigger="click"
                        placement="bottom"
                        autoAdjustOverflow={false}
                        content={
                            <Checkbox
                                checked={billable}
                                onChange={(e) => setBillable(e.target.checked)}
                            >
                                Billable
                            </Checkbox>
                        }
                    >
                        <button type="button" style={iconBtn}>
                            <DollarIcon active={billable} />
                        </button>
                    </Popover>
                </CenterCell>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                    }}
                >
                    <span
                        style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 20,
                            fontWeight: 500,
                            color: '#333',
                            minWidth: 90,
                        }}
                    >
                        {formatDuration(seconds)}
                    </span>
                    {running ? (
                        <button
                            type="button"
                            onClick={requestStop}
                            disabled={stop.isLoading}
                            style={{
                                ...primaryBtn,
                                background: '#f44336',
                            }}
                        >
                            STOP
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onStart}
                            disabled={start.isLoading}
                            style={primaryBtn}
                        >
                            START
                        </button>
                    )}
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'manual',
                                    label: 'Add time manually',
                                    disabled: true,
                                },
                            ],
                        }}
                        trigger={['click']}
                    >
                        <button type="button" style={iconBtn}>
                            <MoreVertical size={16} color="#8c8c8c" />
                        </button>
                    </Dropdown>
                </div>
            </div>

            {running?.clickupTaskTitle && (
                <div style={{ padding: '0 20px 10px' }}>
                    <Tag color="blue">ClickUp: {running.clickupTaskTitle}</Tag>
                </div>
            )}

            <ConfirmStop
                open={confirmOpen}
                onCancel={() => setConfirmOpen(false)}
                onConfirm={confirmStop}
                loading={stop.isLoading}
                elapsed={seconds}
            />

            <ProjectForm
                open={projectFormOpen}
                initial={null}
                onCancel={() => setProjectFormOpen(false)}
                loading={createProject.isLoading}
                onSubmit={(values) =>
                    createProject.mutate(values, {
                        onSuccess: (data) => {
                            const id = data?._id || data?.id;
                            if (id) setProjectId(id);
                            setProjectFormOpen(false);
                        },
                    })
                }
            />

            <CreateTaskModal
                open={!!taskProject}
                onCancel={() => setTaskProject(null)}
                loading={addTask.isLoading}
                onSave={(name) =>
                    addTask.mutate(
                        { id: taskProject._id, name },
                        { onSuccess: () => setTaskProject(null) },
                    )
                }
            />

            <ClientProjectsModal
                open={!!clientModal}
                onClose={() => setClientModal(null)}
                clientId={clientModal?.clientId || null}
                clientName={clientModal?.clientName}
                projects={projects}
                currentUserId={currentUserId}
                onSelectProject={(p) => setProjectId(p._id)}
                onCreateTask={(p) => setTaskProject(p)}
                onToggleFavorite={(p) => toggleFav.mutate(p._id)}
            />
        </div>
    );
}

function ProjectSelectedLabel({ project, hover }) {
    if (!project) return null;
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#1677ff',
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
            <span
                style={{
                    textDecoration: hover ? 'underline' : 'none',
                    transition: 'text-decoration 150ms ease',
                }}
            >
                {project.name}
            </span>
        </span>
    );
}

function ProjectPlaceholder({ hover }) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#1677ff',
                fontSize: 14,
            }}
        >
            <span
                style={{
                    width: 18,
                    height: 18,
                    border: '1.5px solid #1677ff',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Plus size={12} />
            </span>
            <span
                style={{
                    textDecoration: hover ? 'underline' : 'none',
                    transition: 'text-decoration 150ms ease',
                }}
            >
                Project
            </span>
        </span>
    );
}

function DollarIcon({ active }) {
    return (
        <span
            style={{
                color: active ? '#1677ff' : '#b0b8c0',
                fontWeight: 700,
                fontSize: 18,
                fontFamily: 'serif',
            }}
        >
            $
        </span>
    );
}

function CenterCell({ children, divider }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: divider ? '1px solid #f0f0f0' : 'none',
                padding: '10px 0',
            }}
        >
            {children}
        </div>
    );
}

const primaryBtn = {
    background: '#1677ff',
    color: '#fff',
    border: 'none',
    borderRadius: 3,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    cursor: 'pointer',
    height: 36,
    transition: 'background 180ms ease',
};

const iconBtn = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    transition: 'background 180ms ease',
};

function cuPickBtn(active) {
    return {
        background: active ? '#e6f4ff' : 'transparent',
        border: active ? '1px solid #91caff' : '1px dashed #bfbfbf',
        color: active ? '#1677ff' : '#8c8c8c',
        cursor: 'pointer',
        borderRadius: 3,
        padding: '4px 10px',
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
    };
}

export default TimerBar;
