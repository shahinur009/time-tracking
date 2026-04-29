import { useState } from 'react';
import {
    Card,
    Typography,
    Button,
    Tag,
    Divider,
    Space,
    Popconfirm,
    Input,
    Form,
} from 'antd';
import withAuth from '@/hoc/withAuth';
import useAuth from '@/hooks/useAuth';
import {
    useClickupStatus,
    useClickupSync,
    useClickupDisconnect,
    useClickupConnectToken,
} from '@/api/queries/clickup';
import { clickup } from '@/api/services/clickup';

const { Title, Text, Paragraph } = Typography;

function fmt(d) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleString();
    } catch {
        return String(d);
    }
}

function SettingsPage() {
    const { user } = useAuth();
    const { data: status, isLoading } = useClickupStatus();
    const sync = useClickupSync();
    const disconnect = useClickupDisconnect();
    const connectToken = useClickupConnectToken();
    const [tokenValue, setTokenValue] = useState('');

    const connected = !!status?.connected;
    const configured = status?.configured !== false;

    const handleTokenSubmit = () => {
        const t = tokenValue.trim();
        if (!t.startsWith('pk_')) return;
        connectToken.mutate(t, {
            onSuccess: () => setTokenValue(''),
        });
    };

    return (
        <>
            <div className="page-head">
                <Title level={3} style={{ margin: 0 }}>
                    Settings
                </Title>
            </div>

            <Card title="Profile" style={{ maxWidth: 640 }}>
                <Paragraph>
                    <Text type="secondary">Name:</Text> <strong>{user?.name}</strong>
                </Paragraph>
                <Paragraph>
                    <Text type="secondary">Email:</Text> <strong>{user?.email}</strong>
                </Paragraph>
                <Paragraph>
                    <Text type="secondary">Role:</Text>{' '}
                    <Tag color="blue">{user?.role}</Tag>
                </Paragraph>
            </Card>

            <Card
                title="ClickUp integration"
                style={{ maxWidth: 640, marginTop: 20 }}
                loading={isLoading}
            >
                {!configured && !connected && (
                    <Paragraph type="warning">
                        OAuth not configured on the server. You can still connect
                        using a Personal API Token (CLICKUP_TOKEN_ENC_KEY env var
                        is required).
                    </Paragraph>
                )}

                {!connected && (
                    <>
                        <Paragraph type="secondary">
                            Connect your ClickUp workspace to track time on your
                            ClickUp tasks and (optionally) push entries back to
                            ClickUp.
                        </Paragraph>

                        {configured && (
                            <Button
                                type="primary"
                                onClick={() => {
                                    window.location.href = clickup.authorizeUrl;
                                }}
                            >
                                Connect via OAuth
                            </Button>
                        )}

                        <Divider>OR use a Personal API Token</Divider>

                        <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                            Get your token at{' '}
                            <a
                                href="https://app.clickup.com/settings/apps"
                                target="_blank"
                                rel="noreferrer"
                            >
                                ClickUp → Settings → Apps
                            </a>
                            . It starts with <code>pk_</code>.
                        </Paragraph>

                        <Form layout="vertical" onFinish={handleTokenSubmit}>
                            <Form.Item label="Personal API Token">
                                <Input.Password
                                    placeholder="pk_..."
                                    value={tokenValue}
                                    onChange={(e) => setTokenValue(e.target.value)}
                                    autoComplete="off"
                                />
                            </Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={connectToken.isLoading}
                                disabled={!tokenValue.trim().startsWith('pk_')}
                            >
                                Connect with token
                            </Button>
                        </Form>
                    </>
                )}

                {connected && (
                    <>
                        <Paragraph>
                            <Tag color="green">Connected</Tag>
                        </Paragraph>
                        <Paragraph>
                            <Text type="secondary">ClickUp user ID:</Text>{' '}
                            <strong>{status?.clickupUserId || '—'}</strong>
                        </Paragraph>
                        <Paragraph>
                            <Text type="secondary">Default team:</Text>{' '}
                            <strong>{status?.clickupTeamId || '—'}</strong>
                        </Paragraph>
                        <Paragraph>
                            <Text type="secondary">Connected at:</Text>{' '}
                            <strong>{fmt(status?.connectedAt)}</strong>
                        </Paragraph>
                        <Paragraph>
                            <Text type="secondary">Last task sync:</Text>{' '}
                            <strong>{fmt(status?.lastSyncedAt)}</strong>
                        </Paragraph>

                        <Space>
                            <Button
                                type="primary"
                                loading={sync.isLoading}
                                onClick={() => sync.mutate({})}
                            >
                                Re-sync tasks
                            </Button>
                            <Popconfirm
                                title="Disconnect ClickUp?"
                                description="Cached tasks will be removed. Existing time entries are kept."
                                onConfirm={() => disconnect.mutate()}
                            >
                                <Button danger loading={disconnect.isLoading}>
                                    Disconnect
                                </Button>
                            </Popconfirm>
                        </Space>
                    </>
                )}

                <Divider />
                <Text type="secondary">
                    OAuth-based — no browser extension. Time entries can be pushed
                    back to ClickUp per entry.
                </Text>
            </Card>
        </>
    );
}

export default withAuth(SettingsPage);
