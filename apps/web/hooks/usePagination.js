import { useEffect, useState } from 'react';

const DEFAULT_OPTIONS = ['10', '25', '50', '100'];

export default function usePagination({
    defaultPageSize = 25,
    pageSizeOptions = DEFAULT_OPTIONS,
    resetKey = null,
} = {}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);

    useEffect(() => {
        setPage(1);
    }, [resetKey]);

    const paginationProps = {
        current: page,
        pageSize,
        showSizeChanger: true,
        pageSizeOptions,
        showQuickJumper: true,
        showTotal: (total, [a, b]) => `${a}-${b} of ${total}`,
        onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
        },
        onShowSizeChange: (_, ps) => {
            setPageSize(ps);
            setPage(1);
        },
    };

    return { page, pageSize, setPage, setPageSize, paginationProps };
}
