import { useEffect, useState } from 'react';
import { Modal, Input, Checkbox, Button } from 'antd';

function SaveTemplateModal({ open, onClose, onSave, saving }) {
    const [name, setName] = useState('');
    const [includeTime, setIncludeTime] = useState(false);

    useEffect(() => {
        if (open) {
            setName('');
            setIncludeTime(false);
        }
    }, [open]);

    const trimmed = name.trim();

    const handleSave = () => {
        if (!trimmed) return;
        onSave?.({ name: trimmed, includeTime });
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={null}
            footer={null}
            width={520}
            destroyOnClose
            maskClosable={!saving}
            closable={!saving}
        >
            <div style={{ paddingTop: 4 }}>
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: 500,
                        color: '#1f2937',
                        paddingBottom: 16,
                        borderBottom: '1px solid #e5e7eb',
                        marginBottom: 18,
                    }}
                >
                    Create template
                </div>

                <Input
                    autoFocus
                    placeholder="Template name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && trimmed) {
                            e.preventDefault();
                            handleSave();
                        }
                    }}
                    style={{ height: 40, marginBottom: 16 }}
                />

                <Checkbox
                    checked={includeTime}
                    onChange={(e) => setIncludeTime(e.target.checked)}
                    style={{ marginBottom: 18 }}
                >
                    Save time also
                </Checkbox>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 18,
                        paddingTop: 18,
                        borderTop: '1px solid #e5e7eb',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        style={{
                            all: 'unset',
                            cursor: saving ? 'default' : 'pointer',
                            color: '#03A9F4',
                            fontSize: 14,
                            opacity: saving ? 0.5 : 1,
                        }}
                    >
                        Cancel
                    </button>
                    <Button
                        type="primary"
                        loading={saving}
                        disabled={!trimmed}
                        onClick={handleSave}
                        style={{
                            background: trimmed ? '#03A9F4' : '#7fcff5',
                            borderColor: trimmed ? '#03A9F4' : '#7fcff5',
                            color: '#fff',
                            fontWeight: 600,
                            letterSpacing: 0.4,
                            paddingInline: 24,
                            height: 38,
                            textTransform: 'uppercase',
                        }}
                    >
                        Save
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export default SaveTemplateModal;
