import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import {
    addDays,
    addMonths,
    endOfMonth,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
} from 'date-fns';

const PRESETS = [
    { key: 'this', label: 'This week', resolve: () => startOfWeek(new Date(), { weekStartsOn: 1 }) },
    { key: 'last', label: 'Last week', resolve: () => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), -7) },
];

function buildMonthGrid(monthDate) {
    const first = startOfMonth(monthDate);
    const last = endOfMonth(monthDate);
    const start = startOfWeek(first, { weekStartsOn: 1 });
    const end = startOfWeek(addDays(last, 6), { weekStartsOn: 1 });
    const days = [];
    let cur = start;
    while (cur <= end || days.length % 7 !== 0) {
        days.push(cur);
        cur = addDays(cur, 1);
        if (days.length >= 42) break;
    }
    return days;
}

function isInWeek(d, weekStart) {
    const wEnd = addDays(weekStart, 6);
    return d >= weekStart && d <= wEnd;
}

function WeekRangePicker({ weekStart, onChange }) {
    const [open, setOpen] = useState(false);
    const [leftMonth, setLeftMonth] = useState(() => startOfMonth(weekStart));
    const wrapRef = useRef(null);

    useEffect(() => {
        if (open) setLeftMonth(startOfMonth(weekStart));
    }, [open, weekStart]);

    useEffect(() => {
        function handler(e) {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        }
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const weekEnd = addDays(weekStart, 6);
    const today = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lastWeek = addDays(today, -7);
    const activePreset = isSameDay(weekStart, today)
        ? 'this'
        : isSameDay(weekStart, lastWeek)
            ? 'last'
            : null;

    const presetLabel = activePreset
        ? PRESETS.find((p) => p.key === activePreset)?.label
        : null;
    const labelText =
        presetLabel ||
        `${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`;

    const months = useMemo(
        () => [leftMonth, addMonths(leftMonth, 1)],
        [leftMonth],
    );

    const pickDay = (d) => {
        onChange(startOfWeek(d, { weekStartsOn: 1 }));
        setOpen(false);
    };

    const shift = (delta) => onChange(addDays(weekStart, delta));

    return (
        <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', gap: 0 }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 36,
                    padding: '0 12px',
                    background: '#fff',
                    border: '1px solid #d8dde3',
                    borderRight: 'none',
                    borderTopLeftRadius: 4,
                    borderBottomLeftRadius: 4,
                    cursor: 'pointer',
                    color: '#374151',
                    fontSize: 13,
                    minWidth: 220,
                }}
            >
                <CalIcon size={14} color="#6b7280" />
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{labelText}</span>
            </button>
            <button
                type="button"
                onClick={() => shift(-7)}
                style={navBtn(false)}
                aria-label="Previous week"
            >
                <ChevronLeft size={14} />
            </button>
            <button
                type="button"
                onClick={() => shift(7)}
                style={navBtn(true)}
                aria-label="Next week"
            >
                <ChevronRight size={14} />
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        display: 'flex',
                        zIndex: 1000,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <div
                        style={{
                            width: 130,
                            borderRight: '1px solid #eef0f3',
                            padding: '6px 0',
                        }}
                    >
                        {PRESETS.map((p) => (
                            <div
                                key={p.key}
                                onClick={() => pickDay(p.resolve())}
                                style={{
                                    padding: '8px 14px',
                                    cursor: 'pointer',
                                    background: activePreset === p.key ? '#03A9F4' : 'transparent',
                                    color: activePreset === p.key ? '#fff' : '#374151',
                                    fontSize: 13,
                                    fontWeight: activePreset === p.key ? 600 : 400,
                                }}
                                onMouseEnter={(e) => {
                                    if (activePreset !== p.key) {
                                        e.currentTarget.style.background = '#f3f4f6';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activePreset !== p.key) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                {p.label}
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: 12 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 8,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setLeftMonth(addMonths(leftMonth, -1))}
                                style={iconBtn}
                                aria-label="Prev month"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                                {format(leftMonth, 'MMM yyyy')}
                            </div>
                            <div style={{ flex: 1 }} />
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                                {format(addMonths(leftMonth, 1), 'MMM yyyy')}
                            </div>
                            <button
                                type="button"
                                onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
                                style={iconBtn}
                                aria-label="Next month"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 18 }}>
                            {months.map((m, mi) => (
                                <Month
                                    key={mi}
                                    monthDate={m}
                                    weekStart={weekStart}
                                    onPick={pickDay}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Month({ monthDate, weekStart, onPick }) {
    const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
    const dowLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    return (
        <div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 32px)',
                    gap: 0,
                    marginBottom: 4,
                }}
            >
                {dowLabels.map((d) => (
                    <div
                        key={d}
                        style={{
                            textAlign: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#6b7280',
                            padding: '4px 0',
                        }}
                    >
                        {d}
                    </div>
                ))}
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 32px)',
                    gap: 0,
                }}
            >
                {days.map((d, i) => {
                    const inMonth = isSameMonth(d, monthDate);
                    const inWeek = isInWeek(d, weekStart);
                    const isStart = isSameDay(d, weekStart);
                    const isEnd = isSameDay(d, addDays(weekStart, 6));
                    return (
                        <div
                            key={i}
                            onClick={() => onPick(d)}
                            style={{
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                cursor: 'pointer',
                                color: !inMonth
                                    ? '#d1d5db'
                                    : inWeek
                                        ? '#fff'
                                        : '#374151',
                                background: inWeek
                                    ? isStart || isEnd
                                        ? '#03A9F4'
                                        : '#daf0fb'
                                    : 'transparent',
                                borderTopLeftRadius: isStart ? 4 : 0,
                                borderBottomLeftRadius: isStart ? 4 : 0,
                                borderTopRightRadius: isEnd ? 4 : 0,
                                borderBottomRightRadius: isEnd ? 4 : 0,
                                fontWeight: isStart || isEnd ? 600 : 400,
                            }}
                        >
                            {format(d, 'd')}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function navBtn(right) {
    return {
        width: 36,
        height: 36,
        background: '#fff',
        border: '1px solid #d8dde3',
        borderRight: right ? '1px solid #d8dde3' : 'none',
        borderTopRightRadius: right ? 4 : 0,
        borderBottomRightRadius: right ? 4 : 0,
        cursor: 'pointer',
        color: '#6b7280',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
}

const iconBtn = {
    width: 24,
    height: 24,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#6b7280',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
};

export default WeekRangePicker;
