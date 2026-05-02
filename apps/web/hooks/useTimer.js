import { useEffect, useRef, useState } from 'react';

function isOptimisticId(id) {
    return typeof id === 'string' && id.startsWith('optimistic-');
}

export function useTimer(startTime, entryId = null) {
    const [seconds, setSeconds] = useState(0);
    const ref = useRef({ id: null, anchorMs: null });

    useEffect(() => {
        if (!startTime) {
            ref.current = { id: null, anchorMs: null };
            setSeconds(0);
            return;
        }

        const newStartMs = new Date(startTime).getTime();
        const now = Date.now();
        const prev = ref.current;

        const sameEntry =
            prev.id != null &&
            entryId != null &&
            (prev.id === entryId ||
                isOptimisticId(prev.id) !== isOptimisticId(entryId));

        let anchorMs;
        if (sameEntry && prev.anchorMs != null) {
            anchorMs = Math.min(prev.anchorMs, newStartMs);
        } else {
            anchorMs = Math.min(newStartMs, now);
        }
        ref.current = { id: entryId, anchorMs };

        const tick = () => {
            setSeconds(Math.max(0, Math.floor((Date.now() - anchorMs) / 1000)));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startTime, entryId]);

    return seconds;
}
