import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from 'react-query';
import { Result, Spin } from 'antd';
import persister from '@/utils/persister';
import { AuthKey } from '@/utils/consts';
import { auth } from '@/lib/services/auth';

export default function ClickUpCallback() {
    const router = useRouter();
    const client = useQueryClient();
    const { accessToken, refreshToken, error } = router.query;

    useEffect(() => {
        if (!router.isReady) return;
        if (error) return;
        if (!accessToken || !refreshToken) return;

        (async () => {
            try {
                persister.save({ key: 'token', value: accessToken });
                persister.save({ key: 'refreshToken', value: refreshToken });
                const user = await auth.me();
                client.setQueryData(AuthKey, user);
                persister.save({ key: AuthKey, value: user });
                router.replace('/tracker');
            } catch (e) {
                router.replace(`/login?error=${encodeURIComponent(e?.message || 'login_failed')}`);
            }
        })();
    }, [router.isReady, accessToken, refreshToken, error]);

    if (error) {
        return (
            <Result
                status="error"
                title="ClickUp sign-in failed"
                subTitle={String(error)}
                extra={<a href="/login">Back to login</a>}
            />
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" tip="Signing you in via ClickUp…" />
        </div>
    );
}
