"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import LessonHeader from "@/components/lessons/LessonHeader";
import MarkdownRenderer from "@/components/lessons/MarkdownRenderer";
import CompletionChecklist from "@/components/lessons/CompletionChecklist";
import UploadsPanel from "@/components/lessons/UploadsPanel";
import SummaryForm from "@/components/lessons/SummaryForm";
import StickyNotes from "@/components/lessons/StickyNotes";

interface LessonData {
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

export default function LessonDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [lesson, setLesson] = useState<LessonData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/lessons/${slug}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load lesson");
                return res.json();
            })
            .then((data) => {
                setLesson({ ...data, body: data.content ?? data.body ?? "" });
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

    if (!lesson) return null;

    const isLocked = lesson.locked;

    return (
        <PageContainer>
            {isLocked && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <Lock className="h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">
                        {lesson.lockReason ?? "Complete the previous lesson first"} — you can read the content but cannot start this lesson yet.
                    </p>
                </div>
            )}
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="min-w-0 space-y-8">
                    <LessonHeader
                        order={lesson.order}
                        title={lesson.title}
                        topic={lesson.topic}
                        difficulty={lesson.difficulty}
                        estimatedMinutes={lesson.estimatedMinutes}
                        status={lesson.status}
                        slug={lesson.slug}
                    />

                    <MarkdownRenderer content={lesson.body} />

                    {!isLocked && (
                        <>
                            <SummaryForm
                                slug={lesson.slug}
                                kind="lesson"
                                initialSummary={lesson.summary ?? ""}
                            />

                            <CompletionChecklist
                                slug={lesson.slug}
                                kind="lesson"
                                hasCodeUpload={lesson.hasCodeUpload}
                                hasSummary={lesson.hasSummary}
                                hasPassedQuiz={lesson.hasPassedQuiz}
                                bestQuizScore={lesson.bestQuizScore}
                                status={lesson.status}
                            />

                            <UploadsPanel
                                slug={lesson.slug}
                                kind="lesson"
                                initialUploads={lesson.uploads ?? []}
                            />
                        </>
                    )}
                </div>

                <aside className="space-y-6">
                    {!isLocked && (
                        <>
                            <StickyNotes
                                slug={lesson.slug}
                                kind="lesson"
                                initialNotes={lesson.notes ?? []}
                            />
                        </>
                    )}
                </aside>
            </div>
        </PageContainer>
    );
}
