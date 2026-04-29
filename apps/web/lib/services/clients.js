import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';

const { GET, POST, PATCH, DELETE } = methodsEnums;
const fetcher = createBaseQuery({});

export const clients = {
    list: async () => {
        const response = await fetcher({ path: '/clients', method: GET });
        return response?.data;
    },
    create: async (body) => {
        const response = await fetcher({ path: '/clients', method: POST, body });
        return response?.data;
    },
    update: async ({ id, ...body }) => {
        const response = await fetcher({
            path: `/clients/${id}`,
            method: PATCH,
            body,
        });
        return response?.data;
    },
    delete: async (id) => {
        const response = await fetcher({
            path: `/clients/${id}`,
            method: DELETE,
        });
        return response;
    },
};
