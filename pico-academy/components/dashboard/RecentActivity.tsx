"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, PenLine, MessageSquare, Upload, BookOpen, HelpCircle } from "lucide-react";

interface Activity {
    type: "completed" | "quiz" | "note" | "comment" | "upload";
    itemSlug: string;
    itemTitle: string;
    detail: string;
    timestamp: number;
}

const iconMap: Record<string, React.ElementType> = {
    completed: CheckCircle,
    quiz: HelpCircle,
    note: PenLine,
    comment: MessageSquare,
    upload: Upload,
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
        <Card className="rounded-[20px] shadow-[var(--shadow-card)]">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                {loaded && activities.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                        <BookOpen className="h-4 w-4" />
                        No activity yet — start your first lesson!
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {activities.slice(0, 5).map((a, i) => {
                            const Icon = iconMap[a.type] ?? CheckCircle;
                            return (
                                <li key={i} className="flex items-start gap-3">
                                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {a.itemTitle}
                                        </p>
                                        <p className="text-xs text-text-muted">{a.detail}</p>
                                    </div>
                                    <span className="shrink-0 text-xs text-text-muted">
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
