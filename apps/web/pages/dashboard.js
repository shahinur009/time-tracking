import { useMemo, useState } from 'react';
import { Typography, Empty, Dropdown, Popover, Button } from 'antd';
import {
    LeftOutlined,
    RightOutlined,
    CalendarOutlined,
    DownOutlined,
    ClockCircleOutlined,
    PieChartOutlined,
} from '@ant-design/icons';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfDay,
    endOfDay,
    startOfYear,
    endOfYear,
    subWeeks,
    subMonths,
    addMonths,
    subYears,
    addDays,
    differenceInCalendarDays,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    isBefore,
    isAfter,
    format,
} from 'date-fns';
import withAuth from '@/hoc/withAuth';
import Loading from '@/Components/Loading';
import useAuth from '@/hooks/useAuth';
import { useSummaryReport } from '@/api/queries/reports';
import {
    useCurrentEntry,
    useStartEntry,
    useStopEntry,
} from '@/api/queries/entries';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/utils/format';
import DayDetailsModal from '@/Modals/DayDetailsModal';
import { Play, Square } from 'lucide-react';

const { Title, Text } = Typography;

const BRAND = '#E0457A';
const BILLABLE_GREEN = '#5BB85C';
const TEXT_MUTED = '#8c8c8c';
const PANEL_BG = '#f6f7f8';
const DIVIDER = '#e8e8e8';
const HOVER_BG = '#f5f5f5';
const RANGE_BG = '#e8f2ff';
const RANGE_ACTIVE = '#1677ff';

const PRESETS = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This week' },
    { value: 'lastWeek', label: 'Last week' },
    { value: 'pastTwoWeeks', label: 'Past two weeks' },
    { value: 'thisMonth', label: 'This month' },
    { value: 'lastMonth', label: 'Last month' },
    { value: 'thisYear', label: 'This year' },
    { value: 'lastYear', label: 'Last year' },
];

function resolvePreset(key, now = new Date()) {
    switch (key) {
        case 'today':
            return { from: startOfDay(now), to: endOfDay(now) };
        case 'yesterday': {
            const d = addDays(now, -1);
            return { from: startOfDay(d), to: endOfDay(d) };
        }
        case 'lastWeek': {
            const ref = subWeeks(now, 1);
            return {
                from: startOfWeek(ref, { weekStartsOn: 1 }),
                to: endOfWeek(ref, { weekStartsOn: 1 }),
            };
        }
        case 'pastTwoWeeks': {
            const end = endOfDay(now);
            const start = startOfDay(addDays(now, -13));
            return { from: start, to: end };
        }
        case 'thisMonth':
            return { from: startOfMonth(now), to: endOfMonth(now) };
        case 'lastMonth': {
            const ref = subMonths(now, 1);
            return { from: startOfMonth(ref), to: endOfMonth(ref) };
        }
        case 'thisYear':
            return { from: startOfYear(now), to: endOfYear(now) };
        case 'lastYear': {
            const ref = subYears(now, 1);
            return { from: startOfYear(ref), to: endOfYear(ref) };
        }
        case 'thisWeek':
        default:
            return {
                from: startOfWeek(now, { weekStartsOn: 1 }),
                to: endOfWeek(now, { weekStartsOn: 1 }),
            };
    }
}

function shiftRange(from, to, direction) {
    const span = differenceInCalendarDays(to, from) + 1;
    const delta = span * direction;
    return {
        from: startOfDay(addDays(from, delta)),
        to: endOfDay(addDays(to, delta)),
    };
}

function computeNiceTop(v) {
    if (!v || v <= 0) return 1;
    const exp = Math.floor(Math.log10(v));
    const mag = Math.pow(10, exp);
    const n = v / mag;
    const nice = [1, 2, 4, 5, 8, 10].find((x) => x >= n) || 10;
    return nice * mag;
}

function formatRangeButton(from, to) {
    const f = (d) => format(d, 'dd/MM/yyyy');
    if (isSameDay(from, to)) return f(from);
    return `${f(from)} - ${f(to)}`;
}

function rangeButtonLabel(rangeKey, from, to) {
    const preset = PRESETS.find((p) => p.value === rangeKey);
    if (preset) return preset.label;
    return formatRangeButton(from, to);
}

function DashboardPage() {
    const { user, isAdmin } = useAuth();
    const [rangeKey, setRangeKey] = useState('thisMonth');
    const [customRange, setCustomRange] = useState(() =>
        resolvePreset('thisMonth'),
    );
    const [displayMode, setDisplayMode] = useState('project');
    const [userScope, setUserScope] = useState('me');
    const [activitiesLimit, setActivitiesLimit] = useState('top10');
    const [dateOpen, setDateOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);

    const { from, to } = customRange;

    const params = useMemo(() => {
        const p = { from: from.toISOString(), to: to.toISOString() };
        const uid = user?._id || user?.id;
        if (uid && isAdmin && userScope === 'me') p.userId = uid;
        p.topActivitiesLimit = activitiesLimit === 'all' ? 'all' : '10';
        return p;
    }, [from, to, userScope, isAdmin, user, activitiesLimit]);

    const { data, isLoading } = useSummaryReport(params);
    const firstLoad = isLoading && !data;

    const { data: currentEntry } = useCurrentEntry();
    const startEntry = useStartEntry();
    const stopEntry = useStopEntry();
    const running =
        currentEntry && currentEntry.status === 'running' ? currentEntry : null;
    const liveSecs = useTimer(running?.startTime);

    const baseTotal = data?.total || 0;
    const total = baseTotal + (running ? liveSecs : 0);

    const chartData = useMemo(() => {
        const map = new Map((data?.byDay || []).map((d) => [d._id, d.total]));
        const todayKey = running
            ? format(new Date(running.startTime), 'yyyy-MM-dd')
            : null;
        return eachDayOfInterval({ start: from, end: to }).map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            let secs = map.get(key) || 0;
            if (todayKey && key === todayKey) secs += liveSecs;
            return {
                day: format(d, 'EEE, MMM d'),
                seconds: secs,
                hours: Number((secs / 3600).toFixed(4)),
                label: formatDuration(secs),
            };
        });
    }, [data, from, to, running, liveSecs]);

    const allZero = chartData.every((d) => d.seconds === 0);

    const yAxisConfig = useMemo(() => {
        if (allZero) {
            return {
                domain: [0, 1],
                ticks: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            };
        }
        const max = Math.max(...chartData.map((d) => d.hours), 0);
        const niceTop = computeNiceTop(max);
        const step = niceTop / 4;
        const ticks = Array.from({ length: 5 }, (_, i) =>
            Number((step * i).toFixed(6)),
        );
        return { domain: [0, niceTop], ticks };
    }, [allZero, chartData]);

    const projectList = (data?.byProject || []).map((p) => ({
        ...p,
        pct: total > 0 ? (p.total / total) * 100 : 0,
    }));

    const billabilityList = useMemo(() => {
        if (total === 0) return [];
        return [
            {
                key: 'billable',
                name: 'Billable',
                total,
                pct: 100,
                color: BILLABLE_GREEN,
            },
        ];
    }, [total]);

    const pieList = displayMode === 'billability' ? billabilityList : projectList;

    const topActivities = data?.topActivities || [];

    const selectPreset = (key) => {
        setRangeKey(key);
        setCustomRange(resolvePreset(key));
        setDateOpen(false);
    };

    const applyCustomRange = (range) => {
        setRangeKey('custom');
        setCustomRange(range);
        setDateOpen(false);
    };

    const shiftBy = (dir) => {
        setRangeKey('custom');
        setCustomRange((prev) => shiftRange(prev.from, prev.to, dir));
    };

    const billabilityMenu = {
        items: [
            { key: 'billability', label: 'Billability' },
            { key: 'project', label: 'Project' },
        ],
        onClick: ({ key }) => setDisplayMode(key),
        selectedKeys: [displayMode],
    };

    const scopeMenu = {
        items: [
            { key: 'me', label: 'Only me' },
            ...(isAdmin ? [{ key: 'team', label: 'Team' }] : []),
        ],
        onClick: ({ key }) => setUserScope(key),
        selectedKeys: [userScope],
    };

    const activitiesMenu = {
        items: [
            { key: 'top10', label: 'Top 10' },
            { key: 'all', label: 'All' },
        ],
        onClick: ({ key }) => setActivitiesLimit(key),
        selectedKeys: [activitiesLimit],
    };

    const amountDisplay = '0,00 USD';
    const billablePct = total > 0 ? '100%' : '0%';

    return (
        <>
            <div className="tt-card">
                <div className="tt-page-header">
                    <Title level={3} style={{ margin: 0, fontWeight: 400, color: '#333' }}>
                        Dashboard
                    </Title>
                    <div className="tt-page-actions">
                        <Dropdown menu={billabilityMenu} trigger={['click']}>
                            <FilterButton>
                                {displayMode === 'billability' ? 'Billability' : 'Project'}
                                <DownOutlined style={{ fontSize: 10, marginLeft: 8 }} />
                            </FilterButton>
                        </Dropdown>
                        <Dropdown menu={scopeMenu} trigger={['click']}>
                            <FilterButton>
                                {userScope === 'team' ? 'Team' : 'Only me'}
                                <DownOutlined style={{ fontSize: 10, marginLeft: 8 }} />
                            </FilterButton>
                        </Dropdown>
                        <Popover
                            trigger="click"
                            open={dateOpen}
                            onOpenChange={setDateOpen}
                            placement="bottomRight"
                            overlayInnerStyle={{ padding: 0 }}
                            content={
                                <DateRangePanel
                                    from={from}
                                    to={to}
                                    rangeKey={rangeKey}
                                    onSelectPreset={selectPreset}
                                    onApplyRange={applyCustomRange}
                                />
                            }
                        >
                            <FilterButton>
                                <CalendarOutlined style={{ marginRight: 8, color: '#666' }} />
                                {rangeButtonLabel(rangeKey, from, to)}
                            </FilterButton>
                        </Popover>
                        <Button icon={<LeftOutlined />} onClick={() => shiftBy(-1)} />
                        <Button icon={<RightOutlined />} onClick={() => shiftBy(1)} />
                    </div>
                </div>

                {firstLoad ? (
                    <Loading height={300} />
                ) : (
                    <div className="tt-main-row">
                        <div className="tt-main-col">
                            <div
                                className="tt-stat-strip"
                                style={{
                                    background: PANEL_BG,
                                    borderRadius: 3,
                                    padding: '20px 0',
                                    marginBottom: 24,
                                }}
                            >
                                <StatCell label="Total time" value={formatDuration(total)} />
                                <StatCell label="Amount" value={amountDisplay} />
                                <StatCell label="Billable" value={billablePct} last />
                            </div>

                            <div style={{ minHeight: 320, position: 'relative' }}>
                                <ResponsiveContainer width="100%" height={340}>
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 28, right: 8, bottom: 40, left: 8 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="0"
                                            stroke="#eee"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            tick={
                                                <DayTick
                                                    muted={allZero}
                                                    labelEvery={Math.max(
                                                        1,
                                                        Math.ceil(
                                                            chartData.length / 10,
                                                        ),
                                                    )}
                                                />
                                            }
                                            tickLine={false}
                                            axisLine={{ stroke: '#d9d9d9' }}
                                            interval={0}
                                            height={60}
                                        />
                                        <YAxis
                                            tick={{
                                                fontSize: 11,
                                                fill: allZero ? '#d9d9d9' : TEXT_MUTED,
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={yAxisConfig.domain}
                                            ticks={yAxisConfig.ticks}
                                            tickFormatter={(v) => `${v.toFixed(2)} h`}
                                        />
                                        {!allZero && (
                                            <RechartsTooltip
                                                cursor={{
                                                    fill: 'rgba(91,184,92,0.08)',
                                                }}
                                                content={<DayTooltip />}
                                            />
                                        )}
                                        {!allZero && (
                                            <Bar
                                                dataKey="hours"
                                                fill={BILLABLE_GREEN}
                                                radius={[0, 0, 0, 0]}
                                                maxBarSize={28}
                                                onClick={(d) => {
                                                    if (d?.seconds > 0) {
                                                        setSelectedDay(d);
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        )}
                                    </BarChart>
                                </ResponsiveContainer>
                                {allZero && <EmptyChartOverlay />}
                            </div>

                            <div style={{ marginTop: 32 }}>
                                {pieList.length === 0 ? (
                                    <NothingToVisualize />
                                ) : (
                                    <div className="tt-pie-legend">
                                        <div style={{ position: 'relative', height: 240 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieList}
                                                        dataKey="total"
                                                        nameKey="name"
                                                        innerRadius={70}
                                                        outerRadius={110}
                                                        paddingAngle={1}
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                    >
                                                        {pieList.map((p, i) => (
                                                            <Cell
                                                                key={i}
                                                                fill={p.color || BRAND}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        formatter={(v) => formatDuration(v)}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    pointerEvents: 'none',
                                                    fontSize: 20,
                                                    fontWeight: 500,
                                                    color: '#333',
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {formatDuration(total)}
                                            </div>
                                        </div>
                                        <div>
                                            {pieList.map((p) => (
                                                <div
                                                    key={p.projectId || p.key || 'none'}
                                                    className="tt-project-row"
                                                >
                                                    <span
                                                        style={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            color: '#333',
                                                        }}
                                                        title={p.name || '(No project)'}
                                                    >
                                                        {p.name || '(No project)'}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontVariantNumeric: 'tabular-nums',
                                                            color: '#333',
                                                        }}
                                                    >
                                                        {formatDuration(p.total)}
                                                    </span>
                                                    <div
                                                        style={{
                                                            height: 14,
                                                            background: '#f0f0f0',
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: `${p.pct}%`,
                                                                height: '100%',
                                                                background: p.color || BRAND,
                                                            }}
                                                        />
                                                    </div>
                                                    <span
                                                        style={{
                                                            textAlign: 'right',
                                                            fontSize: 12,
                                                            color: '#666',
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        {p.pct.toFixed(2).replace('.', ',')}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div
                            className="tt-side-col"
                            style={{
                                border: `1px solid ${DIVIDER}`,
                                borderRadius: 3,
                                background: '#fff',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '14px 16px',
                                    borderBottom: `1px solid ${DIVIDER}`,
                                }}
                            >
                                <Text style={{ color: '#555' }}>Most tracked activities</Text>
                                <Dropdown menu={activitiesMenu} trigger={['click']}>
                                    <span
                                        style={{
                                            cursor: 'pointer',
                                            color: '#333',
                                            fontSize: 13,
                                        }}
                                    >
                                        {activitiesLimit === 'all' ? 'All' : 'Top 10'}
                                        <DownOutlined
                                            style={{ fontSize: 10, marginLeft: 6 }}
                                        />
                                    </span>
                                </Dropdown>
                            </div>
                            {topActivities.length === 0 ? (
                                <div style={{ padding: 20 }}>
                                    <Empty
                                        description="No activity"
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    />
                                </div>
                            ) : (
                                topActivities.map((a, idx) => (
                                    <ActivityRow
                                        key={idx}
                                        activity={a}
                                        last={idx === topActivities.length - 1}
                                        isRunningThis={
                                            running &&
                                            (running.description || '') ===
                                                (a.description || '')
                                        }
                                        onStart={() =>
                                            startEntry.mutate({
                                                description: a.description || '',
                                                projectId: null,
                                            })
                                        }
                                        onStop={() => stopEntry.mutate()}
                                        busy={
                                            startEntry.isLoading ||
                                            stopEntry.isLoading
                                        }
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            <DayDetailsModal
                open={!!selectedDay}
                onClose={() => setSelectedDay(null)}
                day={selectedDay}
            />
        </>
    );
}

function ActivityRow({ activity, last, isRunningThis, onStart, onStop, busy }) {
    const [hover, setHover] = useState(false);
    const showAction = hover || isRunningThis;
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                gap: 12,
                borderBottom: last ? 'none' : `1px solid ${DIVIDER}`,
                background: hover ? '#fafafa' : '#fff',
                transition: 'background 200ms ease',
            }}
        >
            <div
                style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: BRAND,
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#333',
                        fontSize: 13,
                    }}
                    title={activity.description || '(no description)'}
                >
                    {activity.description || '(no description)'}
                </span>
            </div>
            <span
                style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 13,
                    color: '#333',
                }}
            >
                {formatDuration(activity.total)}
            </span>
            <button
                type="button"
                disabled={busy}
                onClick={isRunningThis ? onStop : onStart}
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 'none',
                    background: isRunningThis ? '#e74c3c' : '#5BB85C',
                    color: '#fff',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    visibility: showAction ? 'visible' : 'hidden',
                    opacity: showAction ? 1 : 0,
                    transform: showAction ? 'scale(1)' : 'scale(0.8)',
                    transition:
                        'opacity 180ms ease, transform 180ms ease, background 180ms ease',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
                title={isRunningThis ? 'Stop timer' : 'Start timer'}
            >
                {isRunningThis ? <Square size={12} /> : <Play size={12} />}
            </button>
        </div>
    );
}

function DayTooltip({ active, payload }) {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload;
    const pct = p.seconds > 0 ? '100,00%' : '0,00%';
    return (
        <div
            style={{
                background: '#1f1f1f',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: 4,
                fontSize: 13,
                minWidth: 220,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr auto',
                    columnGap: 12,
                    rowGap: 4,
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                <span>{p.day}</span>
                <span>{p.label}</span>
                <span />
                <span>Billable</span>
                <span>{p.label}</span>
                <span>{pct}</span>
            </div>
        </div>
    );
}

function FilterButton({ children, ...rest }) {
    return (
        <button
            type="button"
            {...rest}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            style={{
                background: '#fff',
                border: `1px solid ${DIVIDER}`,
                borderRadius: 4,
                padding: '6px 14px',
                height: 36,
                fontSize: 14,
                color: '#333',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                transition: 'background 180ms ease, border-color 180ms ease',
            }}
        >
            {children}
        </button>
    );
}

function StatCell({ label, value, last }) {
    return (
        <div
            style={{
                textAlign: 'center',
                borderRight: last ? 'none' : `1px solid ${DIVIDER}`,
                padding: '0 16px',
            }}
        >
            <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 8 }}>
                {label}
            </div>
            <div
                style={{
                    fontSize: 24,
                    fontWeight: 500,
                    color: '#333',
                    fontVariantNumeric: 'tabular-nums',
                    wordBreak: 'break-word',
                }}
            >
                {value}
            </div>
        </div>
    );
}

function DayTick({ x, y, payload, muted, labelEvery = 1, index }) {
    const [dow, date] = (payload.value || '').split(', ');
    const fill = muted ? '#bfbfbf' : '#666';
    const dotFill = muted ? '#d9d9d9' : '#bfbfbf';
    const showLabel = (index ?? 0) % labelEvery === 0;
    return (
        <g>
            <circle cx={x} cy={y + 4} r={1.4} fill={dotFill} />
            {showLabel && (
                <g transform={`translate(${x},${y + 18}) rotate(-35)`}>
                    <text textAnchor="end" fill={fill} fontSize={12}>
                        {dow}, {date}
                    </text>
                </g>
            )}
        </g>
    );
}

function EmptyChartOverlay() {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
            }}
        >
            <div style={{ position: 'relative', marginBottom: 12 }}>
                <ClockCircleOutlined style={{ fontSize: 56, color: '#bfbfbf' }} />
                <span
                    style={{
                        position: 'absolute',
                        top: -6,
                        right: -10,
                        background: '#bfbfbf',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    0
                </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#333' }}>
                No data to show
            </div>
            <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 4 }}>
                Try adjusting the filters to get some results.
            </div>
        </div>
    );
}

function NothingToVisualize() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
            }}
        >
            <div style={{ position: 'relative', marginBottom: 16 }}>
                <PieChartOutlined style={{ fontSize: 56, color: '#bfbfbf' }} />
                <span
                    style={{
                        position: 'absolute',
                        top: -6,
                        right: -10,
                        background: '#bfbfbf',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    0
                </span>
            </div>
            <div style={{ fontSize: 16, color: '#5a7a8a', fontWeight: 500 }}>
                Nothing to visualize
            </div>
        </div>
    );
}

function DateRangePanel({ from, to, rangeKey, onSelectPreset, onApplyRange }) {
    const [leftMonth, setLeftMonth] = useState(() => startOfMonth(from));
    const [draftFrom, setDraftFrom] = useState(from);
    const [draftTo, setDraftTo] = useState(to);
    const [pickingEnd, setPickingEnd] = useState(false);

    const rightMonth = addMonths(leftMonth, 1);

    const onDayClick = (d) => {
        if (!pickingEnd) {
            setDraftFrom(startOfDay(d));
            setDraftTo(endOfDay(d));
            setPickingEnd(true);
        } else {
            let f = draftFrom;
            let t = d;
            if (isBefore(t, f)) {
                const tmp = f;
                f = t;
                t = tmp;
            }
            const range = { from: startOfDay(f), to: endOfDay(t) };
            setDraftFrom(range.from);
            setDraftTo(range.to);
            setPickingEnd(false);
            onApplyRange(range);
        }
    };

    return (
        <div className="tt-daterange-panel">
            <div className="tt-daterange-presets">
                {PRESETS.map((p) => {
                    const active = rangeKey === p.value;
                    return (
                        <div
                            key={p.value}
                            onClick={() => onSelectPreset(p.value)}
                            style={{
                                padding: '8px 16px',
                                cursor: 'pointer',
                                background: active ? RANGE_ACTIVE : 'transparent',
                                color: active ? '#fff' : '#333',
                                transition: 'background 180ms ease, color 180ms ease',
                            }}
                            onMouseEnter={(e) => {
                                if (!active) e.currentTarget.style.background = HOVER_BG;
                            }}
                            onMouseLeave={(e) => {
                                if (!active)
                                    e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            {p.label}
                        </div>
                    );
                })}
            </div>
            <div className="tt-daterange-months">
                <MonthGrid
                    month={leftMonth}
                    from={draftFrom}
                    to={draftTo}
                    onDayClick={onDayClick}
                    onPrev={() => setLeftMonth((m) => subMonths(m, 1))}
                    showPrev
                />
                <MonthGrid
                    month={rightMonth}
                    from={draftFrom}
                    to={draftTo}
                    onDayClick={onDayClick}
                    onNext={() => setLeftMonth((m) => addMonths(m, 1))}
                    showNext
                />
            </div>
        </div>
    );
}

const WEEK_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function MonthGrid({ month, from, to, onDayClick, onPrev, onNext, showPrev, showNext }) {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    return (
        <div style={{ width: '100%', maxWidth: 220 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    height: 24,
                }}
            >
                <span style={{ width: 20, cursor: showPrev ? 'pointer' : 'default' }}>
                    {showPrev && (
                        <LeftOutlined onClick={onPrev} style={{ color: '#333' }} />
                    )}
                </span>
                <span style={{ fontWeight: 500 }}>{format(month, 'MMM yyyy')}</span>
                <span
                    style={{
                        width: 20,
                        textAlign: 'right',
                        cursor: showNext ? 'pointer' : 'default',
                    }}
                >
                    {showNext && (
                        <RightOutlined onClick={onNext} style={{ color: '#333' }} />
                    )}
                </span>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    fontSize: 12,
                    color: TEXT_MUTED,
                    marginBottom: 4,
                }}
            >
                {WEEK_LABELS.map((l) => (
                    <div key={l} style={{ textAlign: 'center', padding: '4px 0' }}>
                        {l}
                    </div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {days.map((d) => {
                    const inMonth = isSameMonth(d, month);
                    const isFrom = isSameDay(d, from);
                    const isTo = isSameDay(d, to);
                    const inRange =
                        !isBefore(d, from) && !isAfter(d, to);
                    const edge = isFrom || isTo;
                    const betweenOnly = inRange && !edge;

                    let bg = 'transparent';
                    let color = inMonth ? '#333' : '#ccc';
                    if (edge) {
                        bg = RANGE_ACTIVE;
                        color = '#fff';
                    } else if (betweenOnly) {
                        bg = RANGE_BG;
                    }

                    return (
                        <div
                            key={d.toISOString()}
                            onClick={() => onDayClick(d)}
                            onMouseEnter={(e) => {
                                if (!edge && !betweenOnly)
                                    e.currentTarget.style.background = HOVER_BG;
                            }}
                            onMouseLeave={(e) => {
                                if (!edge && !betweenOnly)
                                    e.currentTarget.style.background = 'transparent';
                            }}
                            style={{
                                textAlign: 'center',
                                padding: '6px 0',
                                cursor: 'pointer',
                                background: bg,
                                color,
                                borderRadius: edge ? 3 : 0,
                                fontSize: 13,
                                transition:
                                    'background 180ms ease, color 180ms ease',
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

export default withAuth(DashboardPage);
