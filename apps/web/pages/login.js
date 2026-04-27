import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Form, Input, Button, Typography, Divider, Flex, Tooltip } from 'antd';
import Logo from '@/Components/Logo';
import useAuth from '@/hooks/useAuth';
import { useLogin } from '@/api/queries/auth';

const { Title, Paragraph, Text } = Typography;

function Login() {
    const { isAuth } = useAuth();
    const router = useRouter();
    const login = useLogin();

    useEffect(() => {
        if (isAuth) router.push('/tracker');
    }, [isAuth]);

    const handleFinish = (values) => {
        login.mutate(values);
    };

    if (isAuth) return null;

    return (
        <div className="auth-wrap">
            <div className="auth-card">
                <div className="logo-row">
                    <Logo />
                </div>
                <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>
                    Log in
                </Title>
                <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                    Welcome back
                </Paragraph>

                <Tooltip title="Available in phase 2">
                    <Button
                        block
                        size="large"
                        disabled
                        style={{ marginTop: 16 }}
                    >
                        Sign in with ClickUp (coming soon)
                    </Button>
                </Tooltip>

                <Divider>
                    <Text type="secondary">OR</Text>
                </Divider>

                <Form layout="vertical" onFinish={handleFinish}>
                    <Form.Item
                        name="email"
                        rules={[
                            { type: 'email', message: 'Invalid email' },
                            { required: true, message: 'Email required' },
                        ]}
                    >
                        <Input size="large" placeholder="Email" autoComplete="email" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Password required' }]}
                    >
                        <Input.Password
                            size="large"
                            placeholder="Password"
                            autoComplete="current-password"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            block
                            size="large"
                            type="primary"
                            htmlType="submit"
                            loading={login.isLoading}
                        >
                            Log in
                        </Button>
                    </Form.Item>
                    <Flex justify="center" gap={8}>
                        <Text type="secondary">No account?</Text>
                        <Link href="/signup">Sign up</Link>
                    </Flex>
                </Form>
            </div>
        </div>
    );
}

export default Login;
