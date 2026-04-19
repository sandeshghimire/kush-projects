"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ConfettiBurstProps {
    trigger: boolean;
    colors?: string[];
}

export default function ConfettiBurst({
    trigger,
    colors = ["#6366f1", "#a855f7", "#818cf8", "#c084fc"],
}: ConfettiBurstProps) {
    const hasFired = useRef(false);

    useEffect(() => {
        if (!trigger || hasFired.current) return;
        hasFired.current = true;

        const defaults = { colors, ticks: 120, spread: 60, zIndex: 9999 };

        confetti({ ...defaults, particleCount: 40, origin: { x: 0.35, y: 0.6 }, angle: 60 });
        setTimeout(() => {
            confetti({ ...defaults, particleCount: 40, origin: { x: 0.65, y: 0.6 }, angle: 120 });
        }, 150);
    }, [trigger, colors]);

    return null;
}
