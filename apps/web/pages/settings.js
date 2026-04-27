import { Card, Typography, Button, Tag, Divider } from 'antd';
import withAuth from '@/hoc/withAuth';
import useAuth from '@/hooks/useAuth';

const { Title, Text, Paragraph } = Typography;

function SettingsPage() {
    const { user } = useAuth();

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
            >
                <Paragraph type="secondary">
                    Connect your ClickUp workspace to see your tasks inside this
                    tracker and (optionally) push time back to ClickUp.
                </Paragraph>
                <Button disabled type="primary">
                    Connect ClickUp (coming soon)
                </Button>
                <Divider />
                <Text type="secondary">
                    Available in phase 2. Uses ClickUp OAuth — no browser
                    extension needed.
                </Text>
            </Card>
        </>
    );
}

export default withAuth(SettingsPage);
