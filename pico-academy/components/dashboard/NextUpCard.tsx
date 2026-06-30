"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, BookOpen, Wrench, Sparkles } from "lucide-react";
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

const topicDot: Record<string, string> = {
    Setup: "bg-blue-400",
    GPIO: "bg-emerald-400",
    Communication: "bg-violet-400",
    Sensors: "bg-orange-400",
    Systems: "bg-indigo-400",
};

export default function NextUpCard() {
    const [nextItem, setNextItem] = useState<(CurriculumItem & { kind: string }) | null>(null);
    const [loading, setLoading] = useState(true);

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
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const href = nextItem
        ? nextItem.kind === "lesson"
            ? `/lessons/${nextItem.slug}`
            : `/projects/${nextItem.slug}`
        : "#";

    const KindIcon = nextItem?.kind === "project" ? Wrench : BookOpen;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-text-muted uppercase tracking-wide">Next Up</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
                    </div>
                ) : !nextItem ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-6 gap-2 text-center">
                        <Sparkles className="h-8 w-8 text-amber-400" />
                        <p className="text-sm font-medium text-foreground">All caught up!</p>
                        <p className="text-xs text-text-muted">Check back for new content.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8">
                                    <KindIcon className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-xs font-medium text-text-muted capitalize">{nextItem.kind} {String(nextItem.order).padStart(2, "0")}</span>
                                <span className={cn("h-1.5 w-1.5 rounded-full ml-auto", topicDot[nextItem.topic] ?? "bg-primary/40")} />
                                <span className="text-[11px] text-text-muted">{nextItem.topic}</span>
                            </div>
                            <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
                                {nextItem.title}
                            </p>
                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                <Clock className="h-3 w-3" />
                                {nextItem.estimatedMinutes} min
                            </span>
                        </div>
                        <Link href={href}>
                            <Button className="w-full" size="default">
                                Start Now
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </>
                )}
            </CardContent>
        </Card>
    );
}


interface CurriculumItem {
    slug: string;
    title: string;
    topic: string;
    estimatedMinutes: number;
    status: string;
    locked: boolean;
    order: number;
}
