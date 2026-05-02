import { useMemo, useState } from 'react';
import { Calendar as AntCalendar, Typography, Card, Empty, Modal } from 'antd';
import dayjs from 'dayjs';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import withAuth from '@/hoc/withAuth';
import { useCalendar } from '@/lib/queries/reports';
import { formatDuration } from '@/utils/format';

const { Title, Text } = Typography;

const MAX_VISIBLE_PER_DAY = 3;

function CalendarPage() {
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [moreOpen, setMoreOpen] = useState(null);

    const monthStart = startOfMonth(selectedDate.toDate());
    const monthEnd = endOfMonth(selectedDate.toDate());

    const { data: entries = [] } = useCalendar({
        from: monthStart.toISOString(),
        to: monthEnd.toISOString(),
    });

    const byDay = useMemo(() => {
        const map = {};
        for (const e of entries) {
            const key = format(new Date(e.startTime), 'yyyy-MM-dd');
            if (!map[key]) map[key] = [];
            map[key].push(e);
        }
        return map;
    }, [entries]);

    const openMore = (e, dayValue, items) => {
        e.stopPropagation();
        setMoreOpen({ dayValue, items });
    };

    const dateCellRender = (value) => {
        const key = value.format('YYYY-MM-DD');
        const items = byDay[key] || [];
        if (items.length === 0) return null;
        const visible = items.slice(0, MAX_VISIBLE_PER_DAY);
        const remaining = items.length - visible.length;
        return (
            <div className="tt-cal-cell">
                {visible.map((e) => (
                    <div
                        key={e._id}
                        className="tt-cal-chip"
                        title={`${e.description || '(no description)'} — ${formatDuration(
                            e.duration,
                        )}`}
                        style={{
                            background: e.projectId?.color || '#03a9f4',
                        }}
                    >
                        <span className="tt-cal-chip-text">
                            {e.description || '(no description)'}
                        </span>
                        <span className="tt-cal-chip-dur">
                            {formatDuration(e.duration)}
                        </span>
                    </div>
                ))}
                {remaining > 0 && (
                    <button
                        type="button"
                        className="tt-cal-more"
                        onClick={(ev) => openMore(ev, value, items)}
                    >
                        +{remaining} more
                    </button>
                )}
            </div>
        );
    };

    const selectedKey = selectedDate.format('YYYY-MM-DD');
    const selectedItems = byDay[selectedKey] || [];
    const selectedTotal = selectedItems.reduce(
        (s, e) => s + (e.duration || 0),
        0,
    );

    return (
        <>
            <div className="page-head">
                <Title
                    level={3}
                    style={{
                        margin: 0,
                        fontSize: 'clamp(18px, 2.6vw, 24px)',
                    }}
                >
                    Calendar
                </Title>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}
            >
                <Card bodyStyle={{ padding: 'clamp(8px, 1.5vw, 16px)' }}>
                    <AntCalendar
                        value={selectedDate}
                        onSelect={setSelectedDate}
                        cellRender={(date, info) =>
                            info.type === 'date' ? dateCellRender(date) : null
                        }
                    />
                </Card>
                <Card
                    title={
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            <span
                                style={{ fontSize: 'clamp(14px, 2vw, 16px)' }}
                            >
                                {selectedDate.format('MMMM D, YYYY')}
                            </span>
                            {selectedItems.length > 0 && (
                                <Text
                                    type="secondary"
                                    style={{
                                        fontSize: 'clamp(12px, 1.6vw, 14px)',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {selectedItems.length} entries ·{' '}
                                    {formatDuration(selectedTotal)}
                                </Text>
                            )}
                        </div>
                    }
                    bodyStyle={{ padding: 0 }}
                >
                    {selectedItems.length === 0 ? (
                        <div style={{ padding: 24 }}>
                            <Empty
                                description="No entries on this day"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        </div>
                    ) : (
                        <DayEntriesTable items={selectedItems} />
                    )}
                </Card>
            </div>

            <Modal
                open={!!moreOpen}
                onCancel={() => setMoreOpen(null)}
                footer={null}
                width="min(720px, 96vw)"
                title={
                    moreOpen ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            <span>
                                {moreOpen.dayValue.format('MMMM D, YYYY')}
                            </span>
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: 13,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {moreOpen.items.length} entries ·{' '}
                                {formatDuration(
                                    moreOpen.items.reduce(
                                        (s, e) => s + (e.duration || 0),
                                        0,
                                    ),
                                )}
                            </Text>
                        </div>
                    ) : null
                }
                styles={{ body: { padding: 0, maxHeight: '70vh', overflow: 'auto' } }}
                destroyOnClose
            >
                {moreOpen && <DayEntriesTable items={moreOpen.items} />}
            </Modal>
        </>
    );
}

function DayEntriesTable({ items }) {
    return (
        <div className="tt-cal-table">
            <div className="tt-cal-row tt-cal-head">
                <div>Task</div>
                <div>Project</div>
                <div className="tt-cal-time">Start</div>
                <div className="tt-cal-time">End</div>
                <div className="tt-cal-dur">Duration</div>
            </div>
            {items.map((e) => (
                <div key={e._id} className="tt-cal-row">
                    <div className="tt-cal-task" title={e.description || ''}>
                        {e.description || '(no description)'}
                    </div>
                    <div className="tt-cal-project">
                        <span
                            className="tt-cal-dot"
                            style={{
                                background:
                                    e.projectId?.color || '#d9d9d9',
                            }}
                        />
                        <span className="tt-cal-project-name">
                            {e.projectId?.name || 'No project'}
                        </span>
                    </div>
                    <div className="tt-cal-time">
                        {format(new Date(e.startTime), 'HH:mm')}
                    </div>
                    <div className="tt-cal-time">
                        {e.endTime
                            ? format(new Date(e.endTime), 'HH:mm')
                            : '—'}
                    </div>
                    <div className="tt-cal-dur">
                        {formatDuration(e.duration)}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default withAuth(CalendarPage);
