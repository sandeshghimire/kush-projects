"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, CheckCircle2, Circle } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import LessonHeader from "@/components/lessons/LessonHeader";
import MarkdownRenderer from "@/components/lessons/MarkdownRenderer";
import CompletionChecklist from "@/components/lessons/CompletionChecklist";
import UploadsPanel from "@/components/lessons/UploadsPanel";
import SummaryForm from "@/components/lessons/SummaryForm";
import StickyNotes from "@/components/lessons/StickyNotes";
import { cn } from "@/lib/utils";

interface ProjectData {
    slug: string;
    order: number;
    title: string;
    description: string;
    topic: string;
    difficulty: string;
    estimatedMinutes: number;
    status: string;
    locked: boolean;
    lockReason?: string;
    body: string;
    hasCodeUpload: boolean;
    hasSummary: boolean;
    hasPassedQuiz: boolean;
    bestQuizScore: number | null;
    summary: string;
    notes: Array<{ id: string; content: string; color: string; createdAt: string }>;
    comments: Array<{ id: string; name: string; content: string; createdAt: string }>;
    uploads: Array<{ id: string; name: string; size: number; category: string; createdAt: string }>;
}

interface ProjectListItem {
    slug: string;
    order: number;
    status: string;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [project, setProject] = useState<ProjectData | null>(null);
    const [allProjects, setAllProjects] = useState<ProjectListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch(`/api/projects/${slug}`).then((res) => {
                if (!res.ok) throw new Error("Failed to load project");
                return res.json();
            }),
            fetch("/api/projects").then((res) => {
                if (!res.ok) return [];
                return res.json();
            }),
        ])
            .then(([data, list]) => {
                setProject({ ...data, body: data.content ?? data.body ?? "" });
                setAllProjects(list);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <PageContainer>
                <div className="space-y-4">
                    <div className="h-8 w-64 animate-pulse rounded bg-surface-muted" />
                    <div className="h-4 w-96 animate-pulse rounded bg-surface-muted" />
                    <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
                </div>
            </PageContainer>
        );
    }

    if (!project) return null;

    const isLocked = project.locked;
    const currentOrder = project.order;

    return (
        <PageContainer>
            {isLocked && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <Lock className="h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">
                        {project.lockReason ?? "Complete the previous project first"} — you can read the content but cannot start this project yet.
                    </p>
                </div>
            )}
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="min-w-0 space-y-8">
                    <LessonHeader
                        order={project.order}
                        title={project.title}
                        topic={project.topic}
                        difficulty={project.difficulty}
                        estimatedMinutes={project.estimatedMinutes}
                        status={project.status}
                        slug={project.slug}
                    />

                    <MarkdownRenderer content={project.body} />

                    {!isLocked && (
                        <>
                            <SummaryForm
                                slug={project.slug}
                                kind="project"
                                initialSummary={project.summary ?? ""}
                            />

                            <CompletionChecklist
                                slug={project.slug}
                                kind="project"
                                hasCodeUpload={project.hasCodeUpload}
                                hasSummary={project.hasSummary}
                                hasPassedQuiz={project.hasPassedQuiz}
                                bestQuizScore={project.bestQuizScore}
                                status={project.status}
                            />

                            <UploadsPanel
                                slug={project.slug}
                                kind="project"
                                initialUploads={project.uploads ?? []}
                            />
                        </>
                    )}
                </div>

                <aside className="space-y-6">
                    {/* Robot Progress Widget */}
                    <div className="rounded-lg border border-border bg-surface p-4">
                        <h3 className="mb-3 text-sm font-semibold text-foreground">
                            Robot Progress
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: 20 }).map((_, i) => {
                                const proj = allProjects.find((p) => p.order === i + 1);
                                const isCompleted = proj?.status === "completed";
                                const isCurrent = i + 1 === currentOrder;

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-3.5 w-3.5 rounded-full border-2 transition-colors",
                                            isCompleted
                                                ? "border-green-500 bg-green-500"
                                                : "border-gray-300 bg-transparent",
                                            isCurrent && !isCompleted && "pulse-dot border-primary",
                                        )}
                                        title={`Project ${i + 1}${proj ? `: ${isCompleted ? "Completed" : "Incomplete"}` : ""}`}
                                    />
                                );
                            })}
                        </div>
                        <p className="mt-2 text-xs text-text-muted">
                            {allProjects.filter((p) => p.status === "completed").length} / 20 completed
                        </p>
                    </div>

                    {!isLocked && (
                        <>
                            <StickyNotes
                                slug={project.slug}
                                kind="project"
                                initialNotes={project.notes ?? []}
                            />
                        </>
                    )}
                </aside>
            </div>
        </PageContainer>
    );
}
