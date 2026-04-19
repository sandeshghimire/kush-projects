"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import type { Rank } from "@/lib/rank";

interface ProgressData {
    lessons: { completed: number };
    projects: { completed: number };
    rank: Rank;
}

export default function RankCard() {
    const [data, setData] = useState<ProgressData | null>(null);

    useEffect(() => {
        fetch("/api/progress")
            .then((r) => r.json())
            .then(setData)
            .catch(() => { });
    }, []);

    const rank = data?.rank;
    const totalCompleted = (data?.lessons.completed ?? 0) + (data?.projects.completed ?? 0);
    const nextMin = rank?.nextTitle ? rank.max + 1 : rank?.max ?? 40;
    const progressValue = rank ? totalCompleted - rank.min : 0;
    const progressMax = rank ? nextMin - rank.min : 1;

    return (
        <Card className="rounded-[20px] shadow-[var(--shadow-card)]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Rank
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-xl font-bold font-display text-foreground">
                    {rank?.title ?? "Cadet"}
                </p>
                <Progress
                    value={progressValue}
                    max={progressMax}
                    className="h-2"
                />
                {rank?.itemsToNext !== null && rank?.nextTitle ? (
                    <p className="text-xs text-text-muted">
                        {rank.itemsToNext} more to reach <span className="font-medium text-foreground">{rank.nextTitle}</span>
                    </p>
                ) : (
                    <p className="text-xs text-text-muted">Maximum rank achieved!</p>
                )}
            </CardContent>
        </Card>
    );
}
