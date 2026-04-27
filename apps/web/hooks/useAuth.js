import { useQuery, useQueryClient } from 'react-query';
import persister from '../utils/persister';
import { AuthKey, ROLES } from '../utils/consts';

function useAuth() {
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: AuthKey,
        queryFn: () =>
            queryClient.getQueryData(AuthKey) || persister.get({ key: AuthKey }),
        initialData: () =>
            queryClient.getQueryData(AuthKey) || persister.get({ key: AuthKey }),
        staleTime: Infinity,
    });

    return {
        user: user || null,
        isAuth: !!user && !!user.email,
        isAdmin: user?.role === ROLES.ADMIN,
        isMember: user?.role === ROLES.MEMBER,
    };
}

export default useAuth;
