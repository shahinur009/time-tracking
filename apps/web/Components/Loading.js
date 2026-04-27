import { Spin } from 'antd';

function Loading({ tip = 'Loading…', height = '60vh' }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height,
            }}
        >
            <Spin size="large" tip={tip} />
        </div>
    );
}

export default Loading;
