import { useEffect, useMemo, useState } from 'react';
import { Typography, Empty, Tag, Tooltip, Badge } from 'antd';
import { useQueryClient } from 'react-query';
import withAdmin from '@/hoc/withAdmin';
import Loading from '@/Components/Loading';
import { useTeamLive } from '@/api/queries/team';
import { useSocket, useSocketEvent } from '@/context/SocketContext';
import { formatDuration, secondsBetween } from '@/utils/format';

const { Title, Text } = Typography;

function TeamLivePage() {
    const queryClient = useQueryClient();
    const { connected } = useSocket();
    const { data = [], isLoading } = useTeamLive({
        refetchInterval: connected ? false : 15000,
    });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    useSocketEvent('timer:started', () => {
        queryClient.invalidateQueries(['team', 'live']);
    });
    useSocketEvent('timer:stopped', () => {
        queryClient.invalidateQueries(['team', 'live']);
    });

    const rows = useMemo(
        () =>
            (data || []).map((r) => ({
                ...r,
                elapsed: secondsBetween(r.startTime, new Date()),
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data, tick],
    );

    const totalActive = rows.length;

    return (
        <div
            style={{
                background: '#fff',
                borderRadius: 4,
                border: '1px solid #e8e8e8',
                padding: 24,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Title level={3} style={{ margin: 0, fontWeight: 400 }}>
                        Live View
                    </Title>
                    <Tooltip title={connected ? 'Realtime connected' : 'Polling fallback'}>
                        <Badge
                            status={connected ? 'success' : 'warning'}
                            text={connected ? 'Live' : 'Polling'}
                        />
                    </Tooltip>
                </div>
                <Text style={{ color: '#666' }}>
                    {totalActive} active {totalActive === 1 ? 'timer' : 'timers'}
                </Text>
            </div>

            {isLoading ? (
                <Loading height={200} />
            ) : rows.length === 0 ? (
                <Empty description="No active timers right now" />
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 12,
                    }}
                >
                    {rows.map((r) => (
                        <LiveCard key={r.entryId} row={r} />
                    ))}
                </div>
            )}
        </div>
    );
}

function LiveCard({ row }) {
    return (
        <div
            style={{
                border: '1px solid #e8e8e8',
                borderRadius: 6,
                padding: 16,
                background: '#fff',
                position: 'relative',
                transition: 'box-shadow 200ms ease',
            }}
            onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 0,
                    }}
                >
                    <span
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#03a9f4',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                    >
                        {(row.userName || row.userEmail || '?')[0]?.toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                fontWeight: 500,
                                color: '#333',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            title={row.userName}
                        >
                            {row.userName || row.userEmail}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: '#888',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            title={row.userEmail}
                        >
                            {row.userEmail}
                        </div>
                    </div>
                </div>
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#5BB85C',
                        boxShadow: '0 0 0 4px rgba(91,184,92,0.2)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                />
            </div>
            <div style={{ marginBottom: 8 }}>
                {row.projectName ? (
                    <Tag color={undefined} style={{ background: '#fafafa' }}>
                        <span
                            style={{
                                display: 'inline-block',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: row.projectColor || '#8c8c8c',
                                marginRight: 6,
                                verticalAlign: 'middle',
                            }}
                        />
                        {row.projectName}
                    </Tag>
                ) : (
                    <Tag>(No project)</Tag>
                )}
            </div>
            <div
                style={{
                    color: '#555',
                    fontSize: 13,
                    minHeight: 20,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 8,
                }}
                title={row.description}
            >
                {row.description || <span style={{ color: '#bbb' }}>(no description)</span>}
            </div>
            <div
                style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: '#5BB85C',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {formatDuration(row.elapsed)}
            </div>
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.9; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.9; }
                }
            `}</style>
        </div>
    );
}

export default withAdmin(TeamLivePage);
