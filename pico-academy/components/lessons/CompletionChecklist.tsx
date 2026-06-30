"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Upload, FileCode, BookOpen, CheckCircle2 } from "lucide-react";
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
            const res = await fetch(`/api/${kind}s/${slug}/complete`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to mark complete");
            const data = await res.json();
            setCompleted(true);
            if (data.badge) setBadgeInfo(data.badge);
            setShowCelebration(true);
        } catch {
            // silently handled
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        {
            label: "Upload code",
            checked: hasCodeUpload,
            icon: Upload,
            action: !hasCodeUpload ? (
                <a href="#uploads" className="text-xs font-medium text-primary hover:underline">Upload →</a>
            ) : null,
        },
        {
            label: "Write summary",
            checked: hasSummary,
            icon: FileCode,
            action: !hasSummary ? (
                <a href="#summary" className="text-xs font-medium text-primary hover:underline">Write →</a>
            ) : null,
        },
        {
            label: "Pass quiz",
            checked: hasPassedQuiz,
            icon: BookOpen,
            action: (
                <div className="flex items-center gap-2">
                    {bestQuizScore !== null && (
                        <span className="text-xs tabular-nums text-text-muted">
                            Best: {bestQuizScore}%
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
            icon: CheckCircle2,
            action: !completed ? (
                <Button
                    size="sm"
                    disabled={!canComplete || submitting}
                    onClick={handleComplete}
                    className="h-7 text-xs"
                >
                    {submitting ? "Saving…" : "Complete"}
                </Button>
            ) : null,
        },
    ];

    const doneCount = steps.filter((s) => s.checked).length;

    return (
        <>
            <ConfettiBurst trigger={showCelebration} />
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                            Completion Checklist
                        </CardTitle>
                        <span className={cn(
                            "text-xs font-bold tabular-nums px-2 py-0.5 rounded-full",
                            completed ? "bg-success/10 text-success" : "bg-primary/8 text-primary",
                        )}>
                            {doneCount}/{steps.length}
                        </span>
                    </div>
                    <div className="mt-2 h-1 w-full rounded-full bg-border/50 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                            style={{ width: `${(doneCount / steps.length) * 100}%` }}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2.5">
                        {steps.map((step) => (
                            <li key={step.label} className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors",
                                step.checked ? "bg-success/5" : "bg-surface-muted/40",
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full",
                                        step.checked ? "bg-success text-white" : "bg-border/70 text-text-muted",
                                    )}>
                                        {step.checked
                                            ? <Check className="h-3.5 w-3.5" />
                                            : <step.icon className="h-3 w-3" />}
                                    </div>
                                    <span className={cn(
                                        "text-sm font-medium",
                                        step.checked ? "text-foreground line-through decoration-success/40" : "text-text-muted",
                                    )}>
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
                            🎉 {kind === "project" ? "Project" : "Lesson"} Completed!
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {badgeInfo
                                ? `You earned the "${badgeInfo.name}" badge!`
                                : "Great work — keep the momentum going!"}
                        </DialogDescription>
                    </DialogHeader>
                    {badgeInfo && (
                        <div className="flex justify-center py-4">
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-4xl shadow-[var(--shadow-card)]">
                                {badgeInfo.icon}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-center">
                        <DialogClose className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgb(99_102_241/0.30)] transition-all duration-150 hover:opacity-90">
                            Continue
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
