import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';

const { GET, POST, DELETE } = methodsEnums;
const fetcher = createBaseQuery({});

export const tags = {
    list: async () => {
        const response = await fetcher({ path: '/tags', method: GET });
        return response?.data;
    },
    create: async (body) => {
        const response = await fetcher({ path: '/tags', method: POST, body });
        return response?.data;
    },
    delete: async (id) => {
        const response = await fetcher({ path: `/tags/${id}`, method: DELETE });
        return response;
    },
};
