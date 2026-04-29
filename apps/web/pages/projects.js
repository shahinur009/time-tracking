import { useState } from 'react';
import { Button, Table, Typography, Popconfirm, Tag } from 'antd';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import withAdmin from '@/hoc/withAdmin';
import Loading from '@/Components/Loading';
import ProjectForm from '@/Modals/ProjectForm';
import {
    useProjects,
    useCreateProject,
    useUpdateProject,
    useDeleteProject,
} from '@/lib/queries/projects';

const { Title } = Typography;

function ProjectsPage() {
    const { data: projects = [], isLoading } = useProjects();
    const create = useCreateProject();
    const update = useUpdateProject();
    const del = useDeleteProject();

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const onSubmit = (values) => {
        if (editing) {
            update.mutate(
                { id: editing._id, ...values },
                { onSuccess: () => setOpen(false) },
            );
        } else {
            create.mutate(values, { onSuccess: () => setOpen(false) });
        }
    };

    return (
        <>
            <div className="page-head">
                <Title level={3} style={{ margin: 0 }}>
                    Projects
                </Title>
                <Button
                    type="primary"
                    icon={<Plus size={14} />}
                    onClick={() => {
                        setEditing(null);
                        setOpen(true);
                    }}
                >
                    New project
                </Button>
            </div>
            {isLoading ? (
                <Loading height={200} />
            ) : (
                <Table
                    dataSource={projects}
                    rowKey="_id"
                    pagination={false}
                    scroll={{ x: 'auto' }}
                    style={{ whiteSpace: 'nowrap' }}
                    columns={[
                        {
                            title: 'Project',
                            dataIndex: 'name',
                            render: (name, row) => (
                                <span>
                                    <Tag color={row.color} style={{ marginRight: 8 }}>
                                        ●
                                    </Tag>
                                    {name}
                                </span>
                            ),
                        },
                        { title: 'Description', dataIndex: 'description' },
                        {
                            title: 'Actions',
                            align: 'right',
                            render: (_, row) => (
                                <span style={{ display: 'inline-flex', gap: 8 }}>
                                    <Button
                                        size="small"
                                        icon={<Pencil size={14} />}
                                        onClick={() => {
                                            setEditing(row);
                                            setOpen(true);
                                        }}
                                    />
                                    <Popconfirm
                                        title="Archive project?"
                                        onConfirm={() => del.mutate(row._id)}
                                    >
                                        <Button
                                            size="small"
                                            danger
                                            icon={<Trash2 size={14} />}
                                        />
                                    </Popconfirm>
                                </span>
                            ),
                        },
                    ]}
                />
            )}
            <ProjectForm
                open={open}
                initial={editing}
                onCancel={() => setOpen(false)}
                onSubmit={onSubmit}
                loading={create.isLoading || update.isLoading}
            />
        </>
    );
}

export default withAdmin(ProjectsPage);
