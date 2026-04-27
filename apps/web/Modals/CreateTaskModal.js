import { useEffect, useState } from 'react';
import { Modal, Input, Button } from 'antd';

function CreateTaskModal({ open, onCancel, onSave, loading }) {
    const [name, setName] = useState('');

    useEffect(() => {
        if (!open) setName('');
    }, [open]);

    const submit = () => {
        const v = name.trim();
        if (!v) return;
        onSave(v);
    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            title="Create Task"
            width={600}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <Button type="link" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        loading={loading}
                        onClick={submit}
                        disabled={!name.trim()}
                    >
                        SAVE
                    </Button>
                </div>
            }
            destroyOnClose
        >
            <Input
                autoFocus
                size="large"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') submit();
                }}
            />
        </Modal>
    );
}

export default CreateTaskModal;
