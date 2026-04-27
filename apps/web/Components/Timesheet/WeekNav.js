import { Button, DatePicker, Space } from 'antd';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import dayjs from 'dayjs';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';

function WeekNav({ weekStart, onChange }) {
    const weekEnd = addDays(weekStart, 6);
    const today = startOfWeek(new Date(), { weekStartsOn: 1 });
    const isThisWeek = isSameDay(weekStart, today);

    const shift = (days) => onChange(addDays(weekStart, days));

    const label = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

    return (
        <Space wrap>
            <Button
                size="small"
                onClick={() => onChange(today)}
                type={isThisWeek ? 'primary' : 'default'}
                ghost={isThisWeek}
                style={isThisWeek ? { borderColor: '#03A9F4', color: '#03A9F4' } : undefined}
            >
                This week
            </Button>
            <Space.Compact>
                <Button size="small" onClick={() => shift(-7)} icon={<ChevronLeft size={14} />} />
                <Button
                    size="small"
                    style={{ minWidth: 200, fontVariantNumeric: 'tabular-nums' }}
                    icon={<CalendarRange size={14} style={{ marginRight: 4 }} />}
                    onClick={() => shift(0)}
                >
                    {label}
                </Button>
                <Button size="small" onClick={() => shift(7)} icon={<ChevronRight size={14} />} />
            </Space.Compact>
            <DatePicker
                size="small"
                picker="week"
                value={dayjs(weekStart)}
                allowClear={false}
                onChange={(val) =>
                    val && onChange(startOfWeek(val.toDate(), { weekStartsOn: 1 }))
                }
            />
        </Space>
    );
}

export default WeekNav;
