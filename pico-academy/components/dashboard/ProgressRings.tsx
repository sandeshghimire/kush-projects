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
    const lessonsTotal = data?.lessons.total ?? 20;
    const projectsCompleted = data?.projects.completed ?? 0;
    const projectsTotal = data?.projects.total ?? 20;

    return (
        <Card className="rounded-[20px] shadow-[var(--shadow-card)]">
            <CardHeader>
                <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center gap-6">
                    <div className="relative">
                        <ProgressRing
                            value={lessonsCompleted}
                            max={lessonsTotal}
                            size={130}
                            strokeWidth={12}
                            color="rgb(var(--primary))"
                            label="Lessons"
                        />
                    </div>
                    <div className="relative">
                        <ProgressRing
                            value={projectsCompleted}
                            max={projectsTotal}
                            size={130}
                            strokeWidth={12}
                            color="rgb(var(--accent))"
                            label="Projects"
                        />
                    </div>
                </div>
                <div className="mt-4 flex justify-center gap-6 text-sm text-text-muted">
                    <span>{lessonsCompleted}/{lessonsTotal} lessons</span>
                    <span>{projectsCompleted}/{projectsTotal} projects</span>
                </div>
            </CardContent>
        </Card>
    );
}
