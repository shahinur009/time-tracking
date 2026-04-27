import { useEffect, useState } from 'react';
import { Modal, Input, Popover, Checkbox, Button, Tooltip } from 'antd';
import { Info, ChevronDown } from 'lucide-react';
import { PROJECT_COLORS } from '../utils/consts';
import ColorSwatch from '../Components/ColorSwatch';
import SearchablePicker from '../Components/Timer/SearchablePicker';
import { useClients, useCreateClient } from '../api/queries/clients';

function ProjectForm({ open, initial, onCancel, onSubmit, loading }) {
    const { data: clients = [] } = useClients();
    const createClient = useCreateClient();

    const [name, setName] = useState('');
    const [clientId, setClientId] = useState(null);
    const [color, setColor] = useState(PROJECT_COLORS[5]);
    const [isPublic, setIsPublic] = useState(true);
    const [template, setTemplate] = useState(null);

    useEffect(() => {
        if (!open) return;
        if (initial) {
            setName(initial.name || '');
            setClientId(initial.clientId?._id || initial.clientId || null);
            setColor(initial.color || PROJECT_COLORS[5]);
            setIsPublic(initial.isPublic !== false);
            setTemplate(null);
        } else {
            setName('');
            setClientId(null);
            setColor(PROJECT_COLORS[5]);
            setIsPublic(true);
            setTemplate(null);
        }
    }, [open, initial]);

    const submit = () => {
        const v = name.trim();
        if (!v) return;
        onSubmit({
            name: v,
            color,
            clientId: clientId || null,
            isPublic,
        });
    };

    const selectedClient = clients.find((c) => c._id === clientId);

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            title={initial ? 'Edit Project' : 'Create new Project'}
            width={720}
            footer={
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 12,
                    }}
                >
                    <Button type="link" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        loading={loading}
                        onClick={submit}
                        disabled={!name.trim()}
                    >
                        {initial ? 'SAVE' : 'CREATE'}
                    </Button>
                </div>
            }
            destroyOnClose
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                    marginBottom: 16,
                }}
            >
                <Input
                    size="large"
                    placeholder="Enter Project name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Popover
                    trigger="click"
                    placement="bottomLeft"
                    overlayInnerStyle={{
                        padding: 0,
                        borderRadius: 8,
                        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                    }}
                    content={
                        <SearchablePicker
                            items={clients}
                            selected={clientId ? [clientId] : []}
                            onToggle={(id) =>
                                setClientId(clientId === id ? null : id)
                            }
                            onCreate={(n) =>
                                createClient.mutate(
                                    { name: n },
                                    {
                                        onSuccess: (data) => {
                                            const id = data?._id || data?.id;
                                            if (id) setClientId(id);
                                        },
                                    },
                                )
                            }
                            placeholder="Add/Search Client"
                            emptyTitle="No Clients yet"
                            emptyHint="Start typing to create one."
                        />
                    }
                >
                    <button
                        type="button"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: 40,
                            padding: '0 12px',
                            border: '1px solid #d9d9d9',
                            borderRadius: 6,
                            background: '#fff',
                            cursor: 'pointer',
                            width: '100%',
                            color: selectedClient ? '#333' : '#bfbfbf',
                            fontSize: 14,
                        }}
                    >
                        <span>{selectedClient?.name || 'Select client'}</span>
                        <ChevronDown size={14} color="#8c8c8c" />
                    </button>
                </Popover>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                    alignItems: 'center',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <ColorSwatch value={color} onChange={setColor} />
                    <Checkbox
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                    >
                        Public
                    </Checkbox>
                    <Tooltip title="Public projects are visible to everyone in the workspace">
                        <Info size={14} color="#8c8c8c" />
                    </Tooltip>
                </div>
                <Popover
                    trigger="click"
                    placement="bottomLeft"
                    overlayInnerStyle={{
                        padding: 0,
                        borderRadius: 8,
                        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                    }}
                    content={
                        <SearchablePicker
                            items={[]}
                            selected={[]}
                            onToggle={() => {}}
                            allowCreate={false}
                            placeholder="Search templates"
                            emptyTitle="No templates yet"
                            emptyHint=""
                        />
                    }
                >
                    <button
                        type="button"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: 40,
                            padding: '0 12px',
                            border: '1px solid #d9d9d9',
                            borderRadius: 6,
                            background: '#fff',
                            cursor: 'pointer',
                            width: '100%',
                            color: template ? '#333' : '#bfbfbf',
                            fontSize: 14,
                        }}
                    >
                        <span>{template || 'No template'}</span>
                        <ChevronDown size={14} color="#8c8c8c" />
                    </button>
                </Popover>
            </div>
        </Modal>
    );
}

export default ProjectForm;
