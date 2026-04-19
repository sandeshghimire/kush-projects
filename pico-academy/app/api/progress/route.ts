import { NextResponse } from "next/server";
import { getOverallProgress, getItemsWithStatus, getRecentActivity } from "@/lib/progress";

export async function GET() {
    const overall = getOverallProgress();
    const lessons = getItemsWithStatus("lesson");
    const projects = getItemsWithStatus("project");
    const recentActivity = getRecentActivity(5);

    const lessonsInProgress = lessons.filter((l) => l.status === "in_progress").length;
    const projectsInProgress = projects.filter((p) => p.status === "in_progress").length;
    const projectsUnlocked = projects.filter((p) => !p.locked).length;

    return NextResponse.json({
        lessons: {
            total: overall.lessonsTotal,
            completed: overall.lessonsCompleted,
            inProgress: lessonsInProgress,
        },
        projects: {
            total: overall.projectsTotal,
            completed: overall.projectsCompleted,
            inProgress: projectsInProgress,
            unlocked: projectsUnlocked,
        },
        badges: {
            total: overall.badgesTotal,
            earned: overall.badgesEarned,
        },
        rank: overall.rank,
        recentActivity: recentActivity.map((a) => ({
            type: a.type,
            itemSlug: a.itemSlug,
            itemTitle: a.itemTitle,
            detail: a.detail,
            timestamp: a.timestamp,
        })),
    });
}
