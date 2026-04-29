import { useState } from 'react';
import { Button, Table, Typography, Popconfirm, Tag, Modal, Form, Input, Select } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import withAdmin from '@/hoc/withAdmin';
import Loading from '@/Components/Loading';
import {
    useUsers,
    useCreateUser,
    useUpdateUserRole,
    useDeleteUser,
} from '@/lib/queries/users';
import useAuth from '@/hooks/useAuth';

const { Title } = Typography;

function TeamPage() {
    const { data: users = [], isLoading } = useUsers();
    const create = useCreateUser();
    const updateRole = useUpdateUserRole();
    const del = useDeleteUser();
    const { user: me } = useAuth();

    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const onSubmit = async () => {
        const values = await form.validateFields();
        create.mutate(values, {
            onSuccess: () => {
                setOpen(false);
                form.resetFields();
            },
        });
    };

    return (
        <>
            <div className="page-head">
                <Title level={3} style={{ margin: 0 }}>
                    Team
                </Title>
                <Button
                    type="primary"
                    icon={<Plus size={14} />}
                    onClick={() => setOpen(true)}
                >
                    Add member
                </Button>
            </div>
            {isLoading ? (
                <Loading height={200} />
            ) : (
                <Table
                    dataSource={users}
                    rowKey="_id"
                    pagination={false}
                    scroll={{ x: 'auto' }}
                    style={{ whiteSpace: 'nowrap' }}
                    columns={[
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Email', dataIndex: 'email' },
                        {
                            title: 'Role',
                            dataIndex: 'role',
                            render: (role, row) => (
                                <Select
                                    value={role}
                                    size="small"
                                    style={{ width: 130 }}
                                    disabled={row._id === me?._id || row._id === me?.id}
                                    onChange={(val) =>
                                        updateRole.mutate({ id: row._id, role: val })
                                    }
                                    options={[
                                        { label: 'Admin', value: 'admin' },
                                        { label: 'Member', value: 'member' },
                                    ]}
                                />
                            ),
                        },
                        {
                            title: 'Status',
                            dataIndex: 'status',
                            render: (s) => (
                                <Tag color={s === 'active' ? 'green' : 'default'}>
                                    {s}
                                </Tag>
                            ),
                        },
                        {
                            title: 'Actions',
                            align: 'right',
                            render: (_, row) => (
                                <Popconfirm
                                    title="Delete user?"
                                    disabled={row._id === me?._id || row._id === me?.id}
                                    onConfirm={() => del.mutate(row._id)}
                                >
                                    <Button
                                        size="small"
                                        danger
                                        disabled={row._id === me?._id || row._id === me?.id}
                                        icon={<Trash2 size={14} />}
                                    />
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            )}

            <Modal
                title="Add member"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={onSubmit}
                confirmLoading={create.isLoading}
                okText="Create"
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, type: 'email' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, min: 8 }]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        name="role"
                        label="Role"
                        initialValue="member"
                    >
                        <Select
                            options={[
                                { label: 'Member', value: 'member' },
                                { label: 'Admin', value: 'admin' },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

export default withAdmin(TeamPage);
