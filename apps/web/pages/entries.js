import { useEffect, useState } from 'react';
import {
    Table,
    Typography,
    DatePicker,
    Popconfirm,
    Button,
    Tag,
    Select,
    Input,
} from 'antd';
import { Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import withAdmin from '@/hoc/withAdmin';
import Loading from '@/Components/Loading';
import { useEntries, useDeleteEntry, useUpdateEntry } from '@/lib/queries/entries';
import { useProjects } from '@/lib/queries/projects';
import { useUsers } from '@/lib/queries/users';
import usePagination from '@/hooks/usePagination';
import { formatDuration } from '@/utils/format';
import { parseHMS, formatHMS } from '@/Components/Timesheet/CellInput';

const { Title } = Typography;
const { RangePicker } = DatePicker;

function EntriesPage() {
    const [range, setRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);
    const [userFilter, setUserFilter] = useState(null);

    const params = {
        from: range[0].toISOString(),
        to: range[1].toISOString(),
    };
    if (userFilter) params.userId = userFilter;

    const { paginationProps } = usePagination({
        defaultPageSize: 25,
        resetKey: JSON.stringify(params),
    });

    const { data = [], isLoading } = useEntries(params);
    const { data: projects = [] } = useProjects();
    const { data: users = [] } = useUsers();
    const del = useDeleteEntry();
    const update = useUpdateEntry();

    const commitDuration = (row, secs) => {
        if (secs === row.duration) return;
        const start = new Date(row.startTime);
        const end = new Date(start.getTime() + secs * 1000);
        update.mutate({
            id: row._id,
            duration: secs,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
        });
    };

    return (
        <>
            <div
                className="page-head"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 16,
                }}
            >
                <Title level={3} style={{ margin: 0 }}>
                    All entries
                </Title>
                <div
                    style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                    }}
                >
                    <Select
                        placeholder="All users"
                        style={{ minWidth: 180 }}
                        allowClear
                        value={userFilter}
                        onChange={setUserFilter}
                        options={users.map((u) => ({
                            label: u.name,
                            value: u._id,
                        }))}
                    />
                    <RangePicker
                        value={range}
                        onChange={(v) => v && setRange(v)}
                    />
                </div>
            </div>
            {isLoading ? (
                <Loading height={200} />
            ) : (
                <div
                    style={{
                        width: '100%',
                        minWidth: 0,
                    }}
                >
                <Table
                    dataSource={data}
                    rowKey="_id"
                    size="middle"
                    bordered
                    scroll={{ x: 'auto' }}
                    style={{ whiteSpace: 'nowrap' }}
                    pagination={paginationProps}
                    columns={[
                        {
                            title: 'Start',
                            dataIndex: 'startTime',
                            width: 220,
                            render: (_, row) => (
                                <StartCell row={row} update={update} />
                            ),
                        },
                        {
                            title: 'End',
                            dataIndex: 'endTime',
                            width: 130,
                            render: (_, row) =>
                                row.endTime ? (
                                    <EndCell row={row} update={update} />
                                ) : (
                                    <Tag>running</Tag>
                                ),
                        },
                        {
                            title: 'User',
                            width: 180,
                            render: (_, row) => (
                                <Select
                                    size="small"
                                    value={
                                        row.userId?._id ||
                                        (typeof row.userId === 'string'
                                            ? row.userId
                                            : null)
                                    }
                                    showSearch
                                    optionFilterProp="label"
                                    style={{ width: '100%' }}
                                    onChange={(val) =>
                                        update.mutate({
                                            id: row._id,
                                            userId: val,
                                        })
                                    }
                                    options={users.map((u) => ({
                                        label: u.name || u.email,
                                        value: u._id,
                                    }))}
                                />
                            ),
                        },
                        {
                            title: 'Project',
                            width: 200,
                            render: (_, row) => (
                                <Select
                                    size="small"
                                    value={
                                        row.projectId?._id ||
                                        row.projectId ||
                                        null
                                    }
                                    onChange={(val) =>
                                        update.mutate({
                                            id: row._id,
                                            projectId: val,
                                        })
                                    }
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    style={{ width: '100%' }}
                                    options={projects.map((p) => ({
                                        label: p.name,
                                        value: p._id,
                                    }))}
                                />
                            ),
                        },
                        {
                            title: 'Description',
                            ellipsis: true,
                            render: (_, row) => (
                                <DescriptionCell row={row} update={update} />
                            ),
                        },
                        {
                            title: 'Duration',
                            dataIndex: 'duration',
                            align: 'right',
                            width: 130,
                            render: (_, row) => (
                                <DurationCell
                                    row={row}
                                    onCommit={commitDuration}
                                />
                            ),
                        },
                        {
                            title: '',
                            align: 'center',
                            width: 64,
                            render: (_, row) => (
                                <Popconfirm
                                    title="Delete entry?"
                                    onConfirm={() => del.mutate(row._id)}
                                >
                                    <Button
                                        size="small"
                                        danger
                                        icon={<Trash2 size={14} />}
                                    />
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
                </div>
            )}
        </>
    );
}

function StartCell({ row, update }) {
    const value = row.startTime ? dayjs(row.startTime) : null;
    return (
        <DatePicker
            size="small"
            value={value}
            allowClear={false}
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            onChange={(d) => {
                if (!d) return;
                const newStart = d.toDate();
                const oldStart = new Date(row.startTime);
                const oldEnd = row.endTime ? new Date(row.endTime) : null;
                const delta = newStart.getTime() - oldStart.getTime();
                const patch = {
                    id: row._id,
                    startTime: newStart.toISOString(),
                };
                if (oldEnd) {
                    patch.endTime = new Date(oldEnd.getTime() + delta).toISOString();
                }
                update.mutate(patch);
            }}
            style={{ minWidth: 180 }}
        />
    );
}

function EndCell({ row, update }) {
    const value = row.endTime ? dayjs(row.endTime) : null;
    return (
        <DatePicker
            size="small"
            value={value}
            picker="time"
            format="HH:mm"
            allowClear={false}
            onChange={(t) => {
                if (!t) return;
                const start = new Date(row.startTime);
                const next = new Date(start);
                next.setHours(t.hour(), t.minute(), 0, 0);
                if (next <= start) {
                    next.setDate(next.getDate() + 1);
                }
                update.mutate({
                    id: row._id,
                    endTime: next.toISOString(),
                });
            }}
            style={{ minWidth: 110 }}
        />
    );
}

function DescriptionCell({ row, update }) {
    const [text, setText] = useState(row.description || '');
    useEffect(() => {
        setText(row.description || '');
    }, [row.description]);
    const commit = () => {
        if (text === (row.description || '')) return;
        update.mutate({ id: row._id, description: text });
    };
    return (
        <Input
            size="small"
            value={text}
            placeholder="—"
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onPressEnter={(e) => e.target.blur()}
        />
    );
}

function DurationCell({ row, onCommit }) {
    const [text, setText] = useState(formatDuration(row.duration || 0));
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        if (!focused) setText(formatDuration(row.duration || 0));
    }, [row.duration, focused]);
    return (
        <Input
            size="small"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => {
                setFocused(true);
                e.target.select();
            }}
            onBlur={() => {
                setFocused(false);
                const secs = parseHMS(text);
                setText(formatHMS(secs));
                onCommit(row, secs);
            }}
            onPressEnter={(e) => e.target.blur()}
            style={{
                width: 100,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
            }}
        />
    );
}

export default withAdmin(EntriesPage);
