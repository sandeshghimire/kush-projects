"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, PenLine, MessageSquare, Upload, BookOpen, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
    type: "completed" | "quiz" | "note" | "comment" | "upload";
    itemSlug: string;
    itemTitle: string;
    detail: string;
    timestamp: number;
}

const iconConfig: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    completed: { icon: CheckCircle2, bg: "bg-success/10", color: "text-success" },
    quiz: { icon: HelpCircle, bg: "bg-primary/8", color: "text-primary" },
    note: { icon: PenLine, bg: "bg-amber-50", color: "text-amber-500" },
    comment: { icon: MessageSquare, bg: "bg-violet-50", color: "text-violet-500" },
    upload: { icon: Upload, bg: "bg-cyan-50", color: "text-cyan-500" },
};

function relativeTime(epochSeconds: number): string {
    const diff = Math.floor(Date.now() / 1000) - epochSeconds;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function RecentActivity() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch("/api/progress")
            .then((r) => r.json())
            .then((data) => {
                setActivities(data.recentActivity ?? []);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-text-muted uppercase tracking-wide">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                {loaded && activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
                            <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No activity yet</p>
                        <p className="text-xs text-text-muted">Start your first lesson to see progress here</p>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {activities.slice(0, 5).map((a, i) => {
                            const cfg = iconConfig[a.type] ?? iconConfig["completed"];
                            const Icon = cfg.icon;
                            return (
                                <li key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-muted/60">
                                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
                                        <Icon className={cn("h-4 w-4", cfg.color)} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium leading-tight text-foreground">
                                            {a.itemTitle}
                                        </p>
                                        <p className="text-xs text-text-muted">{a.detail}</p>
                                    </div>
                                    <span className="shrink-0 text-[11px] tabular-nums text-text-muted">
                                        {relativeTime(a.timestamp)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
