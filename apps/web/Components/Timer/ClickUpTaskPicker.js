import { useEffect, useState } from 'react';
import { Empty, Spin, Tag, Input } from 'antd';
import { Search } from 'lucide-react';
import { useClickupTasks } from '../../api/queries/clickup';

function useDebounced(value, delay = 250) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

function ClickUpTaskPicker({ value, onSelect, assigneeMeOnly = true, limit = 50 }) {
    const [q, setQ] = useState('');
    const debounced = useDebounced(q, 250);
    const params = {
        q: debounced || undefined,
        assigneeMe: assigneeMeOnly ? 'true' : undefined,
        limit,
    };
    const { data: tasks = [], isLoading, isFetching } = useClickupTasks(params);

    return (
        <div style={{ width: 360, maxHeight: 420, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>
                <Input
                    autoFocus
                    prefix={<Search size={14} color="#8c8c8c" />}
                    placeholder="Search ClickUp tasks…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    allowClear
                />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {isLoading ? (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                        <Spin />
                    </div>
                ) : tasks.length === 0 ? (
                    <Empty
                        style={{ padding: 24 }}
                        description={
                            debounced
                                ? `No tasks match "${debounced}"`
                                : 'No tasks cached. Re-sync from Settings.'
                        }
                    />
                ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 4 }}>
                        {tasks.map((t) => {
                            const selected = value === t.clickupTaskId;
                            return (
                                <li key={t._id || t.clickupTaskId}>
                                    <button
                                        type="button"
                                        onClick={() => onSelect(t)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            background: selected ? '#e6f4ff' : 'transparent',
                                            border: 'none',
                                            borderRadius: 4,
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            display: 'block',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: '#222',
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {t.name}
                                        </div>
                                        <div
                                            style={{
                                                marginTop: 4,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                fontSize: 11,
                                                color: '#8c8c8c',
                                            }}
                                        >
                                            {t.status && (
                                                <Tag style={{ margin: 0 }} color="default">
                                                    {t.status}
                                                </Tag>
                                            )}
                                            {t.priority && (
                                                <Tag style={{ margin: 0 }} color="orange">
                                                    {t.priority}
                                                </Tag>
                                            )}
                                            <span style={{ color: '#bfbfbf' }}>
                                                {t.clickupTaskId}
                                            </span>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            {isFetching && !isLoading && (
                <div
                    style={{
                        padding: 6,
                        fontSize: 11,
                        textAlign: 'center',
                        color: '#8c8c8c',
                        borderTop: '1px solid #f0f0f0',
                    }}
                >
                    Updating…
                </div>
            )}
        </div>
    );
}

export default ClickUpTaskPicker;
