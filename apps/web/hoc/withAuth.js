import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuth from '../hooks/useAuth';

function withAuth(Component) {
    const WithAuth = (props) => {
        const router = useRouter();
        const { isAuth, user } = useAuth();
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            if (!router.isReady) return;
            if (!isAuth) {
                router.push('/login');
                return;
            }
            setLoading(false);
        }, [isAuth, router.isReady]);

        if (loading) return null;
        return <Component {...props} user={user} />;
    };
    return WithAuth;
}

export default withAuth;
