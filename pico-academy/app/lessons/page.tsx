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
    const lessonLabel = progress.total === 1 ? "step" : "steps";

    return (
        <PageContainer>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Lessons</h1>
                <p className="mt-1 text-text-muted">
                    {progress.total} {lessonLabel} to mastering the Pico
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
