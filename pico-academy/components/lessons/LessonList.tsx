"use client";

import { useEffect, useState } from "react";
import LessonCard, { type LessonCardData } from "./LessonCard";
import EmptyState from "@/components/common/EmptyState";
import { BookOpen } from "lucide-react";

export default function LessonList() {
    const [lessons, setLessons] = useState<LessonCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/lessons")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch lessons");
                return res.json();
            })
            .then((data) => setLessons(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-40 animate-pulse rounded-lg bg-surface-muted"
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                icon={BookOpen}
                title="Error loading lessons"
                description={error}
            />
        );
    }

    if (lessons.length === 0) {
        return (
            <EmptyState
                icon={BookOpen}
                title="No lessons yet"
                description="Lessons will appear here once they are available."
            />
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {lessons.map((lesson) => (
                <LessonCard key={lesson.slug} lesson={lesson} />
            ))}
        </div>
    );
}
