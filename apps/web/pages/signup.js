import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Form, Input, Button, Typography, Flex, Alert } from 'antd';
import Logo from '@/Components/Logo';
import useAuth from '@/hooks/useAuth';
import { useRegister } from '@/lib/queries/auth';

const { Title, Paragraph, Text } = Typography;

function Signup() {
    const { isAuth } = useAuth();
    const router = useRouter();
    const register = useRegister();

    useEffect(() => {
        if (isAuth) router.push('/tracker');
    }, [isAuth]);

    const handleFinish = (values) => {
        register.mutate(values);
    };

    if (isAuth) return null;

    return (
        <div className="auth-wrap">
            <div className="auth-card">
                <div className="logo-row">
                    <Logo />
                </div>
                <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>
                    Create an account
                </Title>
                <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                    First user becomes the admin automatically.
                </Paragraph>

                <Alert
                    type="info"
                    showIcon
                    message="Role is assigned by the system. You cannot choose admin at signup."
                    style={{ marginBottom: 16 }}
                />

                <Form layout="vertical" onFinish={handleFinish}>
                    <Form.Item
                        name="name"
                        rules={[{ required: true, message: 'Name required' }]}
                    >
                        <Input size="large" placeholder="Full name" />
                    </Form.Item>
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
                        rules={[
                            { required: true, message: 'Password required' },
                            { min: 8, message: 'Minimum 8 characters' },
                        ]}
                    >
                        <Input.Password
                            size="large"
                            placeholder="Password (min 8 chars)"
                            autoComplete="new-password"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            block
                            size="large"
                            type="primary"
                            htmlType="submit"
                            loading={register.isLoading}
                        >
                            Create account
                        </Button>
                    </Form.Item>
                    <Flex justify="center" gap={8}>
                        <Text type="secondary">Already have an account?</Text>
                        <Link href="/login">Log in</Link>
                    </Flex>
                </Form>
            </div>
        </div>
    );
}

export default Signup;
