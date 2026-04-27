import { useEffect, useMemo, useState } from 'react';
import {
    Empty,
    Select,
    Dropdown,
    Tag,
    Popover,
    Checkbox,
    DatePicker,
    TimePicker,
} from 'antd';
import dayjs from 'dayjs';
import { format, isToday, isYesterday } from 'date-fns';
import {
    Play,
    Tag as TagIcon,
    Calendar as CalendarIcon,
    MoreVertical,
    Download,
} from 'lucide-react';
import { formatDuration } from '../../utils/format';
import {
    useUpdateEntry,
    useStartEntry,
    useDeleteEntry,
} from '../../api/queries/entries';
import { useProjects } from '../../api/queries/projects';
import { useTags, useCreateTag } from '../../api/queries/tags';
import useAuth from '../../hooks/useAuth';
import SearchablePicker from './SearchablePicker';

function groupByDay(entries = []) {
    const groups = {};
    for (const e of entries) {
        const day = format(new Date(e.startTime), 'yyyy-MM-dd');
        if (!groups[day]) groups[day] = [];
        groups[day].push(e);
    }
    return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function groupByContent(items = []) {
    const map = new Map();
    for (const e of items) {
        const pid = e.projectId?._id || e.projectId || '';
        const key = `${e.description || ''}::${pid}`;
        if (!map.has(key)) map.set(key, { key, items: [] });
        map.get(key).items.push(e);
    }
    return Array.from(map.values());
}

function dayLabel(day) {
    const d = new Date(day);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEE, MMM d');
}

function EntryList({ entries = [] }) {
    const { isAdmin } = useAuth();
    const { data: projects = [] } = useProjects();
    const { data: tagsList = [] } = useTags();
    const createTag = useCreateTag();
    const update = useUpdateEntry();
    const startEntry = useStartEntry();
    const deleteEntry = useDeleteEntry();
    const [expanded, setExpanded] = useState(() => new Set());

    const finished = entries.filter((e) => e.status === 'finished');
    const grouped = useMemo(() => groupByDay(finished), [finished]);
    const weekTotal = finished.reduce((s, e) => s + (e.duration || 0), 0);

    if (grouped.length === 0) {
        return <Empty description="No time entries yet" />;
    }

    const onRestart = (entry) => {
        startEntry.mutate({
            description: entry.description || '',
            projectId: entry.projectId?._id || entry.projectId || null,
        });
    };

    const toggleGroup = (key) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 4px 14px',
                    fontSize: 13,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ color: '#333', fontWeight: 500 }}>This week</span>
                </div>
                <div style={{ color: '#8c8c8c' }}>
                    Week total:{' '}
                    <strong
                        style={{
                            color: '#333',
                            fontVariantNumeric: 'tabular-nums',
                            marginLeft: 6,
                        }}
                    >
                        {formatDuration(weekTotal)}
                    </strong>
                </div>
            </div>

            {grouped.map(([day, items]) => {
                const total = items.reduce((s, e) => s + (e.duration || 0), 0);
                const contentGroups = groupByContent(items);
                return (
                    <div key={day} style={{ marginBottom: 12 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f0f2f4',
                                padding: '10px 16px',
                                border: '1px solid #e8e8e8',
                                borderBottom: 'none',
                                fontSize: 13,
                            }}
                        >
                            <span style={{ color: '#333', fontWeight: 500 }}>
                                {dayLabel(day)}
                            </span>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    color: '#8c8c8c',
                                }}
                            >
                                <span>
                                    Total:{' '}
                                    <strong
                                        style={{
                                            color: '#333',
                                            fontVariantNumeric: 'tabular-nums',
                                            marginLeft: 6,
                                        }}
                                    >
                                        {formatDuration(total)}
                                    </strong>
                                </span>
                                <Dropdown
                                    trigger={['click']}
                                    menu={{
                                        items: [
                                            { key: 'csv', label: 'Export as CSV' },
                                            { key: 'pdf', label: 'Export as PDF' },
                                        ],
                                    }}
                                >
                                    <button
                                        type="button"
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 4,
                                            display: 'inline-flex',
                                        }}
                                    >
                                        <Download size={14} color="#8c8c8c" />
                                    </button>
                                </Dropdown>
                            </div>
                        </div>
                        <div className="tt-entry-rows">
                        {contentGroups.map((group) => {
                            const groupKey = `${day}::${group.key}`;
                            const isOpen = expanded.has(groupKey);
                            const count = group.items.length;
                            const first = group.items[0];
                            const groupTotal = group.items.reduce(
                                (s, e) => s + (e.duration || 0),
                                0,
                            );
                            return (
                                <div key={group.key}>
                                    <EntryRow
                                        entry={first}
                                        count={count}
                                        displayDuration={groupTotal}
                                        expanded={isOpen}
                                        onToggle={() => toggleGroup(groupKey)}
                                        canEdit={isAdmin}
                                        projects={projects}
                                        tagsList={tagsList}
                                        createTag={createTag}
                                        onUpdate={(patch) =>
                                            update.mutate({
                                                id: first._id,
                                                ...patch,
                                            })
                                        }
                                        onRestart={() => onRestart(first)}
                                        onDelete={() =>
                                            deleteEntry.mutate(first._id)
                                        }
                                    />
                                    {isOpen &&
                                        count > 1 &&
                                        group.items.map((entry) => (
                                            <EntryRow
                                                key={entry._id}
                                                entry={entry}
                                                child
                                                canEdit={isAdmin}
                                                projects={projects}
                                                tagsList={tagsList}
                                                createTag={createTag}
                                                onUpdate={(patch) =>
                                                    update.mutate({
                                                        id: entry._id,
                                                        ...patch,
                                                    })
                                                }
                                                onRestart={() => onRestart(entry)}
                                                onDelete={() =>
                                                    deleteEntry.mutate(entry._id)
                                                }
                                            />
                                        ))}
                                </div>
                            );
                        })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function EntryRow({
    entry,
    count,
    displayDuration,
    expanded,
    onToggle,
    child,
    canEdit = false,
    projects,
    tagsList,
    createTag,
    onUpdate,
    onRestart,
    onDelete,
}) {
    const projectId = entry.projectId?._id || entry.projectId || null;
    const projectColor = entry.projectId?.color || '#8C8C8C';
    const projectName = entry.projectId?.name;
    const entryTagIds = (entry.tags || []).map((t) => t._id || t);

    const start = format(new Date(entry.startTime), 'HH:mm');
    const end = entry.endTime
        ? format(new Date(entry.endTime), 'HH:mm')
        : '…';

    const [descDraft, setDescDraft] = useState(entry.description || '');
    const [billableLocal, setBillableLocal] = useState(!!entry.billable);
    useEffect(() => setBillableLocal(!!entry.billable), [entry.billable]);

    const onDescriptionCommit = () => {
        if (descDraft !== (entry.description || '')) {
            onUpdate({ description: descDraft });
        }
    };

    const showBadge = count > 1;
    const duration = displayDuration ?? entry.duration;
    const placeholder = 'Add description';
    const inputSize = Math.max((descDraft || placeholder).length, 4);

    return (
        <div
            className="tt-entry-row"
            style={{
                display: 'flex',
                alignItems: 'center',
                background: child ? '#fafbfc' : '#fff',
                border: '1px solid #e8e8e8',
                borderTop: 'none',
                padding: '10px 16px',
                paddingLeft: child ? 40 : 16,
                gap: 8,
                fontSize: 13,
            }}
        >
            {showBadge ? (
                <button
                    type="button"
                    onClick={onToggle}
                    style={{
                        width: 26,
                        height: 26,
                        border: '1px solid #bfdfff',
                        borderRadius: 3,
                        background: expanded ? '#e6f4ff' : '#f0f7ff',
                        color: '#1677ff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 180ms ease',
                    }}
                    title={expanded ? 'Collapse' : 'Expand'}
                >
                    {count}
                </button>
            ) : child ? null : (
                <span style={{ width: 26, flexShrink: 0 }} />
            )}

            {canEdit ? (
                <input
                    type="text"
                    value={descDraft}
                    placeholder={placeholder}
                    size={inputSize}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onBlur={onDescriptionCommit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') {
                            setDescDraft(entry.description || '');
                            e.currentTarget.blur();
                        }
                    }}
                    style={{
                        border: '1px solid #d9d9d9',
                        outline: 'none',
                        background: '#fff',
                        fontSize: 13,
                        color: descDraft ? '#333' : '#bfbfbf',
                        padding: '4px 8px',
                        borderRadius: 2,
                        minWidth: 60,
                        maxWidth: 360,
                    }}
                />
            ) : (
                <span
                    style={{
                        fontSize: 13,
                        color: entry.description ? '#333' : '#bfbfbf',
                        padding: '4px 8px',
                        minWidth: 60,
                        maxWidth: 360,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={entry.description || ''}
                >
                    {entry.description || placeholder}
                </span>
            )}

            {canEdit ? (
                <Popover
                    trigger="click"
                    placement="bottom"
                    autoAdjustOverflow={false}
                    content={
                        <div style={{ minWidth: 220 }}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Select project"
                                value={projectId || undefined}
                                onChange={(val) =>
                                    onUpdate({ projectId: val || null })
                                }
                                allowClear
                                options={projects.map((p) => ({
                                    label: (
                                        <span>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: p.color,
                                                    marginRight: 8,
                                                }}
                                            />
                                            {p.name}
                                        </span>
                                    ),
                                    value: p._id,
                                }))}
                            />
                        </div>
                    }
                >
                    <button
                        type="button"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#1677ff',
                            fontSize: 13,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            minWidth: 90,
                        }}
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: projectName ? projectColor : 'transparent',
                                border: projectName
                                    ? 'none'
                                    : '1px solid #1677ff',
                            }}
                        />
                        {projectName || 'Project'}
                    </button>
                </Popover>
            ) : (
                <span
                    style={{
                        color: projectName ? '#333' : '#bfbfbf',
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        minWidth: 90,
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: projectName ? projectColor : '#e0e0e0',
                        }}
                    />
                    {projectName || '—'}
                </span>
            )}

            <div className="tt-entry-row-actions">

            {canEdit ? (
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
                            selected={entryTagIds}
                            onToggle={(id) =>
                                onUpdate({
                                    tags: entryTagIds.includes(id)
                                        ? entryTagIds.filter((x) => x !== id)
                                        : [...entryTagIds, id],
                                })
                            }
                            onCreate={(name) =>
                                createTag?.mutate(
                                    { name },
                                    {
                                        onSuccess: (data) => {
                                            const id = data?._id || data?.id;
                                            if (id)
                                                onUpdate({
                                                    tags: [...entryTagIds, id],
                                                });
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
                    <button type="button" style={{ ...iconButton, ...cellIcon }}>
                        <TagIcon
                            size={14}
                            color={entryTagIds.length ? '#1677ff' : '#b0b8c0'}
                        />
                    </button>
                </Popover>
            ) : (
                <span style={{ ...cellIcon }} title={entryTagIds.length ? 'Tagged' : 'No tags'}>
                    <TagIcon
                        size={14}
                        color={entryTagIds.length ? '#1677ff' : '#d0d4d8'}
                    />
                </span>
            )}
            {canEdit ? (
                <Popover
                    trigger="click"
                    placement="bottom"
                    autoAdjustOverflow={false}
                    content={
                        <Checkbox
                            checked={billableLocal}
                            onChange={(e) => {
                                setBillableLocal(e.target.checked);
                                onUpdate({ billable: e.target.checked });
                            }}
                        >
                            Billable
                        </Checkbox>
                    }
                >
                    <button type="button" style={{ ...iconButton, ...cellIcon }}>
                        <DollarIcon active={billableLocal} />
                    </button>
                </Popover>
            ) : (
                <span style={{ ...cellIcon }} title={billableLocal ? 'Billable' : 'Not billable'}>
                    <DollarIcon active={billableLocal} />
                </span>
            )}
            {canEdit ? (
                <Popover
                    trigger="click"
                    placement="bottom"
                    autoAdjustOverflow={false}
                    content={
                        <div style={{ display: 'flex', gap: 8 }}>
                            <TimePicker
                                value={dayjs(entry.startTime)}
                                format="HH:mm"
                                onChange={(v) => {
                                    if (v) onUpdate({ startTime: v.toISOString() });
                                }}
                            />
                            <span style={{ alignSelf: 'center' }}>–</span>
                            <TimePicker
                                value={entry.endTime ? dayjs(entry.endTime) : null}
                                format="HH:mm"
                                onChange={(v) => {
                                    if (v) onUpdate({ endTime: v.toISOString() });
                                }}
                            />
                        </div>
                    }
                >
                    <button
                        type="button"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#8c8c8c',
                            fontVariantNumeric: 'tabular-nums',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            minWidth: 110,
                            justifyContent: 'center',
                            fontSize: 13,
                        }}
                    >
                        {start} <span style={{ color: '#d9d9d9' }}>–</span> {end}
                    </button>
                </Popover>
            ) : (
                <span
                    style={{
                        color: '#8c8c8c',
                        fontVariantNumeric: 'tabular-nums',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        minWidth: 110,
                        justifyContent: 'center',
                        fontSize: 13,
                    }}
                >
                    {start} <span style={{ color: '#d9d9d9' }}>–</span> {end}
                </span>
            )}
            {canEdit ? (
                <Popover
                    trigger="click"
                    placement="bottom"
                    autoAdjustOverflow={false}
                    content={
                        <DatePicker
                            value={dayjs(entry.startTime)}
                            onChange={(v) => {
                                if (!v) return;
                                const newDay = v.toDate();
                                const oldStart = new Date(entry.startTime);
                                const deltaMs =
                                    new Date(
                                        newDay.getFullYear(),
                                        newDay.getMonth(),
                                        newDay.getDate(),
                                    ).getTime() -
                                    new Date(
                                        oldStart.getFullYear(),
                                        oldStart.getMonth(),
                                        oldStart.getDate(),
                                    ).getTime();
                                const newStart = new Date(
                                    oldStart.getTime() + deltaMs,
                                );
                                const patch = { startTime: newStart.toISOString() };
                                if (entry.endTime) {
                                    patch.endTime = new Date(
                                        new Date(entry.endTime).getTime() + deltaMs,
                                    ).toISOString();
                                }
                                onUpdate(patch);
                            }}
                        />
                    }
                >
                    <button type="button" style={{ ...iconButton, ...cellIcon }}>
                        <CalendarIcon size={14} color="#b0b8c0" />
                    </button>
                </Popover>
            ) : (
                <span style={{ ...cellIcon }}>
                    <CalendarIcon size={14} color="#d0d4d8" />
                </span>
            )}
            {count > 1 || !canEdit ? (
                <span
                    style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 500,
                        color: '#333',
                        minWidth: 78,
                        textAlign: 'right',
                    }}
                >
                    {formatDuration(duration)}
                </span>
            ) : (
                <DurationEditor
                    duration={duration}
                    onCommit={(newSecs) => {
                        if (newSecs <= 0) return;
                        const newEnd = new Date(
                            new Date(entry.startTime).getTime() +
                                newSecs * 1000,
                        );
                        onUpdate({ endTime: newEnd.toISOString() });
                    }}
                />
            )}
            <button
                type="button"
                onClick={onRestart}
                style={iconButton}
                title="Start again"
            >
                <Play size={14} color="#8c8c8c" />
            </button>
            {canEdit && (
                <Dropdown
                    trigger={['click']}
                    menu={{
                        items: [
                            {
                                key: 'delete',
                                danger: true,
                                label: 'Delete',
                                onClick: onDelete,
                            },
                        ],
                    }}
                >
                    <button type="button" style={iconButton}>
                        <MoreVertical size={14} color="#8c8c8c" />
                    </button>
                </Dropdown>
            )}

            {entry.clickupTaskTitle && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                    CU: {entry.clickupTaskTitle}
                </Tag>
            )}
            </div>
        </div>
    );
}

function DurationEditor({ duration, onCommit }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(formatDuration(duration));

    useEffect(() => {
        if (!editing) setValue(formatDuration(duration));
    }, [duration, editing]);

    const parse = (text) => {
        const parts = text.split(':').map((p) => parseInt(p, 10));
        if (parts.some((n) => Number.isNaN(n))) return null;
        let h = 0,
            m = 0,
            s = 0;
        if (parts.length === 3) [h, m, s] = parts;
        else if (parts.length === 2) [h, m] = parts;
        else if (parts.length === 1) [m] = parts;
        return h * 3600 + m * 60 + s;
    };

    const commit = () => {
        const secs = parse(value);
        if (secs == null) {
            setValue(formatDuration(duration));
        } else if (secs !== duration) {
            onCommit(secs);
        }
        setEditing(false);
    };

    if (!editing) {
        return (
            <span
                onClick={() => {
                    setValue(formatDuration(duration));
                    setEditing(true);
                }}
                style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    color: '#333',
                    minWidth: 78,
                    textAlign: 'right',
                    cursor: 'text',
                }}
                title="Click to edit duration"
            >
                {formatDuration(duration)}
            </span>
        );
    }

    return (
        <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                    setValue(formatDuration(duration));
                    setEditing(false);
                }
            }}
            style={{
                width: 90,
                border: '1px solid #1677ff',
                borderRadius: 2,
                outline: 'none',
                padding: '4px 6px',
                fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
            }}
        />
    );
}

function DollarIcon({ active }) {
    return (
        <span
            style={{
                color: active ? '#1677ff' : '#b0b8c0',
                fontWeight: 700,
                fontSize: 15,
                fontFamily: 'serif',
                lineHeight: 1,
            }}
        >
            $
        </span>
    );
}

const cellIcon = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
};

const iconButton = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 180ms ease',
};

export default EntryList;
