import { Modal, Typography } from 'antd';
import { formatDuration } from '../utils/format';

const { Text, Paragraph } = Typography;

function ConfirmStop({ open, onCancel, onConfirm, loading, elapsed }) {
    return (
        <Modal
            title="Stop timer?"
            open={open}
            onCancel={onCancel}
            onOk={onConfirm}
            okText="Done"
            cancelText="Keep running"
            okButtonProps={{ danger: true, loading }}
            destroyOnClose
        >
            <Paragraph>
                You tracked <strong>{formatDuration(elapsed)}</strong> on this
                entry.
            </Paragraph>
            <Paragraph>
                <Text type="secondary">
                    Click <strong>Done</strong> to finalize the entry. Click{' '}
                    <strong>Keep running</strong> to resume.
                </Text>
            </Paragraph>
        </Modal>
    );
}

export default ConfirmStop;
