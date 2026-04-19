"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Progress } from "@/components/ui/progress";
import LessonCard, { type LessonCardData } from "@/components/lessons/LessonCard";
import EmptyState from "@/components/common/EmptyState";

export default function ProjectsPage() {
    const [lessonsCompleted, setLessonsCompleted] = useState(0);
    const [lessonsTotal, setLessonsTotal] = useState(20);
    const [projectsCompleted, setProjectsCompleted] = useState(0);
    const [projectsTotal, setProjectsTotal] = useState(20);
    const [projects, setProjects] = useState<LessonCardData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/progress").then((res) => {
                if (!res.ok) throw new Error("Failed");
                return res.json();
            }),
            fetch("/api/projects").then((res) => {
                if (!res.ok) return [];
                return res.json();
            }),
        ])
            .then(([data, list]) => {
                setLessonsCompleted(data.lessonsCompleted ?? 0);
                setLessonsTotal(data.lessonsTotal ?? 20);
                setProjectsCompleted(data.projectsCompleted ?? 0);
                setProjectsTotal(data.projectsTotal ?? 20);
                setProjects(list);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <PageContainer>
                <div className="space-y-4">
                    <div className="h-8 w-48 animate-pulse rounded bg-surface-muted" />
                    <div className="h-4 w-72 animate-pulse rounded bg-surface-muted" />
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-40 animate-pulse rounded-lg bg-surface-muted" />
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    const unlocked = lessonsCompleted >= lessonsTotal;

    if (!unlocked) {
        const remaining = lessonsTotal - lessonsCompleted;
        return (
            <PageContainer>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Projects</h1>
                    <p className="mt-1 text-text-muted">
                        20 modules to build your robot
                    </p>
                    <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <Lock className="h-5 w-5 shrink-0 text-amber-600" />
                        <p className="text-sm font-medium text-amber-800">
                            Complete {remaining} more lesson{remaining !== 1 ? "s" : ""} to start working on projects ({lessonsCompleted}/{lessonsTotal} done)
                        </p>
                    </div>
                    <div className="mt-4 max-w-md">
                        <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-text-muted">Progress</span>
                            <span className="font-medium text-foreground">
                                {projectsCompleted}/{projectsTotal}
                            </span>
                        </div>
                        <Progress value={projectsCompleted} max={projectsTotal} />
                    </div>
                </div>

                {projects.length === 0 ? (
                    <EmptyState
                        icon={Lock}
                        title="No projects yet"
                        description="Projects will appear here once they are available."
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                        {projects.map((project) => (
                            <LessonCard
                                key={project.slug}
                                lesson={project}
                                linkPrefix="/projects"
                            />
                        ))}
                    </div>
                )}
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Projects</h1>
                <p className="mt-1 text-text-muted">
                    20 modules to build your robot
                </p>
                <div className="mt-4 max-w-md">
                    <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-text-muted">Progress</span>
                        <span className="font-medium text-foreground">
                            {projectsCompleted}/{projectsTotal}
                        </span>
                    </div>
                    <Progress value={projectsCompleted} max={projectsTotal} />
                </div>
            </div>

            {projects.length === 0 ? (
                <EmptyState
                    icon={Lock}
                    title="No projects yet"
                    description="Projects will appear here once they are available."
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {projects.map((project) => (
                        <LessonCard
                            key={project.slug}
                            lesson={project}
                            linkPrefix="/projects"
                        />
                    ))}
                </div>
            )}
        </PageContainer>
    );
}
