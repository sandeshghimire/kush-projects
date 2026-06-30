"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BadgeData {
    slug: string;
    title: string;
    description: string;
    iconPath: string;
    earned: boolean;
    awardedAt: string | null;
    itemTitle: string;
}

interface BadgeTileProps {
    badge: BadgeData;
}

export default function BadgeTile({ badge }: BadgeTileProps) {
    return (
        <motion.div
            whileHover={badge.earned ? { y: -4, scale: 1.02 } : { scale: 1.01 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
        >
            <div className={cn(
                "relative flex flex-col items-center rounded-2xl border p-4 text-center transition-shadow duration-200",
                badge.earned
                    ? "border-primary/20 bg-surface shadow-[0_2px_8px_rgb(99_102_241/0.12),0_0_0_1px_rgb(99_102_241/0.08)] hover:shadow-[var(--shadow-glow-primary)]"
                    : "border-border/50 bg-surface-muted/40",
            )}>
                <div className={cn(
                    "relative mb-3 flex h-16 w-16 items-center justify-center rounded-2xl",
                    badge.earned ? "bg-gradient-to-br from-primary/10 to-accent/10" : "bg-surface-muted",
                )}>
                    <img
                        src={badge.iconPath}
                        alt={badge.title}
                        className={cn("h-10 w-10 object-contain", !badge.earned && "grayscale opacity-40")}
                    />
                    {!badge.earned && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface-muted/60">
                            <Lock className="h-4 w-4 text-text-muted/60" />
                        </div>
                    )}
                    {badge.earned && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                            <span className="text-[8px] text-white font-bold">✓</span>
                        </div>
                    )}
                </div>

                <h3 className={cn(
                    "mb-0.5 text-xs font-semibold leading-tight",
                    badge.earned ? "text-foreground" : "text-text-muted",
                )}>
                    {badge.title}
                </h3>

                {badge.earned ? (
                    <p className="text-[10px] text-success font-medium">
                        {badge.awardedAt
                            ? new Date(badge.awardedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                            : "Earned"}
                    </p>
                ) : (
                    <p className="text-[10px] text-text-muted/70 leading-tight">
                        {badge.itemTitle}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
