"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ChevronRight, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const topicColors: Record<string, string> = {
    Setup: "bg-blue-100 text-blue-700",
    GPIO: "bg-green-100 text-green-700",
    Communication: "bg-purple-100 text-purple-700",
    Sensors: "bg-orange-100 text-orange-700",
    Displays: "bg-pink-100 text-pink-700",
    Audio: "bg-rose-100 text-rose-700",
    Wireless: "bg-cyan-100 text-cyan-700",
    Advanced: "bg-red-100 text-red-700",
    PWM: "bg-amber-100 text-amber-700",
    ADC: "bg-teal-100 text-teal-700",
    Timers: "bg-indigo-100 text-indigo-700",
    Interrupts: "bg-violet-100 text-violet-700",
    DMA: "bg-fuchsia-100 text-fuchsia-700",
    PIO: "bg-emerald-100 text-emerald-700",
    Storage: "bg-yellow-100 text-yellow-700",
    Power: "bg-lime-100 text-lime-700",
};

const difficultyColors: Record<string, string> = {
    Beginner: "bg-green-100 text-green-700",
    Intermediate: "bg-yellow-100 text-yellow-700",
    Advanced: "bg-red-100 text-red-700",
};

const statusConfig: Record<string, { label: string; className: string }> = {
    "not-started": { label: "Not Started", className: "bg-gray-100 text-gray-600" },
    "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-700" },
    completed: { label: "Completed", className: "bg-green-100 text-green-700" },
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
    const status = statusConfig[lesson.status] ?? statusConfig["not-started"];

    const buttonLabel =
        lesson.status === "completed"
            ? "Completed"
            : lesson.status === "in-progress"
                ? "Continue"
                : "Start";

    return (
        <motion.div
            whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
            transition={{ duration: 0.2 }}
            className="rounded-lg"
        >
            <Card className="relative overflow-hidden h-full">
                <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                            {String(lesson.order).padStart(2, "0")}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", topicColors[lesson.topic] ?? "bg-gray-100 text-gray-700")}>
                                    {lesson.topic}
                                </span>
                                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", difficultyColors[lesson.difficulty] ?? "bg-gray-100 text-gray-700")}>
                                    {lesson.difficulty}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                                    <Clock className="h-3 w-3" />
                                    {lesson.estimatedMinutes}m
                                </span>
                            </div>
                            <h3 className="mb-1 text-base font-semibold leading-tight text-foreground">
                                {lesson.title}
                            </h3>
                            <p className="mb-3 line-clamp-2 text-sm text-text-muted">
                                {lesson.description}
                            </p>
                            <div className="flex items-center justify-between">
                                <Badge
                                    variant="secondary"
                                    className={cn("text-xs", status.className)}
                                >
                                    {status.label}
                                </Badge>
                                <Link href={`${linkPrefix}/${lesson.slug}`}>
                                    <Button
                                        size="sm"
                                        variant={lesson.locked ? "outline" : lesson.status === "completed" ? "secondary" : "default"}
                                    >
                                        {lesson.locked ? "View" : buttonLabel}
                                        {lesson.locked ? <Lock className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
