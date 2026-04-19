"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CurriculumItem {
    slug: string;
    title: string;
    topic: string;
    estimatedMinutes: number;
    status: string;
    locked: boolean;
    order: number;
}

const topicColors: Record<string, string> = {
    Setup: "bg-blue-100 text-blue-700",
    "Digital I/O": "bg-green-100 text-green-700",
    "Analog & PWM": "bg-amber-100 text-amber-700",
    Communication: "bg-cyan-100 text-cyan-700",
    Sensors: "bg-rose-100 text-rose-700",
    Motors: "bg-orange-100 text-orange-700",
    Systems: "bg-violet-100 text-violet-700",
};

export default function NextUpCard() {
    const [nextItem, setNextItem] = useState<(CurriculumItem & { kind: string }) | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [lessonsRes, projectsRes] = await Promise.all([
                    fetch("/api/lessons"),
                    fetch("/api/projects"),
                ]);
                const lessons: CurriculumItem[] = await lessonsRes.json();
                const projects: CurriculumItem[] = await projectsRes.json();

                const nextLesson = lessons.find((l) => !l.locked && l.status === "not_started");
                const nextProject = projects.find((p) => !p.locked && p.status === "not_started");

                if (nextLesson) {
                    setNextItem({ ...nextLesson, kind: "lesson" });
                } else if (nextProject) {
                    setNextItem({ ...nextProject, kind: "project" });
                }
            } catch {
                // ignore
            }
        }
        load();
    }, []);

    if (!nextItem) {
        return (
            <Card className="rounded-[20px] shadow-[var(--shadow-card)]">
                <CardHeader>
                    <CardTitle>Next Up</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-text-muted">All caught up! Check back for new content.</p>
                </CardContent>
            </Card>
        );
    }

    const href = nextItem.kind === "lesson"
        ? `/lessons/${nextItem.slug}`
        : `/projects/${nextItem.slug}`;

    const badgeColor = topicColors[nextItem.topic] ?? "bg-gray-100 text-gray-700";

    return (
        <Card className="rounded-[20px] shadow-[var(--shadow-card)]">
            <CardHeader>
                <CardTitle>Next Up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <h3 className="font-semibold text-foreground">{nextItem.title}</h3>
                <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", badgeColor)}>
                        {nextItem.topic}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock className="h-3.5 w-3.5" />
                        {nextItem.estimatedMinutes} min
                    </span>
                </div>
                <Link href={href}>
                    <Button className="mt-2 w-full" size="lg">
                        Continue
                        <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
