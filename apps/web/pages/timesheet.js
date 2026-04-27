import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tooltip, Typography, Dropdown, Badge } from 'antd';
import { Plus, Copy, FileText, ChevronDown, List } from 'lucide-react';
import { addDays, format, startOfWeek } from 'date-fns';
import { useQueryClient } from 'react-query';
import { useSocket, useSocketEvent } from '@/context/SocketContext';
import withAuth from '@/hoc/withAuth';
import Loading from '@/Components/Loading';
import WeekRangePicker from '@/Components/Timesheet/WeekRangePicker';
import TeammatesDropdown from '@/Components/Timesheet/TeammatesDropdown';
import TimesheetTable from '@/Components/Timesheet/TimesheetTable';
import CellEditModal from '@/Components/Timesheet/CellEditModal';
import SaveTemplateModal from '@/Components/Timesheet/SaveTemplateModal';
import {
    useTimesheetMatrix,
    useTimesheetProjects,
    useUpsertCell,
    useDeleteTimesheetRow,
    useCopyWeek,
    useCreateTemplate,
} from '@/api/queries/timesheet';
import { useUsers } from '@/api/queries/users';
import { useToast } from '@/hooks/useToast';
import useAuth from '@/hooks/useAuth';

const { Title } = Typography;
const PLACEHOLDER_PREFIX = '__placeholder__';
const PHANTOM_PREFIX = '__phantom__';

const LOCAL_TZ =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        : 'UTC';

const PRESENCE_COLORS = [
    '#FF8A00',
    '#9B5BFF',
    '#5B8FF9',
    '#FF5BCF',
    '#5BB85C',
    '#E0457A',
    '#03A9F4',
];

function colorForUser(id) {
    if (!id) return '#FF8A00';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

function TimesheetPage() {
    const toast = useToast();
    const { user, isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const { socket, connected } = useSocket();

    const [weekStart, setWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 }),
    );
    const [dense, setDense] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(user?._id || null);

    useEffect(() => {
        if (user?._id && !selectedUserId) setSelectedUserId(user._id);
    }, [user, selectedUserId]);

    const weekEnd = addDays(weekStart, 6);
    const fromStr = format(weekStart, 'yyyy-MM-dd');
    const toStr = format(weekEnd, 'yyyy-MM-dd');

    const matrixParams = useMemo(() => {
        const p = { from: fromStr, to: toStr, tz: LOCAL_TZ };
        if (isAdmin && selectedUserId && selectedUserId !== user?._id) {
            p.userId = selectedUserId;
        }
        return p;
    }, [fromStr, toStr, isAdmin, selectedUserId, user]);

    const [editing, setEditing] = useState(null);

    const { data: matrixData, isLoading } = useTimesheetMatrix(matrixParams);
    const { data: projects = [] } = useTimesheetProjects();
    const { data: users = [] } = useUsers({ enabled: isAdmin });

    const upsertCell = useUpsertCell();
    const deleteRow = useDeleteTimesheetRow();
    const copyWeek = useCopyWeek();
    const createTemplate = useCreateTemplate();
    const [templateOpen, setTemplateOpen] = useState(false);

    const [extraRows, setExtraRows] = useState([]);
    const [presenceMap, setPresenceMap] = useState(() => new Map());
    const presenceTimers = useRef(new Map());

    useEffect(() => {
        setExtraRows([]);
        setPresenceMap(new Map());
    }, [fromStr, selectedUserId]);

    const targetUserId = selectedUserId || user?._id;
    const myUserId = user?._id;

    useEffect(() => {
        if (!socket || !connected || !targetUserId) return;
        socket.emit('timesheet:join', {
            userId: targetUserId,
            weekStart: fromStr,
        });
        return () => {
            socket.emit('timesheet:leave', {
                userId: targetUserId,
                weekStart: fromStr,
            });
        };
    }, [socket, connected, targetUserId, fromStr]);

    const handleCellFocus = ({ projectId, day }) => {
        if (!socket || !connected || !targetUserId) return;
        socket.emit('cell:focus', {
            userId: targetUserId,
            weekStart: fromStr,
            projectId,
            day,
        });
    };

    const handleCellBlur = ({ projectId, day }) => {
        if (!socket || !connected || !targetUserId) return;
        socket.emit('cell:blur', {
            userId: targetUserId,
            weekStart: fromStr,
            projectId,
            day,
        });
    };

    useSocketEvent(
        'cell:focus',
        (payload) => {
            if (!payload || payload.editorId === myUserId) return;
            const key = `${payload.projectId || 'null'}|${payload.day}`;
            setPresenceMap((prev) => {
                const next = new Map(prev);
                next.set(key, {
                    editorId: payload.editorId,
                    name: payload.editorName,
                    email: payload.editorEmail,
                    color: colorForUser(payload.editorId),
                });
                return next;
            });
            const tmap = presenceTimers.current;
            if (tmap.has(key)) clearTimeout(tmap.get(key));
            tmap.set(
                key,
                setTimeout(() => {
                    setPresenceMap((prev) => {
                        const next = new Map(prev);
                        next.delete(key);
                        return next;
                    });
                    tmap.delete(key);
                }, 30000),
            );
        },
        [myUserId],
    );

    useSocketEvent(
        'cell:blur',
        (payload) => {
            if (!payload) return;
            const key = `${payload.projectId || 'null'}|${payload.day}`;
            setPresenceMap((prev) => {
                const next = new Map(prev);
                if (next.get(key)?.editorId === payload.editorId) {
                    next.delete(key);
                }
                return next;
            });
        },
        [],
    );

    useSocketEvent(
        'cell:updated',
        (payload) => {
            if (!payload) return;
            if (payload.editorId === myUserId) return;
            queryClient.invalidateQueries(['timesheet', 'matrix']);
            const key = `${payload.projectId || 'null'}|${payload.day}`;
            setPresenceMap((prev) => {
                const next = new Map(prev);
                next.delete(key);
                return next;
            });
        },
        [myUserId, queryClient],
    );

    useSocketEvent('row:deleted', () => {
        queryClient.invalidateQueries(['timesheet', 'matrix']);
    });
    useSocketEvent('week:copied', () => {
        queryClient.invalidateQueries(['timesheet', 'matrix']);
    });
    useSocketEvent('template:applied', () => {
        queryClient.invalidateQueries(['timesheet', 'matrix']);
    });

    useEffect(() => {
        return () => {
            presenceTimers.current.forEach((t) => clearTimeout(t));
            presenceTimers.current.clear();
        };
    }, []);

    const cellMap = useMemo(() => {
        const map = new Map();
        (matrixData?.cells || []).forEach((c) => {
            map.set(`${c.projectId || 'null'}|${c.day}`, c);
        });
        return map;
    }, [matrixData]);

    const projectMeta = useMemo(() => {
        const m = new Map();
        projects.forEach((p) => m.set(p._id, p));
        return m;
    }, [projects]);

    const dataRows = useMemo(() => {
        const seen = new Set();
        const rows = [];
        (matrixData?.cells || []).forEach((c) => {
            const id = c.projectId || 'no-project';
            if (seen.has(id)) return;
            seen.add(id);
            rows.push({
                key: id,
                projectId: c.projectId,
                name:
                    c.projectName ||
                    projectMeta.get(c.projectId)?.name ||
                    '(No project)',
                color:
                    c.projectColor ||
                    projectMeta.get(c.projectId)?.color ||
                    '#8C8C8C',
            });
        });
        return rows;
    }, [matrixData, projectMeta]);

    const phantomRows = extraRows
        .filter((r) => r.kind === 'phantom')
        .filter((r) => !dataRows.some((d) => d.projectId === r.projectId))
        .map((r) => ({
            key: r.key,
            projectId: r.projectId,
            name: r.name,
            color: r.color,
        }));

    const placeholderRows = extraRows
        .filter((r) => r.kind === 'placeholder')
        .map((r) => ({
            key: r.key,
            projectId: null,
            name: '',
            color: '#8C8C8C',
        }));

    const usedIds = [
        ...dataRows.map((r) => r.projectId),
        ...phantomRows.map((r) => r.projectId),
    ].filter(Boolean);

    const totalRowsBeforeTrailing = dataRows.length + phantomRows.length + placeholderRows.length;

    const allRows = useMemo(() => {
        const list = [...dataRows, ...phantomRows, ...placeholderRows];
        if (totalRowsBeforeTrailing === 0) {
            list.push({
                key: `${PLACEHOLDER_PREFIX}default`,
                projectId: null,
                name: '',
                color: '#8C8C8C',
            });
        }
        return list;
    }, [dataRows, phantomRows, placeholderRows, totalRowsBeforeTrailing]);

    const handleAddRow = () => {
        setExtraRows((prev) => [
            ...prev,
            { kind: 'placeholder', key: `${PLACEHOLDER_PREFIX}${Date.now()}` },
        ]);
    };

    const handleAddProjectRow = (placeholderKey, project) => {
        setExtraRows((prev) => {
            const without = prev.filter((p) => p.key !== placeholderKey);
            if (
                dataRows.some((r) => r.projectId === project._id) ||
                without.some((r) => r.projectId === project._id)
            ) {
                toast('warning', 'Project already in this timesheet');
                return without;
            }
            return [
                ...without,
                {
                    kind: 'phantom',
                    key: `${PHANTOM_PREFIX}${project._id}`,
                    projectId: project._id,
                    name: project.name,
                    color: project.color,
                },
            ];
        });
    };

    const handleCellChange = ({ projectId, day, durationSec }) => {
        upsertCell.mutate(
            { projectId, day, durationSec, tz: LOCAL_TZ },
            {
                onSuccess: () => {
                    setExtraRows((prev) =>
                        prev.filter(
                            (r) =>
                                !(r.kind === 'phantom' && r.projectId === projectId),
                        ),
                    );
                },
            },
        );
    };

    const handleRemoveRow = (row) => {
        if (
            row.key.startsWith(PLACEHOLDER_PREFIX) ||
            row.key.startsWith(PHANTOM_PREFIX)
        ) {
            setExtraRows((prev) => prev.filter((p) => p.key !== row.key));
            return;
        }
        deleteRow.mutate({
            projectId: row.projectId || null,
            weekStart: fromStr,
            weekEnd: toStr,
            tz: LOCAL_TZ,
        });
    };

    const handleCopyLastWeek = () => {
        const prevWeekStart = format(addDays(weekStart, -7), 'yyyy-MM-dd');
        copyWeek.mutate({
            fromWeekStart: prevWeekStart,
            toWeekStart: fromStr,
            tz: LOCAL_TZ,
        });
    };

    const copyMenu = {
        items: [
            {
                key: 'last',
                label: 'Copy from previous week',
                onClick: handleCopyLastWeek,
            },
        ],
    };

    return (
        <div
            style={{
                background: '#f6f7f9',
                minHeight: 'calc(100vh - 88px)',
                margin: -24,
                padding: '28px 32px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 18,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Title
                        level={2}
                        style={{
                            margin: 0,
                            fontWeight: 400,
                            color: '#374151',
                            fontSize: 26,
                        }}
                    >
                        Timesheet
                    </Title>
                    <Tooltip
                        title={
                            connected
                                ? 'Realtime collab connected'
                                : 'Polling fallback'
                        }
                    >
                        <Badge
                            status={connected ? 'success' : 'warning'}
                            text={connected ? 'Live' : 'Offline'}
                        />
                    </Tooltip>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {isAdmin && (
                        <TeammatesDropdown
                            users={users}
                            selectedId={selectedUserId}
                            onSelect={setSelectedUserId}
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => setDense((v) => !v)}
                        title={dense ? 'Expand rows' : 'Compact rows'}
                        style={{
                            height: 36,
                            width: 38,
                            background: '#fff',
                            border: dense
                                ? '1px solid #d8dde3'
                                : '2px solid #1f2937',
                            borderRadius: 4,
                            cursor: 'pointer',
                            color: '#6b7280',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <List size={16} />
                    </button>
                    <WeekRangePicker
                        weekStart={weekStart}
                        onChange={setWeekStart}
                    />
                </div>
            </div>

            {isLoading ? (
                <Loading height={200} />
            ) : (
                <TimesheetTable
                    weekStart={weekStart}
                    rows={allRows}
                    cellMap={cellMap}
                    dense={dense}
                    onRemoveRow={handleRemoveRow}
                    onAddProjectRow={handleAddProjectRow}
                    onCellChange={handleCellChange}
                    onOpenCellDetails={(ctx) => setEditing(ctx)}
                    onCellFocus={handleCellFocus}
                    onCellBlur={handleCellBlur}
                    presenceMap={presenceMap}
                />
            )}

            <CellEditModal
                open={Boolean(editing)}
                cellContext={editing}
                defaultTz={LOCAL_TZ}
                onClose={() => setEditing(null)}
            />

            <SaveTemplateModal
                open={templateOpen}
                saving={createTemplate.isLoading}
                onClose={() => setTemplateOpen(false)}
                onSave={({ name, includeTime }) => {
                    createTemplate.mutate(
                        {
                            name,
                            weekStart: fromStr,
                            includeTime,
                            tz: LOCAL_TZ,
                        },
                        { onSuccess: () => setTemplateOpen(false) },
                    );
                }}
            />

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 16,
                    flexWrap: 'wrap',
                    gap: 8,
                }}
            >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                        size="middle"
                        icon={<Plus size={14} />}
                        onClick={handleAddRow}
                        style={{
                            color: '#03A9F4',
                            borderColor: '#cbe9f8',
                            background: '#fff',
                            height: 36,
                        }}
                    >
                        Add new row
                    </Button>
                    <Dropdown menu={copyMenu} trigger={['click']}>
                        <Button
                            size="middle"
                            icon={<Copy size={14} />}
                            loading={copyWeek.isLoading}
                            style={{ height: 36, color: '#6b7280' }}
                        >
                            Copy last week <ChevronDown size={12} />
                        </Button>
                    </Dropdown>
                    <Button
                        size="middle"
                        icon={<FileText size={14} />}
                        onClick={() => setTemplateOpen(true)}
                        style={{ height: 36, color: '#6b7280' }}
                    >
                        Save as template
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default withAuth(TimesheetPage);
