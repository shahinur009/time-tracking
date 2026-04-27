import { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Select, Button, Switch, DatePicker } from 'antd';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { format, parse } from 'date-fns';
import { formatHMS, parseHMS } from './CellInput';
import { useTags } from '@/api/queries/tags';
import { useProjects } from '@/api/queries/projects';
import { useEntry, useUpdateEntry, useDeleteEntry } from '@/api/queries/entries';
import { useUpsertCell } from '@/api/queries/timesheet';
import { useUsers } from '@/api/queries/users';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

function pad(n) {
    return String(n).padStart(2, '0');
}

function secondsToHHMM(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${pad(h)}:${pad(m)}`;
}

function parseHHMM(value) {
    if (!value) return null;
    const m = String(value).trim().match(/^(\d{1,2}):?(\d{2})?$/);
    if (!m) return null;
    const h = Math.min(23, parseInt(m[1] || '0', 10));
    const min = Math.min(59, parseInt(m[2] || '0', 10));
    return h * 3600 + min * 60;
}

function CellEditModal({ open, onClose, cellContext, defaultTz }) {
    const toast = useToast();
    const { isAdmin } = useAuth();
    const { data: tags = [] } = useTags();
    const { data: projects = [] } = useProjects();
    const { data: usersList = [] } = useUsers({ enabled: isAdmin });

    const updateEntry = useUpdateEntry();
    const deleteEntry = useDeleteEntry();
    const upsertCell = useUpsertCell();

    const entryId =
        cellContext?.cell?.timesheetEntryIds?.[0] ||
        cellContext?.cell?.trackerEntryIds?.[0] ||
        null;
    const { data: entry } = useEntry(open ? entryId : null);

    const [dayStr, setDayStr] = useState('');
    const [duration, setDuration] = useState('00:00:00');
    const [startStr, setStartStr] = useState('09:00');
    const [endStr, setEndStr] = useState('09:00');
    const [description, setDescription] = useState('');
    const [billable, setBillable] = useState(false);
    const [tagIds, setTagIds] = useState([]);
    const [projectId, setProjectId] = useState(null);
    const [ownerId, setOwnerId] = useState(null);

    useEffect(() => {
        if (!open || !cellContext) return;
        setDayStr(cellContext.day);
        setDuration(formatHMS(cellContext.cell?.totalSec || 0));
        setProjectId(cellContext.row?.projectId || null);

        if (entry) {
            const start = entry.startTime ? new Date(entry.startTime) : null;
            const end = entry.endTime ? new Date(entry.endTime) : null;
            setStartStr(start ? format(start, 'HH:mm') : '09:00');
            setEndStr(end ? format(end, 'HH:mm') : '09:00');
            setDescription(entry.description || '');
            setBillable(Boolean(entry.billable));
            setTagIds(
                Array.isArray(entry.tags)
                    ? entry.tags.map((t) => (typeof t === 'string' ? t : t._id))
                    : [],
            );
            setOwnerId(
                entry.userId
                    ? typeof entry.userId === 'string'
                        ? entry.userId
                        : entry.userId._id
                    : null,
            );
            if (isAdmin) {
                setProjectId(
                    entry.projectId
                        ? typeof entry.projectId === 'string'
                            ? entry.projectId
                            : entry.projectId._id
                        : null,
                );
            }
        } else {
            setStartStr('09:00');
            const dur = cellContext.cell?.totalSec || 0;
            setEndStr(secondsToHHMM(9 * 3600 + dur));
            setDescription('');
            setBillable(false);
            setTagIds([]);
            setOwnerId(null);
        }
    }, [open, cellContext, entry, isAdmin]);

    const projectOptions = useMemo(
        () =>
            projects.map((p) => ({
                value: p._id,
                label: p.name,
                color: p.color,
            })),
        [projects],
    );

    if (!cellContext) return null;

    const { row } = cellContext;
    const trackerSec = cellContext.cell?.trackerSec || 0;

    const dateValue = dayStr ? dayjs(dayStr, 'YYYY-MM-DD') : null;

    const onDurationChange = (val) => {
        setDuration(val);
    };

    const onDurationBlur = () => {
        const secs = parseHMS(duration);
        setDuration(formatHMS(secs));
        const startSec = parseHHMM(startStr);
        if (startSec !== null) {
            const endSec = (startSec + secs) % (24 * 3600);
            setEndStr(secondsToHHMM(endSec));
        }
    };

    const onStartBlur = () => {
        const startSec = parseHHMM(startStr);
        if (startSec === null) return;
        setStartStr(secondsToHHMM(startSec));
        const dur = parseHMS(duration);
        const endSec = (startSec + dur) % (24 * 3600);
        setEndStr(secondsToHHMM(endSec));
    };

    const onEndBlur = () => {
        const startSec = parseHHMM(startStr);
        const endSec = parseHHMM(endStr);
        if (startSec === null || endSec === null) return;
        setEndStr(secondsToHHMM(endSec));
        let diff = endSec - startSec;
        if (diff < 0) diff += 24 * 3600;
        setDuration(formatHMS(diff));
    };

    const handleSave = () => {
        const durationSec = parseHMS(duration);

        if (entryId) {
            const startTime = parse(
                `${dayStr} ${startStr}`,
                'yyyy-MM-dd HH:mm',
                new Date(),
            );
            const endTime = new Date(startTime.getTime() + durationSec * 1000);
            const patch = {
                id: entryId,
                description,
                billable,
                tags: tagIds,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: durationSec,
            };
            if (isAdmin) {
                if (projectId !== undefined) patch.projectId = projectId;
                if (ownerId) patch.userId = ownerId;
            }
            updateEntry.mutate(patch, {
                onSuccess: () => {
                    onClose?.();
                },
            });
        } else {
            if (durationSec === 0) {
                toast('warning', 'Duration must be greater than zero');
                return;
            }
            upsertCell.mutate(
                {
                    projectId: projectId || row?.projectId,
                    day: dayStr,
                    durationSec,
                    description,
                    billable,
                    tz: defaultTz,
                },
                {
                    onSuccess: () => {
                        onClose?.();
                    },
                },
            );
        }
    };

    const handleDelete = () => {
        if (!entryId) {
            onClose?.();
            return;
        }
        deleteEntry.mutate(entryId, {
            onSuccess: () => {
                onClose?.();
            },
        });
    };

    const niceDate = dateValue ? dateValue.format('DD/MM/YYYY') : '';

    const saving = updateEntry.isLoading || upsertCell.isLoading;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={null}
            footer={null}
            width={640}
            destroyOnClose
            maskClosable={!saving}
            closable={!saving}
        >
            <div style={{ paddingTop: 4 }}>
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: 500,
                        color: '#1f2937',
                        paddingBottom: 16,
                        borderBottom: '1px solid #e5e7eb',
                        marginBottom: 16,
                    }}
                >
                    Edit time
                </div>

                <div style={{ marginBottom: 6 }}>
                    {isAdmin ? (
                        <DatePicker
                            value={dateValue}
                            allowClear={false}
                            format="DD/MM/YYYY"
                            onChange={(d) =>
                                setDayStr(d ? d.format('YYYY-MM-DD') : dayStr)
                            }
                            variant="borderless"
                            style={{ padding: 0, color: '#9ca3af', fontSize: 14 }}
                            suffixIcon={null}
                        />
                    ) : (
                        <span style={{ color: '#9ca3af', fontSize: 14 }}>
                            {niceDate}
                        </span>
                    )}
                </div>

                <div style={{ marginBottom: 18 }}>
                    {isAdmin ? (
                        <Select
                            value={projectId}
                            onChange={setProjectId}
                            options={projectOptions}
                            placeholder="Project"
                            variant="borderless"
                            style={{ minWidth: 220, padding: 0, fontSize: 16 }}
                            optionRender={(opt) => (
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
                                            background: opt.data.color || '#8C8C8C',
                                        }}
                                    />
                                    {opt.label}
                                </span>
                            )}
                        />
                    ) : (
                        <span
                            style={{
                                fontSize: 16,
                                color: row?.color || '#1f2937',
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
                                    background: row?.color || '#8C8C8C',
                                }}
                            />
                            {row?.name || ''}
                        </span>
                    )}
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        paddingTop: 16,
                        paddingBottom: 16,
                        borderTop: '1px solid #e5e7eb',
                    }}
                >
                    <Input
                        value={duration}
                        onChange={(e) => onDurationChange(e.target.value)}
                        onBlur={onDurationBlur}
                        onPressEnter={onDurationBlur}
                        style={{
                            width: 130,
                            height: 44,
                            fontSize: 18,
                            fontWeight: 600,
                            textAlign: 'center',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    />
                    <Input
                        value={startStr}
                        onChange={(e) => setStartStr(e.target.value)}
                        onBlur={onStartBlur}
                        onPressEnter={onStartBlur}
                        style={{
                            width: 80,
                            height: 44,
                            textAlign: 'center',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    />
                    <span style={{ color: '#6b7280' }}>—</span>
                    <Input
                        value={endStr}
                        onChange={(e) => setEndStr(e.target.value)}
                        onBlur={onEndBlur}
                        onPressEnter={onEndBlur}
                        style={{
                            width: 80,
                            height: 44,
                            textAlign: 'center',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    />
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                    <FieldRow label="Description">
                        <Input.TextArea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            autoSize={{ minRows: 2, maxRows: 5 }}
                        />
                    </FieldRow>

                    <FieldRow label="Tags">
                        <Select
                            mode="multiple"
                            placeholder="Select tags"
                            value={tagIds}
                            onChange={setTagIds}
                            options={tags.map((t) => ({
                                value: t._id,
                                label: t.name,
                            }))}
                            style={{ width: '100%' }}
                        />
                    </FieldRow>

                    {isAdmin && (
                        <FieldRow label="User">
                            <Select
                                placeholder="Select user"
                                value={ownerId}
                                onChange={setOwnerId}
                                options={usersList.map((u) => ({
                                    value: u._id,
                                    label: u.name || u.email,
                                }))}
                                showSearch
                                optionFilterProp="label"
                                style={{ width: '100%' }}
                            />
                        </FieldRow>
                    )}

                    <FieldRow label="Billable">
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            <Switch
                                checked={billable}
                                onChange={setBillable}
                                style={{ background: billable ? '#03A9F4' : undefined }}
                            />
                            <span style={{ color: '#1f2937', fontSize: 14 }}>
                                {billable ? 'Yes' : 'No'}
                            </span>
                        </span>
                    </FieldRow>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 18,
                        borderTop: '1px solid #e5e7eb',
                    }}
                >
                    {entryId && isAdmin ? (
                        <Trash2
                            size={18}
                            onClick={handleDelete}
                            style={{
                                color: '#9ca3af',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.color = '#ef4444')
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.color = '#9ca3af')
                            }
                        />
                    ) : (
                        <MoreHorizontal size={18} color="#9ca3af" />
                    )}

                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 18,
                        }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            style={{
                                all: 'unset',
                                cursor: saving ? 'default' : 'pointer',
                                color: '#03A9F4',
                                fontSize: 14,
                                opacity: saving ? 0.5 : 1,
                            }}
                        >
                            Cancel
                        </button>
                        <Button
                            type="primary"
                            loading={saving}
                            onClick={handleSave}
                            style={{
                                background: '#03A9F4',
                                borderColor: '#03A9F4',
                                fontWeight: 600,
                                letterSpacing: 0.4,
                                paddingInline: 28,
                                height: 38,
                                textTransform: 'uppercase',
                            }}
                        >
                            Save
                        </Button>
                    </span>
                </div>
            </div>
        </Modal>
    );
}

function FieldRow({ label, children }) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 14,
            }}
        >
            <div style={{ paddingTop: 6, color: '#1f2937', fontSize: 14 }}>
                {label}
            </div>
            <div>{children}</div>
        </div>
    );
}

export default CellEditModal;
