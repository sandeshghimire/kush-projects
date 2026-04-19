"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
            whileHover={badge.earned ? { rotateX: 5, rotateY: 5 } : undefined}
            transition={{ duration: 0.2 }}
            style={{ perspective: 600 }}
        >
            <Card className={cn("h-full overflow-hidden", !badge.earned && "opacity-70")}>
                <CardContent className="flex flex-col items-center p-4 text-center">
                    <div className="relative mb-3 h-16 w-16">
                        <img
                            src={badge.iconPath}
                            alt={badge.title}
                            className={cn(
                                "h-16 w-16 object-contain",
                                !badge.earned && "grayscale",
                            )}
                        />
                        {!badge.earned && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                                <Lock className="h-5 w-5 text-white/80" />
                            </div>
                        )}
                    </div>

                    <h3
                        className={cn(
                            "mb-1 text-sm font-semibold leading-tight",
                            badge.earned ? "text-foreground" : "text-text-muted",
                        )}
                    >
                        {badge.title}
                    </h3>

                    {badge.earned ? (
                        <p className="text-xs text-text-muted">
                            Earned{" "}
                            {badge.awardedAt
                                ? new Date(badge.awardedAt).toLocaleDateString()
                                : ""}
                        </p>
                    ) : (
                        <p className="text-xs text-text-muted">
                            Complete {badge.itemTitle} to earn
                        </p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
