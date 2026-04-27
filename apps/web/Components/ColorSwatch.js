import { useState } from 'react';
import { Popover } from 'antd';
import { Plus, ChevronDown } from 'lucide-react';
import { PROJECT_COLORS } from '../utils/consts';

function ColorSwatch({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [custom, setCustom] = useState('');

    return (
        <Popover
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            placement="bottomLeft"
            overlayInnerStyle={{ padding: 12 }}
            content={
                <div style={{ width: 180 }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                            marginBottom: 12,
                        }}
                    >
                        {PROJECT_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => {
                                    onChange(c);
                                    setOpen(false);
                                }}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 4,
                                    border:
                                        value === c
                                            ? '2px solid #1677ff'
                                            : '1px solid #e5e7eb',
                                    background: c,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                }}
                            >
                                {value === c && '✓'}
                            </button>
                        ))}
                    </div>
                    <div
                        style={{ fontSize: 13, color: '#333', marginBottom: 6 }}
                    >
                        Custom
                    </div>
                    <label
                        style={{
                            width: 40,
                            height: 40,
                            border: '1px solid #d9d9d9',
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            background: custom || 'transparent',
                        }}
                    >
                        <Plus size={14} color="#8c8c8c" />
                        <input
                            type="color"
                            value={custom || '#4DC9FF'}
                            onChange={(e) => {
                                setCustom(e.target.value);
                                onChange(e.target.value);
                            }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                opacity: 0,
                                cursor: 'pointer',
                            }}
                        />
                    </label>
                </div>
            }
        >
            <button
                type="button"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    padding: 4,
                    background: '#fff',
                    cursor: 'pointer',
                }}
            >
                <span
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 3,
                        background: value,
                        display: 'inline-block',
                    }}
                />
                <ChevronDown size={12} color="#8c8c8c" />
            </button>
        </Popover>
    );
}

export default ColorSwatch;
