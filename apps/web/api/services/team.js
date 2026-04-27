import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';

const { GET } = methodsEnums;
const fetcher = createBaseQuery({});

export const team = {
    live: async () => {
        const response = await fetcher({ path: '/team/live', method: GET });
        return response?.data;
    },
};
