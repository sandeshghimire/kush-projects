import { getDb } from "./db";
import { getRank } from "./rank";

type Kind = "lesson" | "project";
type Status = "not_started" | "in_progress" | "completed";

interface UnlockState {
    locked: boolean;
    lockReason: string | null;
}

interface ItemWithStatus {
    id: number;
    kind: Kind;
    slug: string;
    orderIndex: number;
    title: string;
    description: string;
    topic: string;
    difficulty: string;
    estimatedMinutes: number;
    status: Status;
    locked: boolean;
    lockReason: string | null;
    bestQuizScore: number | null;
    completedAt: number | null;
}

interface OverallProgress {
    lessonsCompleted: number;
    lessonsTotal: number;
    projectsCompleted: number;
    projectsTotal: number;
    badgesEarned: number;
    badgesTotal: number;
    rank: ReturnType<typeof getRank>;
}

interface RecentActivity {
    type: "completed" | "quiz" | "note" | "comment" | "upload";
    itemSlug: string;
    itemTitle: string;
    detail: string;
    timestamp: number;
}

export function computeUnlockState(
    kind: Kind,
    orderIndex: number,
    allProgress: Map<number, { status: Status; kind: Kind; orderIndex: number }>
): UnlockState {
    if (kind === "lesson") {
        if (orderIndex === 1) {
            return { locked: false, lockReason: null };
        }
        // Check if previous lesson is completed
        for (const [, p] of allProgress) {
            if (p.kind === "lesson" && p.orderIndex === orderIndex - 1) {
                if (p.status === "completed") {
                    return { locked: false, lockReason: null };
                }
                return {
                    locked: true,
                    lockReason: `Complete Lesson ${orderIndex - 1} first`,
                };
            }
        }
        return {
            locked: true,
            lockReason: `Complete Lesson ${orderIndex - 1} first`,
        };
    }

    // Projects: all 20 lessons must be completed first
    let lessonsCompleted = 0;
    for (const [, p] of allProgress) {
        if (p.kind === "lesson" && p.status === "completed") {
            lessonsCompleted++;
        }
    }

    if (lessonsCompleted < 20) {
        return {
            locked: true,
            lockReason: `Complete all 20 lessons first (${lessonsCompleted}/20 done)`,
        };
    }

    if (orderIndex === 1) {
        return { locked: false, lockReason: null };
    }

    // Check if previous project is completed
    for (const [, p] of allProgress) {
        if (p.kind === "project" && p.orderIndex === orderIndex - 1) {
            if (p.status === "completed") {
                return { locked: false, lockReason: null };
            }
            return {
                locked: true,
                lockReason: `Complete Project ${orderIndex - 1} first`,
            };
        }
    }

    return {
        locked: true,
        lockReason: `Complete Project ${orderIndex - 1} first`,
    };
}

function buildProgressMap(): Map<
    number,
    { status: Status; kind: Kind; orderIndex: number }
> {
    const db = getDb();
    const rows = db
        .prepare(
            `SELECT i.id, i.kind, i.order_index,
              COALESCE(ip.status, 'not_started') AS status
       FROM items i
       LEFT JOIN item_progress ip ON ip.item_id = i.id`
        )
        .all() as {
            id: number;
            kind: Kind;
            order_index: number;
            status: Status;
        }[];

    const map = new Map<
        number,
        { status: Status; kind: Kind; orderIndex: number }
    >();
    for (const row of rows) {
        map.set(row.id, {
            status: row.status,
            kind: row.kind,
            orderIndex: row.order_index,
        });
    }
    return map;
}

export function getOverallProgress(): OverallProgress {
    const db = getDb();

    const counts = db
        .prepare(
            `SELECT i.kind,
              COUNT(*) AS total,
              SUM(CASE WHEN ip.status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM items i
       LEFT JOIN item_progress ip ON ip.item_id = i.id
       GROUP BY i.kind`
        )
        .all() as { kind: Kind; total: number; completed: number }[];

    let lessonsCompleted = 0;
    let lessonsTotal = 0;
    let projectsCompleted = 0;
    let projectsTotal = 0;

    for (const row of counts) {
        if (row.kind === "lesson") {
            lessonsCompleted = row.completed;
            lessonsTotal = row.total;
        } else {
            projectsCompleted = row.completed;
            projectsTotal = row.total;
        }
    }

    const badgeRow = db
        .prepare(
            `SELECT COUNT(ba.badge_id) AS earned, (SELECT COUNT(*) FROM badges) AS total
       FROM badge_awards ba`
        )
        .get() as { earned: number; total: number };

    const totalCompleted = lessonsCompleted + projectsCompleted;

    return {
        lessonsCompleted,
        lessonsTotal,
        projectsCompleted,
        projectsTotal,
        badgesEarned: badgeRow.earned,
        badgesTotal: badgeRow.total,
        rank: getRank(totalCompleted),
    };
}

export function getItemsWithStatus(kind: Kind): ItemWithStatus[] {
    const db = getDb();
    const progressMap = buildProgressMap();

    const rows = db
        .prepare(
            `SELECT i.id, i.kind, i.slug, i.order_index, i.title, i.description,
              i.topic, i.difficulty, i.estimated_minutes,
              COALESCE(ip.status, 'not_started') AS status,
              ip.best_quiz_score,
              ip.completed_at
       FROM items i
       LEFT JOIN item_progress ip ON ip.item_id = i.id
       WHERE i.kind = ?
       ORDER BY i.order_index`
        )
        .all(kind) as {
            id: number;
            kind: Kind;
            slug: string;
            order_index: number;
            title: string;
            description: string;
            topic: string;
            difficulty: string;
            estimated_minutes: number;
            status: Status;
            best_quiz_score: number | null;
            completed_at: number | null;
        }[];

    return rows.map((row) => {
        const unlock = computeUnlockState(
            row.kind,
            row.order_index,
            progressMap
        );
        return {
            id: row.id,
            kind: row.kind,
            slug: row.slug,
            orderIndex: row.order_index,
            title: row.title,
            description: row.description,
            topic: row.topic,
            difficulty: row.difficulty,
            estimatedMinutes: row.estimated_minutes,
            status: row.status,
            locked: unlock.locked,
            lockReason: unlock.lockReason,
            bestQuizScore: row.best_quiz_score,
            completedAt: row.completed_at,
        };
    });
}

export function getRecentActivity(limit = 10): RecentActivity[] {
    const db = getDb();

    const activities = db
        .prepare(
            `SELECT * FROM (
        SELECT 'completed' AS type, i.slug AS item_slug, i.title AS item_title,
               'Completed ' || i.kind AS detail, ip.completed_at AS timestamp
        FROM item_progress ip
        JOIN items i ON i.id = ip.item_id
        WHERE ip.status = 'completed' AND ip.completed_at IS NOT NULL

        UNION ALL

        SELECT 'quiz' AS type, i.slug, i.title,
               'Quiz score: ' || qa.score || '%' AS detail, qa.created_at AS timestamp
        FROM quiz_attempts qa
        JOIN items i ON i.id = qa.item_id

        UNION ALL

        SELECT 'note' AS type, i.slug, i.title,
               'Added a note' AS detail, n.created_at AS timestamp
        FROM notes n
        JOIN items i ON i.id = n.item_id

        UNION ALL

        SELECT 'comment' AS type, i.slug, i.title,
               'Posted a comment' AS detail, c.created_at AS timestamp
        FROM comments c
        JOIN items i ON i.id = c.item_id

        UNION ALL

        SELECT 'upload' AS type, i.slug, i.title,
               'Uploaded ' || u.original_name AS detail, u.created_at AS timestamp
        FROM uploads u
        JOIN items i ON i.id = u.item_id
      )
      ORDER BY timestamp DESC
      LIMIT ?`
        )
        .all(limit) as RecentActivity[];

    return activities;
}
