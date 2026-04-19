import PageContainer from "@/components/layout/PageContainer";
import { Progress } from "@/components/ui/progress";
import LessonList from "@/components/lessons/LessonList";

export const dynamic = "force-dynamic";

async function getLessonProgress(): Promise<{ completed: number; total: number }> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/progress`, { cache: "no-store" });
        if (!res.ok) return { completed: 0, total: 20 };
        const data = await res.json();
        return {
            completed: data.lessonsCompleted ?? 0,
            total: data.lessonsTotal ?? 20,
        };
    } catch {
        return { completed: 0, total: 20 };
    }
}

export default async function LessonsPage() {
    const progress = await getLessonProgress();

    return (
        <PageContainer>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Lessons</h1>
                <p className="mt-1 text-text-muted">
                    20 steps to mastering the Pico
                </p>
                <div className="mt-4 max-w-md">
                    <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-text-muted">Progress</span>
                        <span className="font-medium text-foreground">
                            {progress.completed}/{progress.total}
                        </span>
                    </div>
                    <Progress value={progress.completed} max={progress.total} />
                </div>
            </div>

            <LessonList />
        </PageContainer>
    );
}
