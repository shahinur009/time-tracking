import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuth from '../hooks/useAuth';
import { ROLES } from '../utils/consts';

function withAdmin(Component) {
    const WithAdmin = (props) => {
        const router = useRouter();
        const { isAuth, user } = useAuth();
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            if (!router.isReady) return;
            if (!isAuth) {
                router.push('/login');
                return;
            }
            if (user?.role !== ROLES.ADMIN) {
                router.push('/tracker');
                return;
            }
            setLoading(false);
        }, [isAuth, user, router.isReady]);

        if (loading) return null;
        return <Component {...props} user={user} />;
    };
    return WithAdmin;
}

export default withAdmin;
