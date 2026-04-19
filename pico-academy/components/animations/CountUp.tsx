"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
    end: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
}

export default function CountUp({ end, duration = 900, prefix = "", suffix = "" }: CountUpProps) {
    const [display, setDisplay] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!ref.current || hasAnimated.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting || hasAnimated.current) return;
                hasAnimated.current = true;
                observer.disconnect();

                const start = performance.now();

                function tick(now: number) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setDisplay(Math.round(eased * end));
                    if (progress < 1) requestAnimationFrame(tick);
                }

                requestAnimationFrame(tick);
            },
            { threshold: 0.3 },
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return (
        <span ref={ref}>
            {prefix}
            {display}
            {suffix}
        </span>
    );
}
