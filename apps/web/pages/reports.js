import { useMemo, useState } from 'react';
import {
    Typography,
    Empty,
    Dropdown,
    Popover,
    Button,
    Table,
    Input,
    Select,
    Switch,
    Tag as AntTag,
    Tooltip,
} from 'antd';
import {
    LeftOutlined,
    RightOutlined,
    CalendarOutlined,
    DownOutlined,
    SearchOutlined,
    ShareAltOutlined,
    DownloadOutlined,
    FileTextOutlined,
    SyncOutlined,
    EyeOutlined,
    PieChartOutlined,
    ClockCircleOutlined,
    PlusOutlined,
    UpOutlined,
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
import {
    useSummaryReport,
    useDetailedReport,
    useWeeklyReport,
} from '@/lib/queries/reports';
import { useProjects } from '@/lib/queries/projects';
import { useTags } from '@/lib/queries/tags';
import { useClients } from '@/lib/queries/clients';
import { useUsers } from '@/lib/queries/users';
import usePagination from '@/hooks/usePagination';
import { formatDuration } from '@/utils/format';

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

function rangeButtonLabel(rangeKey, from, to) {
    const preset = PRESETS.find((p) => p.value === rangeKey);
    if (preset) return preset.label;
    const f = (d) => format(d, 'dd/MM/yyyy');
    if (isSameDay(from, to)) return f(from);
    return `${f(from)} - ${f(to)}`;
}

function ReportsPage() {
    const { user, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('summary');
    const [rangeKey, setRangeKey] = useState('thisWeek');
    const [customRange, setCustomRange] = useState(() => resolvePreset('thisWeek'));
    const [filters, setFilters] = useState({
        projectId: null,
        tagId: null,
        clientId: null,
        userId: null,
        billable: null,
        description: '',
    });
    const [billabilityMode, setBillabilityMode] = useState('billability');
    const [groupBy, setGroupBy] = useState('project');
    const [secondaryGroup, setSecondaryGroup] = useState(true);
    const [showAmountProfit, setShowAmountProfit] = useState(true);
    const [rounding, setRounding] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [expandedProjects, setExpandedProjects] = useState({});

    const { from, to } = customRange;

    const queryParams = useMemo(() => {
        const p = { from: from.toISOString(), to: to.toISOString() };
        if (filters.projectId) p.projectId = filters.projectId;
        if (filters.tagId) p.tagId = filters.tagId;
        if (filters.clientId) p.clientId = filters.clientId;
        if (filters.userId && isAdmin) p.userId = filters.userId;
        if (filters.billable !== null) p.billable = String(filters.billable);
        if (filters.description) p.description = filters.description;
        return p;
    }, [from, to, filters, isAdmin]);

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

    const tabs = [
        { key: 'summary', label: 'Summary' },
        { key: 'detailed', label: 'Detailed' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'shared', label: 'Shared' },
    ];

    return (
        <div
            style={{
                background: '#fff',
                borderRadius: 4,
                border: `1px solid ${DIVIDER}`,
                padding: 0,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: `1px solid ${DIVIDER}`,
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Text
                        style={{
                            color: '#8c8c8c',
                            textTransform: 'uppercase',
                            fontSize: 13,
                            letterSpacing: 0.5,
                        }}
                    >
                        Time Report
                    </Text>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {tabs.map((t) => (
                            <TabButton
                                key={t.key}
                                active={activeTab === t.key}
                                onClick={() => setActiveTab(t.key)}
                            >
                                {t.label}
                            </TabButton>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

            <FilterBar
                filters={filters}
                setFilters={setFilters}
                isAdmin={isAdmin}
                open={filterOpen}
                setOpen={setFilterOpen}
            />

            {activeTab === 'summary' && (
                <SummaryTab
                    queryParams={queryParams}
                    from={from}
                    to={to}
                    billabilityMode={billabilityMode}
                    setBillabilityMode={setBillabilityMode}
                    groupBy={groupBy}
                    setGroupBy={setGroupBy}
                    secondaryGroup={secondaryGroup}
                    setSecondaryGroup={setSecondaryGroup}
                    showAmountProfit={showAmountProfit}
                    setShowAmountProfit={setShowAmountProfit}
                    rounding={rounding}
                    setRounding={setRounding}
                    expandedProjects={expandedProjects}
                    setExpandedProjects={setExpandedProjects}
                />
            )}
            {activeTab === 'detailed' && <DetailedTab queryParams={queryParams} />}
            {activeTab === 'weekly' && (
                <WeeklyTab queryParams={queryParams} from={from} to={to} />
            )}
            {activeTab === 'shared' && <SharedTab />}
        </div>
    );
}

function TabButton({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '6px 14px',
                background: active ? '#1677ff' : 'transparent',
                color: active ? '#fff' : '#333',
                border: `1px solid ${active ? '#1677ff' : DIVIDER}`,
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 180ms ease',
            }}
            onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = HOVER_BG;
            }}
            onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
            }}
        >
            {children}
        </button>
    );
}

function FilterBar({ filters, setFilters, isAdmin, open, setOpen }) {
    const { data: projects = [] } = useProjects();
    const { data: tags = [] } = useTags();
    const { data: clients = [] } = useClients();
    const { data: users = [] } = useUsers({ enabled: isAdmin });

    const billableOptions = [
        { label: 'All', value: 'all' },
        { label: 'Billable', value: 'true' },
        { label: 'Non-billable', value: 'false' },
    ];

    return (
        <div
            style={{
                padding: '12px 20px',
                borderBottom: `1px solid ${DIVIDER}`,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
            }}
        >
            <Button
                size="small"
                icon={<SearchOutlined />}
                onClick={() => setOpen(!open)}
                style={{ background: '#fafafa' }}
            >
                FILTER
            </Button>

            {isAdmin && (
                <Select
                    size="small"
                    placeholder="Team"
                    allowClear
                    style={{ minWidth: 140 }}
                    value={filters.userId}
                    onChange={(v) => setFilters((f) => ({ ...f, userId: v || null }))}
                    options={users.map((u) => ({ label: u.name, value: u._id }))}
                />
            )}
            <Select
                size="small"
                placeholder="Client"
                allowClear
                style={{ minWidth: 140 }}
                value={filters.clientId}
                onChange={(v) => setFilters((f) => ({ ...f, clientId: v || null }))}
                options={clients.map((c) => ({ label: c.name, value: c._id }))}
            />
            <Select
                size="small"
                placeholder="Project"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 160 }}
                value={filters.projectId}
                onChange={(v) => setFilters((f) => ({ ...f, projectId: v || null }))}
                options={projects.map((p) => ({ label: p.name, value: p._id }))}
            />
            <Select
                size="small"
                placeholder="Tag"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 130 }}
                value={filters.tagId}
                onChange={(v) => setFilters((f) => ({ ...f, tagId: v || null }))}
                options={tags.map((t) => ({ label: t.name, value: t._id }))}
            />
            <Select
                size="small"
                placeholder="Status"
                style={{ minWidth: 140 }}
                value={filters.billable === null ? 'all' : String(filters.billable)}
                onChange={(v) =>
                    setFilters((f) => ({
                        ...f,
                        billable: v === 'all' ? null : v === 'true',
                    }))
                }
                options={billableOptions}
            />
            <Input
                size="small"
                placeholder="Description"
                allowClear
                style={{ minWidth: 180 }}
                value={filters.description}
                onChange={(e) =>
                    setFilters((f) => ({ ...f, description: e.target.value }))
                }
            />
            <div style={{ flex: 1 }} />
            <Button
                size="small"
                type="primary"
                onClick={() => {
                    /* filters apply automatically via state */
                }}
            >
                APPLY
            </Button>
        </div>
    );
}

function SummaryTab({
    queryParams,
    from,
    to,
    billabilityMode,
    setBillabilityMode,
    groupBy,
    setGroupBy,
    secondaryGroup,
    setSecondaryGroup,
    showAmountProfit,
    setShowAmountProfit,
    rounding,
    setRounding,
    expandedProjects,
    setExpandedProjects,
}) {
    const { data, isLoading } = useSummaryReport(queryParams);

    const total = data?.total || 0;
    const billable = data?.billable || 0;
    const amountStr = '0,00 USD';
    const profitStr = '0,00 USD';

    const chartData = useMemo(() => {
        const map = new Map(
            (data?.byDay || []).map((d) => [d._id, { total: d.total, billable: d.billable, nonBillable: d.nonBillable }]),
        );
        return eachDayOfInterval({ start: from, end: to }).map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            const entry = map.get(key) || { total: 0, billable: 0, nonBillable: 0 };
            return {
                day: format(d, 'EEE, MMM d'),
                seconds: entry.total,
                billable: Number(((entry.billable || 0) / 3600).toFixed(4)),
                nonBillable: Number(((entry.nonBillable || 0) / 3600).toFixed(4)),
                hours: Number((entry.total / 3600).toFixed(4)),
                label: formatDuration(entry.total),
            };
        });
    }, [data, from, to]);

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

    const grouped = useMemo(() => {
        if (groupBy === 'project') return projectList;
        const map = new Map();
        (data?.byProjectDescription || []).forEach((row) => {
            const key = row.description || '';
            const existing = map.get(key) || {
                description: key,
                total: 0,
                billable: 0,
                count: 0,
            };
            existing.total += row.total || 0;
            existing.billable += row.billable || 0;
            existing.count += row.count || 0;
            map.set(key, existing);
        });
        return Array.from(map.values())
            .map((r) => ({ ...r, pct: total > 0 ? (r.total / total) * 100 : 0 }))
            .sort((a, b) => b.total - a.total);
    }, [data, groupBy, total, projectList]);

    const projectChildren = useMemo(() => {
        const map = new Map();
        (data?.byProjectDescription || []).forEach((row) => {
            const key = row.projectId ? row.projectId.toString() : 'none';
            const arr = map.get(key) || [];
            arr.push(row);
            map.set(key, arr);
        });
        return map;
    }, [data]);

    const toggleExpand = (id) => {
        const k = id || 'none';
        setExpandedProjects((prev) => ({ ...prev, [k]: !prev[k] }));
    };

    if (isLoading) return <Loading height={400} />;

    return (
        <div>
            <div
                style={{
                    background: PANEL_BG,
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 24,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', gap: 32 }}>
                    <StatCell label="Total" value={formatDuration(total)} />
                    <StatCell label="Billable" value={formatDuration(billable)} />
                    {showAmountProfit && (
                        <>
                            <StatCell label="Amount" value={amountStr} />
                            <StatCell label="Profit" value={profitStr} />
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <ActionLink icon={<FileTextOutlined />} text="Create invoice" />
                    <ActionLink icon={<DownloadOutlined />} text="Export" />
                    <ActionLink icon={<ShareAltOutlined />} text="Share" />
                    <SwitchToggle
                        checked={rounding}
                        onChange={setRounding}
                        label="Rounding"
                    />
                    <SwitchToggle
                        checked={showAmountProfit}
                        onChange={setShowAmountProfit}
                        label="Show amount, profit"
                    />
                </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <Dropdown
                        menu={{
                            items: [
                                { key: 'billability', label: 'Billability' },
                                { key: 'project', label: 'Project' },
                            ],
                            selectedKeys: [billabilityMode],
                            onClick: ({ key }) => setBillabilityMode(key),
                        }}
                        trigger={['click']}
                    >
                        <FilterButton>
                            {billabilityMode === 'billability' ? 'Billability' : 'Project'}
                            <DownOutlined style={{ fontSize: 10, marginLeft: 8 }} />
                        </FilterButton>
                    </Dropdown>
                </div>

                <div style={{ minHeight: 320, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height={340}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 28, right: 8, bottom: 40, left: 8 }}
                        >
                            <CartesianGrid strokeDasharray="0" stroke="#eee" vertical={false} />
                            <XAxis
                                dataKey="day"
                                tick={
                                    <DayTick
                                        muted={allZero}
                                        labelEvery={Math.max(
                                            1,
                                            Math.ceil(chartData.length / 10),
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
                                    cursor={{ fill: 'rgba(91,184,92,0.08)' }}
                                    content={<DayTooltip />}
                                />
                            )}
                            {!allZero && billabilityMode === 'billability' && (
                                <>
                                    <Bar
                                        dataKey="billable"
                                        stackId="a"
                                        fill={BILLABLE_GREEN}
                                        maxBarSize={28}
                                    />
                                    <Bar
                                        dataKey="nonBillable"
                                        stackId="a"
                                        fill="#bdbdbd"
                                        maxBarSize={28}
                                    />
                                </>
                            )}
                            {!allZero && billabilityMode === 'project' && (
                                <Bar dataKey="hours" fill={BILLABLE_GREEN} maxBarSize={28} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                    {allZero && <EmptyChartOverlay />}
                </div>

                <div
                    style={{
                        background: PANEL_BG,
                        padding: '12px 16px',
                        marginTop: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        borderTop: `1px solid ${DIVIDER}`,
                        borderBottom: `1px solid ${DIVIDER}`,
                    }}
                >
                    <Text style={{ color: '#666' }}>Group by:</Text>
                    <Dropdown
                        menu={{
                            items: [
                                { key: 'project', label: 'Project' },
                                { key: 'description', label: 'Description' },
                            ],
                            selectedKeys: [groupBy],
                            onClick: ({ key }) => setGroupBy(key),
                        }}
                        trigger={['click']}
                    >
                        <FilterButton>
                            {groupBy === 'project' ? 'Project' : 'Description'}
                            <DownOutlined style={{ fontSize: 10, marginLeft: 8 }} />
                        </FilterButton>
                    </Dropdown>
                    <Dropdown
                        menu={{
                            items: [
                                { key: 'description', label: 'Description' },
                                { key: 'tag', label: 'Tag' },
                                { key: 'task', label: 'Task' },
                            ],
                            onClick: () => {},
                        }}
                        trigger={['click']}
                    >
                        <FilterButton>
                            Description
                            <DownOutlined style={{ fontSize: 10, marginLeft: 8 }} />
                        </FilterButton>
                    </Dropdown>
                    <Switch
                        size="small"
                        checked={secondaryGroup}
                        onChange={setSecondaryGroup}
                    />
                    <Text style={{ color: '#666' }}>Show estimate</Text>
                </div>

                <GroupedTable
                    groupBy={groupBy}
                    grouped={grouped}
                    projectChildren={projectChildren}
                    expandedProjects={expandedProjects}
                    toggleExpand={toggleExpand}
                    secondaryGroup={secondaryGroup}
                    showAmountProfit={showAmountProfit}
                    total={total}
                />

                <div style={{ marginTop: 32 }}>
                    {projectList.length === 0 ? (
                        <NothingToVisualize />
                    ) : (
                        <div className="tt-pie-legend tt-pie-legend--lg">
                            <div style={{ position: 'relative', height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={projectList}
                                            dataKey="total"
                                            nameKey="name"
                                            innerRadius={80}
                                            outerRadius={130}
                                            paddingAngle={1}
                                            stroke="#fff"
                                            strokeWidth={2}
                                        >
                                            {projectList.map((p, i) => (
                                                <Cell key={i} fill={p.color || BRAND} />
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
                                        fontSize: 22,
                                        fontWeight: 500,
                                        color: '#333',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {formatDuration(total)}
                                </div>
                            </div>
                            <div>
                                {projectList.map((p) => (
                                    <div
                                        key={p.projectId || 'none'}
                                        className="tt-project-row tt-project-row--lg"
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
                                            <span
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    background: p.color || BRAND,
                                                    borderRadius: '50%',
                                                    display: 'inline-block',
                                                    marginRight: 8,
                                                }}
                                            />
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
        </div>
    );
}

function GroupedTable({
    groupBy,
    grouped,
    projectChildren,
    expandedProjects,
    toggleExpand,
    secondaryGroup,
    showAmountProfit,
    total,
}) {
    if (grouped.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="No data for this range" />
            </div>
        );
    }

    const minTableWidth = showAmountProfit ? 880 : 640;

    return (
        <div className="tt-grouped-table" style={{ marginTop: 0 }}>
          <div style={{ minWidth: minTableWidth }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: showAmountProfit
                        ? '40px 1fr 120px 120px 120px 120px'
                        : '40px 1fr 120px 120px',
                    padding: '12px 16px',
                    fontSize: 12,
                    color: TEXT_MUTED,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${DIVIDER}`,
                    letterSpacing: 0.4,
                }}
            >
                <span />
                <span>Title</span>
                <span style={{ textAlign: 'right' }}>Duration ↓</span>
                <span style={{ textAlign: 'right' }}>Estimate</span>
                {showAmountProfit && <span style={{ textAlign: 'right' }}>Amount</span>}
                {showAmountProfit && <span style={{ textAlign: 'right' }}>Profit</span>}
            </div>
            {grouped.map((row, idx) => {
                const id = row.projectId ? row.projectId.toString() : 'none';
                const isExpanded = expandedProjects[id];
                const children = groupBy === 'project'
                    ? projectChildren.get(id) || []
                    : [];
                const hasChildren = secondaryGroup && children.length > 0;
                return (
                    <div key={id + '-' + idx}>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: showAmountProfit
                                    ? '40px 1fr 120px 120px 120px 120px'
                                    : '40px 1fr 120px 120px',
                                padding: '14px 16px',
                                borderBottom: `1px solid ${DIVIDER}`,
                                alignItems: 'center',
                                cursor: hasChildren ? 'pointer' : 'default',
                                transition: 'background 180ms ease',
                            }}
                            onClick={() => hasChildren && toggleExpand(id)}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.background = '#fafafa')
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.background = 'transparent')
                            }
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text style={{ color: TEXT_MUTED, fontSize: 12 }}>
                                    {idx + 1}
                                </Text>
                                {hasChildren && (
                                    isExpanded ? (
                                        <UpOutlined style={{ fontSize: 10, color: '#999' }} />
                                    ) : (
                                        <DownOutlined style={{ fontSize: 10, color: '#999' }} />
                                    )
                                )}
                            </span>
                            <span
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    minWidth: 0,
                                }}
                            >
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        background: row.color || BRAND,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                    }}
                                />
                                <span
                                    style={{
                                        color: '#333',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {groupBy === 'project'
                                        ? row.name || '(No project)'
                                        : row.description || '(no description)'}
                                </span>
                            </span>
                            <span
                                style={{
                                    textAlign: 'right',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: '#333',
                                }}
                            >
                                {formatDuration(row.total)}
                            </span>
                            <span style={{ textAlign: 'right', color: TEXT_MUTED }}>—</span>
                            {showAmountProfit && (
                                <span
                                    style={{
                                        textAlign: 'right',
                                        fontVariantNumeric: 'tabular-nums',
                                        color: '#333',
                                    }}
                                >
                                    0,00 USD
                                </span>
                            )}
                            {showAmountProfit && (
                                <span
                                    style={{
                                        textAlign: 'right',
                                        fontVariantNumeric: 'tabular-nums',
                                        color: '#333',
                                    }}
                                >
                                    0,00 USD
                                </span>
                            )}
                        </div>
                        {hasChildren && isExpanded && (
                            <div style={{ background: '#fafafa' }}>
                                {children.map((child, ci) => (
                                    <div
                                        key={ci}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: showAmountProfit
                                                ? '40px 1fr 120px 120px 120px 120px'
                                                : '40px 1fr 120px 120px',
                                            padding: '10px 16px 10px 56px',
                                            borderBottom: `1px solid ${DIVIDER}`,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span />
                                        <span style={{ color: '#666', fontSize: 13 }}>
                                            {child.description || '(no description)'}
                                        </span>
                                        <span
                                            style={{
                                                textAlign: 'right',
                                                fontVariantNumeric: 'tabular-nums',
                                                color: '#333',
                                            }}
                                        >
                                            {formatDuration(child.total)}
                                        </span>
                                        <span
                                            style={{ textAlign: 'right', color: TEXT_MUTED }}
                                        >
                                            —
                                        </span>
                                        {showAmountProfit && (
                                            <span
                                                style={{
                                                    textAlign: 'right',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    color: '#333',
                                                }}
                                            >
                                                0,00 USD
                                            </span>
                                        )}
                                        {showAmountProfit && (
                                            <span
                                                style={{
                                                    textAlign: 'right',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    color: '#333',
                                                }}
                                            >
                                                0,00 USD
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
          </div>
        </div>
    );
}

function DetailedTab({ queryParams }) {
    const { data = [], isLoading } = useDetailedReport(queryParams);
    const { paginationProps } = usePagination({
        defaultPageSize: 25,
        resetKey: JSON.stringify(queryParams),
    });
    if (isLoading) return <Loading height={400} />;

    const total = data.reduce((s, e) => s + (e.duration || 0), 0);
    const billable = data
        .filter((e) => e.billable)
        .reduce((s, e) => s + (e.duration || 0), 0);

    return (
        <div>
            <div
                style={{
                    background: PANEL_BG,
                    padding: '20px 24px',
                    display: 'flex',
                    gap: 32,
                    flexWrap: 'wrap',
                }}
            >
                <StatCell label="Total" value={formatDuration(total)} />
                <StatCell label="Billable" value={formatDuration(billable)} />
                <StatCell label="Amount" value="0,00 USD" />
                <StatCell label="Entries" value={String(data.length)} />
            </div>
            <div style={{ padding: '20px 24px' }}>
                <Table
                    dataSource={data}
                    rowKey="_id"
                    pagination={paginationProps}
                    size="middle"
                    scroll={{ x: 'auto' }}
                    style={{ whiteSpace: 'nowrap' }}
                    columns={[
                        {
                            title: 'Description',
                            dataIndex: 'description',
                            render: (v, row) => (
                                <span>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: row.projectId?.color || BRAND,
                                            marginRight: 8,
                                        }}
                                    />
                                    {v || '(no description)'}
                                </span>
                            ),
                        },
                        {
                            title: 'Project',
                            dataIndex: ['projectId', 'name'],
                            render: (v) => v || '(No project)',
                        },
                        {
                            title: 'Tags',
                            dataIndex: 'tags',
                            render: (tags = []) =>
                                tags.length === 0
                                    ? '—'
                                    : tags.map((t) => (
                                          <AntTag
                                              key={t._id}
                                              color={t.color || 'default'}
                                              style={{ marginRight: 4 }}
                                          >
                                              {t.name}
                                          </AntTag>
                                      )),
                        },
                        {
                            title: 'User',
                            dataIndex: ['userId', 'name'],
                            width: 140,
                        },
                        {
                            title: 'Start',
                            dataIndex: 'startTime',
                            width: 160,
                            render: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm'),
                        },
                        {
                            title: 'End',
                            dataIndex: 'endTime',
                            width: 110,
                            render: (v) => (v ? format(new Date(v), 'HH:mm') : '—'),
                        },
                        {
                            title: 'Duration',
                            dataIndex: 'duration',
                            align: 'right',
                            width: 110,
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {formatDuration(v)}
                                </span>
                            ),
                        },
                        {
                            title: 'Billable',
                            dataIndex: 'billable',
                            width: 80,
                            align: 'center',
                            render: (v) =>
                                v ? (
                                    <AntTag color="green">$</AntTag>
                                ) : (
                                    <span style={{ color: TEXT_MUTED }}>—</span>
                                ),
                        },
                    ]}
                />
            </div>
        </div>
    );
}

function WeeklyTab({ queryParams, from, to }) {
    const { data = [], isLoading } = useWeeklyReport(queryParams);
    if (isLoading) return <Loading height={400} />;

    const days = eachDayOfInterval({ start: from, end: to });

    const projectMap = new Map();
    data.forEach((row) => {
        const id = row.projectId ? row.projectId.toString() : 'none';
        const ent = projectMap.get(id) || {
            id,
            name: row.name || '(No project)',
            color: row.color || BRAND,
            byDay: new Map(),
            total: 0,
        };
        ent.byDay.set(row.day, (ent.byDay.get(row.day) || 0) + (row.total || 0));
        ent.total += row.total || 0;
        projectMap.set(id, ent);
    });
    const projects = Array.from(projectMap.values()).sort(
        (a, b) => b.total - a.total,
    );

    const dayTotals = days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        return projects.reduce((s, p) => s + (p.byDay.get(key) || 0), 0);
    });
    const grandTotal = projects.reduce((s, p) => s + p.total, 0);

    return (
        <div style={{ padding: '20px 24px' }}>
            <div
                style={{
                    background: PANEL_BG,
                    padding: '16px 20px',
                    marginBottom: 16,
                    display: 'flex',
                    gap: 32,
                }}
            >
                <StatCell label="Total" value={formatDuration(grandTotal)} />
                <StatCell label="Projects" value={String(projects.length)} />
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: 800,
                    }}
                >
                    <thead>
                        <tr style={{ background: PANEL_BG }}>
                            <th
                                style={{
                                    textAlign: 'left',
                                    padding: '12px 16px',
                                    color: TEXT_MUTED,
                                    fontSize: 12,
                                    textTransform: 'uppercase',
                                    borderBottom: `1px solid ${DIVIDER}`,
                                }}
                            >
                                Project
                            </th>
                            {days.map((d) => (
                                <th
                                    key={d.toISOString()}
                                    style={{
                                        textAlign: 'center',
                                        padding: '12px 8px',
                                        color: TEXT_MUTED,
                                        fontSize: 12,
                                        borderBottom: `1px solid ${DIVIDER}`,
                                    }}
                                >
                                    <div>{format(d, 'EEE')}</div>
                                    <div style={{ fontSize: 11 }}>{format(d, 'MMM d')}</div>
                                </th>
                            ))}
                            <th
                                style={{
                                    textAlign: 'right',
                                    padding: '12px 16px',
                                    color: TEXT_MUTED,
                                    fontSize: 12,
                                    textTransform: 'uppercase',
                                    borderBottom: `1px solid ${DIVIDER}`,
                                }}
                            >
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={days.length + 2}
                                    style={{ padding: 40, textAlign: 'center' }}
                                >
                                    <Empty description="No data for this range" />
                                </td>
                            </tr>
                        ) : (
                            projects.map((p) => (
                                <tr
                                    key={p.id}
                                    style={{ borderBottom: `1px solid ${DIVIDER}` }}
                                >
                                    <td style={{ padding: '12px 16px' }}>
                                        <span
                                            style={{
                                                width: 8,
                                                height: 8,
                                                background: p.color,
                                                borderRadius: '50%',
                                                display: 'inline-block',
                                                marginRight: 8,
                                            }}
                                        />
                                        {p.name}
                                    </td>
                                    {days.map((d) => {
                                        const key = format(d, 'yyyy-MM-dd');
                                        const sec = p.byDay.get(key) || 0;
                                        return (
                                            <td
                                                key={key}
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '12px 8px',
                                                    color: sec > 0 ? '#333' : '#ccc',
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {sec > 0 ? formatDuration(sec) : '—'}
                                            </td>
                                        );
                                    })}
                                    <td
                                        style={{
                                            textAlign: 'right',
                                            padding: '12px 16px',
                                            fontWeight: 500,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {formatDuration(p.total)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {projects.length > 0 && (
                        <tfoot>
                            <tr style={{ background: PANEL_BG }}>
                                <td
                                    style={{
                                        padding: '12px 16px',
                                        fontWeight: 600,
                                        color: '#333',
                                    }}
                                >
                                    Total
                                </td>
                                {dayTotals.map((sec, i) => (
                                    <td
                                        key={i}
                                        style={{
                                            textAlign: 'center',
                                            padding: '12px 8px',
                                            fontWeight: 600,
                                            color: '#333',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {sec > 0 ? formatDuration(sec) : '—'}
                                    </td>
                                ))}
                                <td
                                    style={{
                                        textAlign: 'right',
                                        padding: '12px 16px',
                                        fontWeight: 600,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {formatDuration(grandTotal)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

function SharedTab() {
    return (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <ShareAltOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
            <Title level={4} style={{ marginTop: 16, color: '#666' }}>
                No shared reports
            </Title>
            <Text style={{ color: TEXT_MUTED }}>
                Share a report from Summary or Detailed tab to see it listed here.
            </Text>
        </div>
    );
}

function StatCell({ label, value }) {
    return (
        <div>
            <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 4 }}>
                {label}
            </div>
            <div
                style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: '#333',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {value}
            </div>
        </div>
    );
}

function ActionLink({ icon, text, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                background: 'transparent',
                border: 'none',
                color: '#1677ff',
                fontSize: 13,
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                transition: 'color 180ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0958d9')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#1677ff')}
        >
            {icon} {text}
        </button>
    );
}

function SwitchToggle({ checked, onChange, label }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Switch size="small" checked={checked} onChange={onChange} />
            <Text style={{ color: '#333', fontSize: 13 }}>{label}</Text>
        </span>
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
                height: 32,
                fontSize: 13,
                color: '#333',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                transition: 'background 180ms ease',
            }}
        >
            {children}
        </button>
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

function DayTooltip({ active, payload }) {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload;
    return (
        <div
            style={{
                background: '#1f1f1f',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: 4,
                fontSize: 13,
                minWidth: 200,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr',
                    columnGap: 12,
                    rowGap: 4,
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                <span>{p.day}</span>
                <span style={{ textAlign: 'right' }}>{p.label}</span>
                <span>Billable</span>
                <span style={{ textAlign: 'right' }}>
                    {formatDuration(Math.round((p.billable || 0) * 3600))}
                </span>
                <span>Non-billable</span>
                <span style={{ textAlign: 'right' }}>
                    {formatDuration(Math.round((p.nonBillable || 0) * 3600))}
                </span>
            </div>
        </div>
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
            <ClockCircleOutlined style={{ fontSize: 56, color: '#bfbfbf' }} />
            <div style={{ fontSize: 16, fontWeight: 500, color: '#333', marginTop: 12 }}>
                No data to show
            </div>
            <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 4 }}>
                Try adjusting the filters or date range.
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
            <PieChartOutlined style={{ fontSize: 56, color: '#bfbfbf' }} />
            <div
                style={{
                    fontSize: 16,
                    color: '#5a7a8a',
                    fontWeight: 500,
                    marginTop: 16,
                }}
            >
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
                    const inRange = !isBefore(d, from) && !isAfter(d, to);
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
                                transition: 'background 180ms ease, color 180ms ease',
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

export default withAuth(ReportsPage);
