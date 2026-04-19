"use client";

import { BookOpen, Wrench, Award, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import CountUp from "@/components/animations/CountUp";
import { cn } from "@/lib/utils";

interface StatsStripProps {
    lessonsCompleted: number;
    lessonsTotal: number;
    projectsCompleted: number;
    projectsTotal: number;
    badgesEarned: number;
    badgesTotal: number;
    quizAverage: number;
}

const stats = [
    { key: "lessons", label: "Lessons", icon: BookOpen, color: "text-blue-500" },
    { key: "projects", label: "Projects", icon: Wrench, color: "text-green-500" },
    { key: "badges", label: "Badges", icon: Award, color: "text-amber-500" },
    { key: "quiz", label: "Quiz Avg", icon: Brain, color: "text-purple-500" },
] as const;

export default function StatsStrip({
    lessonsCompleted,
    lessonsTotal,
    projectsCompleted,
    projectsTotal,
    badgesEarned,
    badgesTotal,
    quizAverage,
}: StatsStripProps) {
    const values: Record<string, { value: number; suffix: string }> = {
        lessons: { value: lessonsCompleted, suffix: ` / ${lessonsTotal}` },
        projects: { value: projectsCompleted, suffix: ` / ${projectsTotal}` },
        badges: { value: badgesEarned, suffix: ` / ${badgesTotal}` },
        quiz: { value: quizAverage, suffix: "%" },
    };

    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {stats.map((s) => {
                const Icon = s.icon;
                const v = values[s.key];
                return (
                    <Card key={s.key}>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted", s.color)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-text-muted">{s.label}</p>
                                <p className="text-lg font-bold text-foreground">
                                    <CountUp end={v.value} />
                                    {v.suffix}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
