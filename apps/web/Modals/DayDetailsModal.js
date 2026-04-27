import { Modal } from 'antd';

const DIVIDER = '#e8e8e8';

function DayDetailsModal({ open, onClose, day }) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            closable
            title={null}
            destroyOnClose
            width={520}
            styles={{ body: { padding: 0 } }}
        >
            <div style={{ padding: '20px 24px 16px' }}>
                <div style={{ fontSize: 20, color: '#333' }}>
                    {day?.day || ''}
                </div>
            </div>
            <div
                style={{
                    borderTop: `1px solid ${DIVIDER}`,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                }}
            >
                <Row
                    label="Project"
                    value={day?.label || '00:00:00'}
                />
                <Row
                    label="Billable"
                    value={day?.label || '00:00:00'}
                    extra={day?.seconds > 0 ? '100,00%' : '0,00%'}
                />
            </div>
        </Modal>
    );
}

function Row({ label, value, extra }) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '120px 120px 1fr',
                alignItems: 'center',
                fontSize: 14,
                color: '#333',
            }}
        >
            <span style={{ fontWeight: 600 }}>{label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
            {extra && (
                <span style={{ color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' }}>
                    {extra}
                </span>
            )}
        </div>
    );
}

export default DayDetailsModal;
