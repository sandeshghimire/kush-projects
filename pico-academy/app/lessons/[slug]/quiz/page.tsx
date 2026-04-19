"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import QuizRunner from "@/components/lessons/QuizRunner";

export default function LessonQuizPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [title, setTitle] = useState("");

    useEffect(() => {
        fetch(`/api/lessons/${slug}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load");
                return res.json();
            })
            .then((data) => setTitle(data.title ?? ""))
            .catch(() => { });
    }, [slug]);

    return (
        <PageContainer>
            <div className="mb-8">
                <div className="mb-2 flex items-center gap-2 text-sm text-text-muted">
                    <Link href="/lessons" className="hover:text-foreground">
                        Lessons
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <Link
                        href={`/lessons/${slug}`}
                        className="hover:text-foreground"
                    >
                        {title || slug}
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground">Quiz</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                    {title ? `${title} — Quiz` : "Quiz"}
                </h1>
            </div>

            <QuizRunner slug={slug} kind="lesson" />
        </PageContainer>
    );
}
