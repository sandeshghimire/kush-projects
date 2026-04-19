"use client";

import { useEffect, useState } from "react";
import { BookOpen, Award, CheckCircle2 } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import RankHeader from "@/components/profile/RankHeader";
import StatsStrip from "@/components/profile/StatsStrip";
import TimelineChart from "@/components/profile/TimelineChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProgressData {
    lessonsCompleted: number;
    lessonsTotal: number;
    projectsCompleted: number;
    projectsTotal: number;
    quizAverage: number;
    history: Array<{
        completedAt: string;
        kind: string;
        title: string;
        slug: string;
        badgeEarned?: string;
        quizScore?: number | null;
    }>;
}

interface BadgeData {
    slug: string;
    earned: boolean;
}

export default function ProfilePage() {
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [badgesEarned, setBadgesEarned] = useState(0);
    const [badgesTotal, setBadgesTotal] = useState(40);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/progress").then((res) => {
                if (!res.ok) throw new Error("Failed");
                return res.json();
            }),
            fetch("/api/badges").then((res) => {
                if (!res.ok) return [];
                return res.json();
            }),
        ])
            .then(([prog, badges]: [ProgressData, BadgeData[]]) => {
                setProgress(prog);
                setBadgesTotal(badges.length || 40);
                setBadgesEarned(badges.filter((b) => b.earned).length);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading || !progress) {
        return (
            <PageContainer>
                <div className="space-y-6">
                    <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-muted" />
                        ))}
                    </div>
                    <div className="h-72 animate-pulse rounded-lg bg-surface-muted" />
                </div>
            </PageContainer>
        );
    }

    const completedCount =
        (progress.lessonsCompleted ?? 0) + (progress.projectsCompleted ?? 0);

    const completions = (progress.history ?? [])
        .filter((h) => h.completedAt)
        .map((h) => ({ completedAt: h.completedAt }));

    const sortedHistory = [...(progress.history ?? [])].sort(
        (a, b) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );

    return (
        <PageContainer>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            </div>

            <div className="space-y-6">
                <RankHeader completedCount={completedCount} />

                <StatsStrip
                    lessonsCompleted={progress.lessonsCompleted ?? 0}
                    lessonsTotal={progress.lessonsTotal ?? 20}
                    projectsCompleted={progress.projectsCompleted ?? 0}
                    projectsTotal={progress.projectsTotal ?? 20}
                    badgesEarned={badgesEarned}
                    badgesTotal={badgesTotal}
                    quizAverage={progress.quizAverage ?? 0}
                />

                <TimelineChart completions={completions} />

                {/* Completion History */}
                <Card>
                    <CardContent className="p-4">
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Completion History
                        </h3>
                        {sortedHistory.length === 0 ? (
                            <p className="text-sm text-text-muted">
                                No completions yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {sortedHistory.map((entry, i) => (
                                    <div
                                        key={`${entry.slug}-${i}`}
                                        className="flex items-center justify-between rounded-lg border border-border p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {entry.title}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs capitalize"
                                                    >
                                                        {entry.kind}
                                                    </Badge>
                                                    {entry.badgeEarned && (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600">
                                                            <Award className="h-3 w-3" />
                                                            {entry.badgeEarned}
                                                        </span>
                                                    )}
                                                    {entry.quizScore != null && (
                                                        <span className="text-xs text-text-muted">
                                                            Quiz: {entry.quizScore}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-xs text-text-muted">
                                            {new Date(entry.completedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
