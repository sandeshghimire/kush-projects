"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const topicColors: Record<string, { bg: string; text: string; dot: string }> = {
    Setup:         { bg: "bg-blue-50",    text: "text-blue-600",    dot: "bg-blue-400" },
    GPIO:          { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
    Communication: { bg: "bg-violet-50",  text: "text-violet-600",  dot: "bg-violet-400" },
    Sensors:       { bg: "bg-orange-50",  text: "text-orange-600",  dot: "bg-orange-400" },
    Displays:      { bg: "bg-pink-50",    text: "text-pink-600",    dot: "bg-pink-400" },
    Audio:         { bg: "bg-rose-50",    text: "text-rose-600",    dot: "bg-rose-400" },
    Wireless:      { bg: "bg-cyan-50",    text: "text-cyan-600",    dot: "bg-cyan-400" },
    Advanced:      { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-400" },
    PWM:           { bg: "bg-amber-50",   text: "text-amber-600",   dot: "bg-amber-400" },
    ADC:           { bg: "bg-teal-50",    text: "text-teal-600",    dot: "bg-teal-400" },
    Timers:        { bg: "bg-indigo-50",  text: "text-indigo-600",  dot: "bg-indigo-400" },
    Interrupts:    { bg: "bg-violet-50",  text: "text-violet-600",  dot: "bg-violet-400" },
    DMA:           { bg: "bg-fuchsia-50", text: "text-fuchsia-600", dot: "bg-fuchsia-400" },
    PIO:           { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
    Storage:       { bg: "bg-yellow-50",  text: "text-yellow-600",  dot: "bg-yellow-400" },
    Power:         { bg: "bg-lime-50",    text: "text-lime-600",    dot: "bg-lime-400" },
    Systems:       { bg: "bg-indigo-50",  text: "text-indigo-600",  dot: "bg-indigo-400" },
};

const difficultyBadge: Record<string, string> = {
    Beginner:     "text-emerald-600 bg-emerald-50 ring-emerald-200/60",
    Intermediate: "text-amber-600   bg-amber-50   ring-amber-200/60",
    Advanced:     "text-red-600     bg-red-50     ring-red-200/60",
};

const statusBar: Record<string, string> = {
    not_started: "bg-border/60",
    in_progress: "bg-gradient-to-b from-primary to-accent",
    completed:   "bg-gradient-to-b from-success to-emerald-400",
};

export interface LessonCardData {
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
    bestQuizScore?: number | null;
    completedAt?: string | null;
}

interface LessonCardProps {
    lesson: LessonCardData;
    linkPrefix?: string;
}

export default function LessonCard({ lesson, linkPrefix = "/lessons" }: LessonCardProps) {
    const topic = topicColors[lesson.topic] ?? { bg: "bg-primary-50", text: "text-primary", dot: "bg-primary" };
    const isCompleted = lesson.status === "completed";
    const isInProgress = lesson.status === "in_progress";
    const bar = statusBar[lesson.status] ?? statusBar["not_started"];
    const actionLabel = isCompleted ? "Review" : isInProgress ? "Continue" : "Start";

    return (
        <motion.div
            whileHover={!lesson.locked ? { y: -3 } : undefined}
            transition={{ duration: 0.18, ease: "easeOut" }}
        >
            <Link href={`${linkPrefix}/${lesson.slug}`} className="block h-full">
                <div
                    className={cn(
                        "group relative flex h-full overflow-hidden rounded-2xl border bg-surface transition-shadow duration-200",
                        isCompleted
                            ? "border-success/30 shadow-[0_1px_2px_rgb(16_185_129/0.08),0_4px_16px_rgb(16_185_129/0.08)]"
                            : "border-border/60 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]",
                    )}
                >
                    {/* Left accent bar */}
                    <div className={cn("w-1 shrink-0 rounded-l-2xl", bar)} />

                    <div className="flex flex-1 flex-col p-5">
                        {/* Header row */}
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums",
                                    isCompleted ? "bg-success/10 text-success" : "bg-primary/8 text-primary",
                                )}>
                                    {isCompleted
                                        ? <CheckCircle2 className="h-4 w-4" />
                                        : String(lesson.order).padStart(2, "0")}
                                </div>
                                <span className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                    topic.bg, topic.text,
                                )}>
                                    <span className={cn("h-1.5 w-1.5 rounded-full", topic.dot)} />
                                    {lesson.topic}
                                </span>
                            </div>
                            <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 shrink-0",
                                difficultyBadge[lesson.difficulty] ?? "text-text-muted bg-surface-muted ring-border",
                            )}>
                                {lesson.difficulty}
                            </span>
                        </div>

                        <h3 className={cn(
                            "mb-1.5 text-[15px] font-semibold leading-snug tracking-tight",
                            lesson.locked ? "text-text-muted" : "text-foreground",
                        )}>
                            {lesson.title}
                        </h3>
                        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-text-muted flex-1">
                            {lesson.description}
                        </p>

                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                <Clock className="h-3 w-3" />
                                {lesson.estimatedMinutes}m
                            </span>
                            {lesson.locked ? (
                                <span className="flex items-center gap-1 text-xs text-text-muted">
                                    <Lock className="h-3 w-3" />
                                    Locked
                                </span>
                            ) : (
                                <span className={cn(
                                    "flex items-center gap-1 text-xs font-semibold transition-all",
                                    isCompleted ? "text-success" : "text-primary group-hover:gap-2",
                                )}>
                                    {actionLabel}
                                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
