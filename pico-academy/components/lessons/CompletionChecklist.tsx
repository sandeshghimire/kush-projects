"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Upload, FileCode, BookOpen, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import ConfettiBurst from "@/components/animations/ConfettiBurst";
import { cn } from "@/lib/utils";

interface CompletionChecklistProps {
    slug: string;
    kind: "lesson" | "project";
    hasCodeUpload: boolean;
    hasSummary: boolean;
    hasPassedQuiz: boolean;
    bestQuizScore: number | null;
    status: string;
}

export default function CompletionChecklist({
    slug,
    kind,
    hasCodeUpload,
    hasSummary,
    hasPassedQuiz,
    bestQuizScore,
    status,
}: CompletionChecklistProps) {
    const [completed, setCompleted] = useState(status === "completed");
    const [showCelebration, setShowCelebration] = useState(false);
    const [badgeInfo, setBadgeInfo] = useState<{ name: string; icon: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const allSatisfied = hasCodeUpload && hasSummary && hasPassedQuiz;
    const canComplete = allSatisfied && !completed;

    const handleComplete = async () => {
        if (!canComplete) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/${kind}s/${slug}/complete`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Failed to mark complete");
            const data = await res.json();
            setCompleted(true);
            if (data.badge) {
                setBadgeInfo(data.badge);
            }
            setShowCelebration(true);
        } catch {
            // error silently handled
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        {
            label: "Upload code",
            checked: hasCodeUpload,
            icon: Upload,
            action: (
                <a href="#uploads" className="text-xs text-primary hover:underline">
                    Go to uploads
                </a>
            ),
        },
        {
            label: "Write summary",
            checked: hasSummary,
            icon: FileCode,
            action: (
                <a href="#summary" className="text-xs text-primary hover:underline">
                    Write summary
                </a>
            ),
        },
        {
            label: "Pass quiz",
            checked: hasPassedQuiz,
            icon: BookOpen,
            action: (
                <div className="flex items-center gap-2">
                    {bestQuizScore !== null && (
                        <span className="text-xs text-text-muted">
                            Best: {bestQuizScore}/10
                        </span>
                    )}
                    <Link href={`/${kind}s/${slug}/quiz`}>
                        <Button size="sm" variant="outline" className="h-6 text-xs">
                            {hasPassedQuiz ? "Retake" : "Take Quiz"}
                        </Button>
                    </Link>
                </div>
            ),
        },
        {
            label: "Mark complete",
            checked: completed,
            icon: CheckCircle,
            action: !completed ? (
                <Button
                    size="sm"
                    disabled={!canComplete || submitting}
                    onClick={handleComplete}
                    className="h-7 text-xs"
                >
                    {submitting ? "Completing..." : "Complete"}
                </Button>
            ) : null,
        },
    ];

    return (
        <>
            <ConfettiBurst trigger={showCelebration} />
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Completion Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {steps.map((step) => (
                            <li key={step.label} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "flex h-6 w-6 items-center justify-center rounded-full border-2",
                                            step.checked
                                                ? "border-green-500 bg-green-500 text-white"
                                                : "border-border text-text-muted",
                                        )}
                                    >
                                        {step.checked ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <step.icon className="h-3 w-3" />
                                        )}
                                    </div>
                                    <span
                                        className={cn(
                                            "text-sm font-medium",
                                            step.checked ? "text-foreground" : "text-text-muted",
                                        )}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {step.action}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl">
                            🎉 Lesson Completed!
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {badgeInfo
                                ? `You earned the "${badgeInfo.name}" badge!`
                                : "Great work! You've completed this lesson."}
                        </DialogDescription>
                    </DialogHeader>
                    {badgeInfo && (
                        <div className="flex justify-center py-4">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
                                {badgeInfo.icon}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-center">
                        <DialogClose className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
                            Continue
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
