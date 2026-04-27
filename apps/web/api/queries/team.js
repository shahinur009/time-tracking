import { useQuery } from 'react-query';
import { team } from '../services/team';

export const useTeamLive = (options = {}) =>
    useQuery({
        queryKey: ['team', 'live'],
        queryFn: team.live,
        ...options,
    });
