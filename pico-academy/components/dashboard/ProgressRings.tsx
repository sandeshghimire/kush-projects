"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProgressRing from "@/components/animations/ProgressRing";

interface ProgressData {
    lessons: { total: number; completed: number };
    projects: { total: number; completed: number };
}

export default function ProgressRings() {
    const [data, setData] = useState<ProgressData | null>(null);

    useEffect(() => {
        fetch("/api/progress")
            .then((r) => r.json())
            .then(setData)
            .catch(() => { });
    }, []);

    const lessonsCompleted = data?.lessons.completed ?? 0;
    const lessonsTotal = data?.lessons.total ?? 0;
    const projectsCompleted = data?.projects.completed ?? 0;
    const projectsTotal = data?.projects.total ?? 0;

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-text-muted uppercase tracking-wide">Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <div className="flex items-center justify-center gap-6 py-2">
                    <div className="flex flex-col items-center gap-2">
                        <ProgressRing
                            value={lessonsCompleted}
                            max={lessonsTotal}
                            size={110}
                            strokeWidth={9}
                            color="rgb(99 102 241)"
                            trackColor="rgb(238 240 255)"
                            label="Lessons"
                        />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <ProgressRing
                            value={projectsCompleted}
                            max={projectsTotal}
                            size={110}
                            strokeWidth={9}
                            color="rgb(168 85 247)"
                            trackColor="rgb(245 243 255)"
                            label="Projects"
                        />
                    </div>
                </div>
                <div className="flex w-full justify-around border-t border-border/50 pt-3">
                    <div className="text-center">
                        <p className="text-lg font-bold tabular-nums text-foreground">{lessonsCompleted}<span className="text-sm font-normal text-text-muted">/{lessonsTotal}</span></p>
                        <p className="text-[11px] text-text-muted">Lessons</p>
                    </div>
                    <div className="w-px bg-border/50" />
                    <div className="text-center">
                        <p className="text-lg font-bold tabular-nums text-foreground">{projectsCompleted}<span className="text-sm font-normal text-text-muted">/{projectsTotal}</span></p>
                        <p className="text-[11px] text-text-muted">Projects</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


interface ProgressData {
    lessons: { total: number; completed: number };
    projects: { total: number; completed: number };
}
