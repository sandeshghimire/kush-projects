import PageContainer from "@/components/layout/PageContainer";
import { Progress } from "@/components/ui/progress";
import LessonList from "@/components/lessons/LessonList";
import { getOverallProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

function getLessonProgress(): { completed: number; total: number } {
    const overall = getOverallProgress();
    return { completed: overall.lessonsCompleted, total: overall.lessonsTotal };
}

export default async function LessonsPage() {
    const progress = getLessonProgress();

    return (
        <PageContainer>
            <div className="mb-8">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-muted">Curriculum</p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Lessons</h1>
                <p className="mt-1 text-sm text-text-muted">
                    {progress.total} steps to mastering the Pico
                </p>
                <div className="mt-4 max-w-sm">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-text-muted">Completed</span>
                        <span className="font-semibold tabular-nums text-foreground">
                            {progress.completed}/{progress.total}
                        </span>
                    </div>
                    <Progress value={progress.completed} max={progress.total} className="h-2" />
                </div>
            </div>

            <LessonList />
        </PageContainer>
    );
}
