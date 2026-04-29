import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';

const { GET, POST, PATCH, DELETE } = methodsEnums;
const fetcher = createBaseQuery({});

export const users = {
    list: async () => {
        const response = await fetcher({ path: '/users', method: GET });
        return response?.data;
    },
    create: async (body) => {
        const response = await fetcher({ path: '/users', method: POST, body });
        return response?.data;
    },
    update: async ({ id, ...body }) => {
        const response = await fetcher({ path: `/users/${id}`, method: PATCH, body });
        return response?.data;
    },
    updateRole: async ({ id, role }) => {
        const response = await fetcher({
            path: `/users/${id}/role`,
            method: PATCH,
            body: { role },
        });
        return response?.data;
    },
    delete: async (id) => {
        const response = await fetcher({ path: `/users/${id}`, method: DELETE });
        return response;
    },
};
