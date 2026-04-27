import { useEffect, useState } from 'react';
import { secondsBetween } from '../utils/format';

export function useTimer(startTime) {
    const [seconds, setSeconds] = useState(() =>
        startTime ? secondsBetween(startTime) : 0,
    );

    useEffect(() => {
        if (!startTime) {
            setSeconds(0);
            return;
        }
        setSeconds(secondsBetween(startTime));
        const id = setInterval(() => {
            setSeconds(secondsBetween(startTime));
        }, 1000);
        return () => clearInterval(id);
    }, [startTime]);

    return seconds;
}
