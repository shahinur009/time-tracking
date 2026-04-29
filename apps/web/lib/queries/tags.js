import { useMutation, useQuery, useQueryClient } from 'react-query';
import { tags } from '../services/tags';

const KEY = ['tags'];

export const useTags = () => useQuery({ queryKey: KEY, queryFn: tags.list });

export const useCreateTag = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: tags.create,
        onSuccess: () => client.invalidateQueries(KEY),
    });
};

export const useDeleteTag = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: tags.delete,
        onSuccess: () => client.invalidateQueries(KEY),
    });
};
