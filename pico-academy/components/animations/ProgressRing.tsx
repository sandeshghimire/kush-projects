"use client";

import { motion } from "framer-motion";

interface ProgressRingProps {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    trackColor?: string;
    label?: string;
}

export default function ProgressRing({
    value,
    max,
    size = 120,
    strokeWidth = 10,
    color = "rgb(var(--primary))",
    trackColor = "rgb(var(--surface-muted))",
    label,
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = max > 0 ? Math.min(value / max, 1) : 0;
    const strokeDashoffset = circumference * (1 - percentage);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold tabular-nums text-foreground">
                    {Math.round(percentage * 100)}%
                </span>
                {label && (
                    <span className="text-[10px] font-medium text-text-muted">{label}</span>
                )}
            </div>
        </div>
    );
}
