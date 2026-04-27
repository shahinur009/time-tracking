import { Clock } from 'lucide-react';

function Logo({ size = 28, color = '#03a9f4', iconOnly = false }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={size} color={color} strokeWidth={2.2} />
            {!iconOnly && (
                <span
                    style={{
                        fontSize: size * 0.7,
                        fontWeight: 700,
                        color: '#222',
                        letterSpacing: -0.5,
                    }}
                >
                    TimeTracker
                </span>
            )}
        </div>
    );
}

export default Logo;
