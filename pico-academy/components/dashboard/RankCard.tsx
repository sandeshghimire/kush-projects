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
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-text-muted uppercase tracking-wide">Rank</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-between h-[calc(100%-56px)]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_4px_12px_rgb(245_158_11/0.30)]">
                        <Trophy className="h-5.5 w-5.5 text-white" />
                    </div>
                    <div>
                        <p className="text-xl font-bold tracking-tight text-foreground">
                            {rank?.title ?? "Cadet"}
                        </p>
                        <p className="text-xs text-text-muted">{totalCompleted} items completed</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>Progress to next rank</span>
                        <span className="tabular-nums font-medium text-foreground">{progressValue}/{progressMax}</span>
                    </div>
                    <Progress value={progressValue} max={progressMax} className="h-2" />
                    {rank?.itemsToNext !== null && rank?.nextTitle ? (
                        <p className="text-[11px] text-text-muted pt-0.5">
                            {rank.itemsToNext} more to reach{" "}
                            <span className="font-semibold text-foreground">{rank.nextTitle}</span>
                        </p>
                    ) : (
                        <p className="text-[11px] text-amber-600 font-medium pt-0.5">🏆 Maximum rank achieved!</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


interface ProgressData {
    lessons: { completed: number };
    projects: { completed: number };
    rank: Rank;
}
