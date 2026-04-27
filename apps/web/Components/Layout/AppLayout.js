import { useEffect, useMemo, useState } from 'react';
import { Layout, Avatar, Dropdown } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import {
    Clock,
    Calendar,
    LayoutDashboard,
    FileBarChart,
    FolderKanban,
    Users as UsersIcon,
    ListChecks,
    Settings,
    GripVertical,
    Radio,
} from 'lucide-react';
import { useRouter } from 'next/router';
import Logo from '../Logo';
import useAuth from '../../hooks/useAuth';
import { useSidebar } from '../../context/SidebarContext';
import { useLogout } from '../../api/queries/auth';
import { useCurrentEntry } from '../../api/queries/entries';
import { useTimer } from '../../hooks/useTimer';
import { formatDuration } from '../../utils/format';
import { ROLES } from '../../utils/consts';

const { Header, Sider, Content } = Layout;

const ORDER_KEY = 'sidebar-order-v1';

const memberItems = [
    { key: '/tracker', icon: <Clock size={16} />, label: 'Time Tracker' },
    { key: '/timesheet', icon: <ListChecks size={16} />, label: 'Timesheet' },
    { key: '/calendar', icon: <Calendar size={16} />, label: 'Calendar' },
    { key: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { key: '/reports', icon: <FileBarChart size={16} />, label: 'Reports' },
];

const adminItems = [
    { key: '/projects', icon: <FolderKanban size={16} />, label: 'Projects' },
    { key: '/team', icon: <UsersIcon size={16} />, label: 'Team' },
    { key: '/team-live', icon: <Radio size={16} />, label: 'Live View' },
    { key: '/entries', icon: <ListChecks size={16} />, label: 'All Entries' },
];

function AppLayout({ children }) {
    const router = useRouter();
    const { collapsed, toggle } = useSidebar();
    const { user, isAdmin } = useAuth();
    const logout = useLogout();
    const { data: currentEntry } = useCurrentEntry();
    const running =
        currentEntry && currentEntry.status === 'running' ? currentEntry : null;
    const liveSecs = useTimer(running?.startTime);

    const defaults = useMemo(
        () => (isAdmin ? [...memberItems, ...adminItems] : memberItems),
        [isAdmin],
    );

    const [order, setOrder] = useState(null);
    const [dragKey, setDragKey] = useState(null);
    const [overKey, setOverKey] = useState(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(ORDER_KEY);
            setOrder(raw ? JSON.parse(raw) : null);
        } catch {
            setOrder(null);
        }
    }, []);

    const orderedItems = useMemo(() => {
        const map = new Map(defaults.map((it) => [it.key, it]));
        if (!order) return defaults;
        const result = [];
        order.forEach((k) => {
            if (map.has(k)) {
                result.push(map.get(k));
                map.delete(k);
            }
        });
        defaults.forEach((it) => {
            if (map.has(it.key)) result.push(it);
        });
        return result;
    }, [order, defaults]);

    const commitOrder = (next) => {
        setOrder(next);
        try {
            localStorage.setItem(ORDER_KEY, JSON.stringify(next));
        } catch {}
    };

    const handleDrop = (targetKey) => {
        if (!dragKey || dragKey === targetKey) {
            setDragKey(null);
            setOverKey(null);
            return;
        }
        const keys = orderedItems.map((it) => it.key);
        const from = keys.indexOf(dragKey);
        const to = keys.indexOf(targetKey);
        if (from < 0 || to < 0) return;
        keys.splice(from, 1);
        keys.splice(to, 0, dragKey);
        commitOrder(keys);
        setDragKey(null);
        setOverKey(null);
    };

    const userMenu = {
        items: [
            {
                key: 'settings',
                icon: <Settings size={14} />,
                label: 'Settings',
                onClick: () => router.push('/settings'),
            },
            {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Log out',
                onClick: () => logout.mutate(),
            },
        ],
    };

    const sidebarWidth = collapsed ? 72 : 230;

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    borderBottom: '1px solid #eef0f3',
                    background: '#fff',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    height: 64,
                }}
            >
                <Logo />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dropdown menu={userMenu} placement="bottomRight">
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            padding: '6px 10px',
                            borderRadius: 6,
                            transition: 'background 200ms ease',
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.background = '#f5f5f5')
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.background = 'transparent')
                        }
                    >
                        <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                            <div style={{ fontWeight: 600 }}>
                                {user?.name || '—'}
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: '#888',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {user?.role || ROLES.MEMBER}
                            </div>
                        </div>
                        <Avatar
                            icon={<UserOutlined />}
                            style={{ background: '#03a9f4' }}
                        >
                            {user?.name?.[0]?.toUpperCase()}
                        </Avatar>
                    </div>
                </Dropdown>
                </div>
            </Header>
            <button
                type="button"
                onClick={toggle}
                title={collapsed ? 'Expand' : 'Collapse'}
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: sidebarWidth - 12,
                    transform: 'translateY(-50%)',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30,
                    color: '#666',
                    transition:
                        'background 180ms ease, color 180ms ease, left 220ms ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.color = '#1677ff';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.color = '#666';
                }}
            >
                {collapsed ? (
                    <MenuUnfoldOutlined style={{ fontSize: 12 }} />
                ) : (
                    <MenuFoldOutlined style={{ fontSize: 12 }} />
                )}
            </button>
            <Layout>
                <Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={toggle}
                    trigger={null}
                    width={230}
                    collapsedWidth={72}
                    style={{
                        borderRight: '1px solid #eef0f3',
                        background: '#fff',
                        transition: 'all 220ms ease',
                        position: 'sticky',
                        top: 64,
                        height: 'calc(100vh - 64px)',
                        overflow: 'auto',
                    }}
                >
                    <div style={{ padding: '8px 0' }}>
                    {orderedItems.map((item) => {
                        const isTracker = item.key === '/tracker';
                        const runningHere = isTracker && running;
                        const displayItem = runningHere
                            ? { ...item, label: formatDuration(liveSecs) }
                            : item;
                        return (
                            <SidebarItem
                                key={item.key}
                                item={displayItem}
                                active={router.pathname === item.key}
                                collapsed={collapsed}
                                dragging={dragKey === item.key}
                                over={overKey === item.key}
                                labelColor={runningHere ? '#e74c3c' : undefined}
                                monospace={runningHere}
                                onClick={() => router.push(item.key)}
                                onDragStart={() => setDragKey(item.key)}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (overKey !== item.key) setOverKey(item.key);
                                }}
                                onDragLeave={() => setOverKey(null)}
                                onDrop={() => handleDrop(item.key)}
                                onDragEnd={() => {
                                    setDragKey(null);
                                    setOverKey(null);
                                }}
                            />
                        );
                    })}
                </div>
                </Sider>
                <Content style={{ padding: 24 }}>{children}</Content>
            </Layout>
        </Layout>
    );
}

function SidebarItem({
    item,
    active,
    collapsed,
    dragging,
    over,
    labelColor,
    monospace,
    onClick,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
}) {
    const [hover, setHover] = useState(false);
    const bg = active
        ? '#e6f4ff'
        : over
            ? '#f0f7ff'
            : hover
                ? '#f5f5f5'
                : 'transparent';
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: collapsed ? '12px 0' : '12px 20px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                cursor: 'pointer',
                background: bg,
                color: labelColor || (active ? '#1677ff' : '#333'),
                borderLeft: active
                    ? '3px solid #1677ff'
                    : '3px solid transparent',
                fontSize: 14,
                opacity: dragging ? 0.5 : 1,
                transition:
                    'background 200ms ease, color 200ms ease, border-color 200ms ease, padding 220ms ease, opacity 150ms ease',
                userSelect: 'none',
            }}
        >
            <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                {item.icon}
            </span>
            {!collapsed && (
                <>
                    <span
                        style={{
                            flex: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontVariantNumeric: monospace
                                ? 'tabular-nums'
                                : undefined,
                            fontWeight: monospace ? 600 : undefined,
                        }}
                    >
                        {item.label}
                    </span>
                    <span
                        style={{
                            display: 'inline-flex',
                            color: '#bfbfbf',
                            opacity: hover || dragging ? 1 : 0,
                            transition: 'opacity 180ms ease',
                            cursor: 'grab',
                            flexShrink: 0,
                        }}
                        title="Drag to reorder"
                    >
                        <GripVertical size={14} />
                    </span>
                </>
            )}
        </div>
    );
}

export default AppLayout;
