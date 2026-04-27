import { useMemo, useState } from 'react';
import { Calendar as AntCalendar, Typography, Badge, Card, List } from 'antd';
import dayjs from 'dayjs';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import withAuth from '@/hoc/withAuth';
import { useCalendar } from '@/api/queries/reports';
import { formatDuration } from '@/utils/format';

const { Title, Text } = Typography;

function CalendarPage() {
    const [selectedDate, setSelectedDate] = useState(dayjs());

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

    const dateCellRender = (value) => {
        const key = value.format('YYYY-MM-DD');
        const items = byDay[key] || [];
        if (items.length === 0) return null;
        const total = items.reduce((s, e) => s + (e.duration || 0), 0);
        return (
            <div style={{ fontSize: 11 }}>
                <Badge
                    color="#03a9f4"
                    text={
                        <span>
                            <strong>{formatDuration(total)}</strong>
                        </span>
                    }
                />
                <div style={{ color: '#888' }}>{items.length} entries</div>
            </div>
        );
    };

    const selectedKey = selectedDate.format('YYYY-MM-DD');
    const selectedItems = byDay[selectedKey] || [];

    return (
        <>
            <div className="page-head">
                <Title level={3} style={{ margin: 0 }}>
                    Calendar
                </Title>
            </div>
            <div className="tt-calendar-grid">
                <Card>
                    <AntCalendar
                        value={selectedDate}
                        onSelect={setSelectedDate}
                        cellRender={(date, info) =>
                            info.type === 'date' ? dateCellRender(date) : null
                        }
                    />
                </Card>
                <Card title={selectedDate.format('MMMM D, YYYY')}>
                    {selectedItems.length === 0 ? (
                        <Text type="secondary">No entries on this day</Text>
                    ) : (
                        <List
                            dataSource={selectedItems}
                            renderItem={(e) => (
                                <List.Item>
                                    <div style={{ width: '100%' }}>
                                        <div style={{ fontWeight: 600 }}>
                                            {e.description || '(no description)'}
                                        </div>
                                        <div style={{ color: '#888', fontSize: 12 }}>
                                            {e.projectId?.name || 'No project'} •{' '}
                                            {formatDuration(e.duration)}
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </div>
        </>
    );
}

export default withAuth(CalendarPage);
