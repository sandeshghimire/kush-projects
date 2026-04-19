import { getDb } from "@/lib/db";
import { readContent, writeContent } from "@/lib/content";
import { readQuizPool, writeQuizPool, sampleQuestions, gradeQuiz } from "@/lib/quiz";
import { validateUpload, getUploadPath, getMimeType } from "@/lib/uploads";
import { generateQuizPool, getModel } from "@/lib/ollama";
import { getOverallProgress, getItemsWithStatus, computeUnlockState } from "@/lib/progress";
import { getRank } from "@/lib/rank";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Kind = "lesson" | "project";
type Status = "not_started" | "in_progress" | "completed";

/* ── Helpers ─────────────────────────────────────────────── */

function toIso(epoch: number | null): string | null {
    if (epoch === null || epoch === undefined) return null;
    return new Date(epoch * 1000).toISOString();
}

function itemBySlug(slug: string, kind: Kind) {
    const db = getDb();
    return db
        .prepare("SELECT * FROM items WHERE slug = ? AND kind = ?")
        .get(slug, kind) as {
            id: number;
            kind: Kind;
            slug: string;
            order_index: number;
            title: string;
            description: string;
            topic: string;
            difficulty: string;
            estimated_minutes: number;
        } | undefined;
}

function getUnlockState(kind: Kind, orderIndex: number) {
    const db = getDb();
    const rows = db
        .prepare(
            `SELECT i.id, i.kind, i.order_index,
              COALESCE(ip.status, 'not_started') AS status
       FROM items i
       LEFT JOIN item_progress ip ON ip.item_id = i.id`
        )
        .all() as { id: number; kind: Kind; order_index: number; status: Status }[];

    const map = new Map<number, { status: Status; kind: Kind; orderIndex: number }>();
    for (const r of rows) {
        map.set(r.id, { status: r.status, kind: r.kind, orderIndex: r.order_index });
    }
    return computeUnlockState(kind, orderIndex, map);
}

function ensureProgress(itemId: number) {
    const db = getDb();
    db.prepare(
        "INSERT OR IGNORE INTO item_progress (item_id) VALUES (?)"
    ).run(itemId);
}

/* ── List items ──────────────────────────────────────────── */

export function handleListItems(kind: Kind) {
    const items = getItemsWithStatus(kind);
    return NextResponse.json(
        items.map((i) => ({
            slug: i.slug,
            order: i.orderIndex,
            title: i.title,
            description: i.description,
            topic: i.topic,
            difficulty: i.difficulty,
            estimatedMinutes: i.estimatedMinutes,
            status: i.status,
            locked: i.locked,
            lockReason: i.lockReason,
            bestQuizScore: i.bestQuizScore,
            completedAt: toIso(i.completedAt),
        }))
    );
}

/* ── Single item detail ──────────────────────────────────── */

export function handleGetItem(slug: string, kind: Kind) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const unlock = getUnlockState(kind, item.order_index);

    const db = getDb();
    ensureProgress(item.id);

    const progress = db
        .prepare("SELECT * FROM item_progress WHERE item_id = ?")
        .get(item.id) as {
            status: Status;
            summary: string | null;
            best_quiz_score: number | null;
            completed_at: number | null;
        };

    const content = readContent(kind, slug);

    const notes = db
        .prepare("SELECT * FROM notes WHERE item_id = ? ORDER BY created_at DESC")
        .all(item.id) as { id: number; content: string; color: string; created_at: number; updated_at: number }[];

    const comments = db
        .prepare("SELECT * FROM comments WHERE item_id = ? ORDER BY created_at ASC")
        .all(item.id) as { id: number; author_name: string; content: string; created_at: number }[];

    const uploads = db
        .prepare("SELECT * FROM uploads WHERE item_id = ? ORDER BY created_at DESC")
        .all(item.id) as { id: number; category: string; original_name: string; stored_path: string; mime_type: string; size_bytes: number; created_at: number }[];

    const quizAttempts = db
        .prepare("SELECT * FROM quiz_attempts WHERE item_id = ? ORDER BY created_at DESC")
        .all(item.id) as { id: number; score: number; passed: number; details_json: string; created_at: number }[];

    const pool = readQuizPool(slug);

    return NextResponse.json({
        slug: item.slug,
        order: item.order_index,
        title: item.title,
        description: item.description,
        topic: item.topic,
        difficulty: item.difficulty,
        estimatedMinutes: item.estimated_minutes,
        status: progress.status,
        summary: progress.summary,
        bestQuizScore: progress.best_quiz_score,
        completedAt: toIso(progress.completed_at),
        content,
        notes: notes.map((n) => ({
            id: n.id,
            content: n.content,
            color: n.color,
            createdAt: toIso(n.created_at),
            updatedAt: toIso(n.updated_at),
        })),
        comments: comments.map((c) => ({
            id: c.id,
            authorName: c.author_name,
            content: c.content,
            createdAt: toIso(c.created_at),
        })),
        uploads: uploads.map((u) => ({
            id: u.id,
            category: u.category,
            originalName: u.original_name,
            storedPath: u.stored_path,
            mimeType: u.mime_type,
            sizeBytes: u.size_bytes,
            createdAt: toIso(u.created_at),
        })),
        quizAttempts: quizAttempts.map((q) => ({
            id: q.id,
            score: q.score,
            passed: !!q.passed,
            createdAt: toIso(q.created_at),
        })),
        quizPoolSize: pool?.questions.length ?? 0,
        locked: unlock.locked,
        lockReason: unlock.lockReason,
    });
}

export async function handlePatchItem(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const db = getDb();

    const updatableFields: Record<string, string> = {
        title: "title",
        description: "description",
        topic: "topic",
        difficulty: "difficulty",
        estimatedMinutes: "estimated_minutes",
    };

    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [jsonKey, dbCol] of Object.entries(updatableFields)) {
        if (body[jsonKey] !== undefined) {
            if (dbCol === "difficulty" && !["Beginner", "Intermediate", "Advanced"].includes(body[jsonKey])) {
                return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
            }
            sets.push(`${dbCol} = ?`);
            values.push(body[jsonKey]);
        }
    }

    if (sets.length > 0) {
        values.push(item.id);
        db.prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    }

    if (typeof body.content === "string") {
        writeContent(kind, slug, body.content);
    }

    return NextResponse.json({ ok: true });
}

/* ── Notes ───────────────────────────────────────────────── */

export function handleGetNotes(slug: string, kind: Kind) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const db = getDb();
    const notes = db
        .prepare("SELECT * FROM notes WHERE item_id = ? ORDER BY created_at DESC")
        .all(item.id) as { id: number; content: string; color: string; created_at: number; updated_at: number }[];

    return NextResponse.json(
        notes.map((n) => ({
            id: n.id,
            content: n.content,
            color: n.color,
            createdAt: toIso(n.created_at),
            updatedAt: toIso(n.updated_at),
        }))
    );
}

export async function handleCreateNote(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const noteUnlock = getUnlockState(kind, item.order_index);
    if (noteUnlock.locked) {
        return NextResponse.json({ error: noteUnlock.lockReason ?? "Item is locked" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.content || typeof body.content !== "string") {
        return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const color = body.color ?? "yellow";
    const db = getDb();
    const result = db
        .prepare("INSERT INTO notes (item_id, content, color) VALUES (?, ?, ?)")
        .run(item.id, body.content, color);

    return NextResponse.json(
        { id: result.lastInsertRowid, content: body.content, color },
        { status: 201 }
    );
}

export async function handleUpdateNote(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    if (!body.id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const db = getDb();
    const note = db
        .prepare("SELECT * FROM notes WHERE id = ? AND item_id = ?")
        .get(body.id, item.id);
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const sets: string[] = ["updated_at = unixepoch()"];
    const values: unknown[] = [];

    if (body.content !== undefined) {
        sets.push("content = ?");
        values.push(body.content);
    }
    if (body.color !== undefined) {
        sets.push("color = ?");
        values.push(body.color);
    }

    values.push(body.id, item.id);
    db.prepare(
        `UPDATE notes SET ${sets.join(", ")} WHERE id = ? AND item_id = ?`
    ).run(...values);

    return NextResponse.json({ ok: true });
}

export function handleDeleteNote(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

    const db = getDb();
    const result = db
        .prepare("DELETE FROM notes WHERE id = ? AND item_id = ?")
        .run(Number(id), item.id);

    if (result.changes === 0) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}

/* ── Comments ────────────────────────────────────────────── */

export function handleGetComments(slug: string, kind: Kind) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const db = getDb();
    const comments = db
        .prepare("SELECT * FROM comments WHERE item_id = ? ORDER BY created_at ASC")
        .all(item.id) as { id: number; author_name: string; content: string; created_at: number }[];

    return NextResponse.json(
        comments.map((c) => ({
            id: c.id,
            authorName: c.author_name,
            content: c.content,
            createdAt: toIso(c.created_at),
        }))
    );
}

export async function handleCreateComment(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const commentUnlock = getUnlockState(kind, item.order_index);
    if (commentUnlock.locked) {
        return NextResponse.json({ error: commentUnlock.lockReason ?? "Item is locked" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.content || typeof body.content !== "string") {
        return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const authorName = body.authorName ?? "Kush";
    const db = getDb();
    const result = db
        .prepare("INSERT INTO comments (item_id, author_name, content) VALUES (?, ?, ?)")
        .run(item.id, authorName, body.content);

    return NextResponse.json(
        { id: result.lastInsertRowid, authorName, content: body.content },
        { status: 201 }
    );
}

export function handleDeleteComment(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

    const db = getDb();
    const result = db
        .prepare("DELETE FROM comments WHERE id = ? AND item_id = ?")
        .run(Number(id), item.id);

    if (result.changes === 0) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}

/* ── Uploads ─────────────────────────────────────────────── */

export function handleGetUploads(slug: string, kind: Kind) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const db = getDb();
    const uploads = db
        .prepare("SELECT * FROM uploads WHERE item_id = ? ORDER BY created_at DESC")
        .all(item.id) as { id: number; category: string; original_name: string; stored_path: string; mime_type: string; size_bytes: number; created_at: number }[];

    return NextResponse.json(
        uploads.map((u) => ({
            id: u.id,
            category: u.category,
            originalName: u.original_name,
            storedPath: u.stored_path,
            mimeType: u.mime_type,
            sizeBytes: u.size_bytes,
            createdAt: toIso(u.created_at),
        }))
    );
}

export async function handleCreateUpload(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const uploadUnlock = getUnlockState(kind, item.order_index);
    if (uploadUnlock.locked) {
        return NextResponse.json({ error: uploadUnlock.lockReason ?? "Item is locked" }, { status: 403 });
    }

    const formData = await request.formData();
    const category = formData.get("category") as string | null;
    const file = formData.get("file") as File | null;

    if (!category || !file) {
        return NextResponse.json(
            { error: "category and file are required" },
            { status: 400 }
        );
    }

    const validation = validateUpload(category, file.name, file.size);
    if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const storedPath = getUploadPath(slug, category, file.name);
    const fullPath = path.join(process.cwd(), storedPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(fullPath, buffer);

    const mimeType = getMimeType(file.name);
    const db = getDb();
    const result = db
        .prepare(
            `INSERT INTO uploads (item_id, category, original_name, stored_path, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(item.id, category, file.name, storedPath, mimeType, file.size);

    return NextResponse.json(
        {
            id: result.lastInsertRowid,
            category,
            originalName: file.name,
            storedPath,
            mimeType,
            sizeBytes: file.size,
        },
        { status: 201 }
    );
}

export function handleDeleteUpload(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

    const db = getDb();
    const upload = db
        .prepare("SELECT * FROM uploads WHERE id = ? AND item_id = ?")
        .get(Number(id), item.id) as { stored_path: string } | undefined;

    if (!upload) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    // Delete file from disk
    const fullPath = path.join(process.cwd(), upload.stored_path);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }

    db.prepare("DELETE FROM uploads WHERE id = ? AND item_id = ?").run(
        Number(id),
        item.id
    );

    return NextResponse.json({ ok: true });
}

/* ── Summary ─────────────────────────────────────────────── */

export function handleGetSummary(slug: string, kind: Kind) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const db = getDb();
    ensureProgress(item.id);

    const row = db
        .prepare("SELECT summary FROM item_progress WHERE item_id = ?")
        .get(item.id) as { summary: string | null };

    return NextResponse.json({ summary: row.summary });
}

export async function handlePutSummary(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const summaryUnlock = getUnlockState(kind, item.order_index);
    if (summaryUnlock.locked) {
        return NextResponse.json({ error: summaryUnlock.lockReason ?? "Item is locked" }, { status: 403 });
    }

    const body = await request.json();
    if (typeof body.summary !== "string") {
        return NextResponse.json({ error: "summary is required" }, { status: 400 });
    }
    if (body.summary.length < 40) {
        return NextResponse.json(
            { error: "Summary must be at least 40 characters" },
            { status: 400 }
        );
    }

    const db = getDb();
    ensureProgress(item.id);

    db.prepare(
        `UPDATE item_progress
     SET summary = ?,
         status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END,
         updated_at = unixepoch()
     WHERE item_id = ?`
    ).run(body.summary, item.id);

    return NextResponse.json({ ok: true });
}

/* ── Quiz ────────────────────────────────────────────────── */

export function handleGetQuiz(slug: string) {
    const pool = readQuizPool(slug);
    if (!pool) {
        return NextResponse.json(
            { error: "No quiz pool found. Generate one first." },
            { status: 404 }
        );
    }

    const sampled = sampleQuestions(pool, 10);
    return NextResponse.json({
        items: sampled.map((q) => {
            const base: Record<string, unknown> = {
                id: q.id,
                type: q.type,
                prompt: q.prompt,
            };
            if (q.type === "mc") {
                base.choices = q.choices;
            }
            return base;
        }),
    });
}

export async function handlePostQuiz(
    slug: string,
    kind: Kind,
    request: NextRequest
) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const quizUnlock = getUnlockState(kind, item.order_index);
    if (quizUnlock.locked) {
        return NextResponse.json({ error: quizUnlock.lockReason ?? "Item is locked" }, { status: 403 });
    }

    const pool = readQuizPool(slug);
    if (!pool) {
        return NextResponse.json(
            { error: "No quiz pool found" },
            { status: 404 }
        );
    }

    const body = await request.json();
    if (!Array.isArray(body.answers)) {
        return NextResponse.json({ error: "answers array is required" }, { status: 400 });
    }

    const answers = body.answers.map((a: { id: string; selected: number | boolean }) => ({
        id: a.id,
        selected: a.selected,
    }));

    const result = gradeQuiz(pool, answers);

    const db = getDb();
    ensureProgress(item.id);

    db.prepare(
        `INSERT INTO quiz_attempts (item_id, score, passed, details_json)
     VALUES (?, ?, ?, ?)`
    ).run(item.id, result.score, result.passed ? 1 : 0, JSON.stringify(result.review));

    // Update best score
    const current = db
        .prepare("SELECT best_quiz_score FROM item_progress WHERE item_id = ?")
        .get(item.id) as { best_quiz_score: number | null };

    if (current.best_quiz_score === null || result.score > current.best_quiz_score) {
        db.prepare(
            `UPDATE item_progress
       SET best_quiz_score = ?, last_quiz_score = ?, updated_at = unixepoch()
       WHERE item_id = ?`
        ).run(result.score, result.score, item.id);
    } else {
        db.prepare(
            `UPDATE item_progress SET last_quiz_score = ?, updated_at = unixepoch() WHERE item_id = ?`
        ).run(result.score, item.id);
    }

    // Transition to in_progress if not_started
    db.prepare(
        `UPDATE item_progress
     SET status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END,
         updated_at = unixepoch()
     WHERE item_id = ?`
    ).run(item.id);

    return NextResponse.json({
        score: result.score,
        passed: result.passed,
        review: result.review,
    });
}

/* ── Quiz Generate ───────────────────────────────────────── */

export async function handleQuizGenerate(slug: string, kind: Kind) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const content = readContent(kind, slug);

    try {
        const questions = await generateQuizPool(
            item.title,
            item.topic,
            item.difficulty,
            content
        );

        writeQuizPool(slug, {
            slug,
            generatedAt: new Date().toISOString(),
            model: getModel(),
            questions,
        });

        return NextResponse.json({ ok: true, questionCount: questions.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate quiz";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}

/* ── Complete ────────────────────────────────────────────── */

export function handleComplete(slug: string, kind: Kind) {
    const item = itemBySlug(slug, kind);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const unlock = getUnlockState(kind, item.order_index);
    if (unlock.locked) {
        return NextResponse.json(
            { error: unlock.lockReason ?? "Item is locked" },
            { status: 403 }
        );
    }

    const db = getDb();
    ensureProgress(item.id);

    // Gate 1: at least one code upload
    const codeUpload = db
        .prepare(
            "SELECT id FROM uploads WHERE item_id = ? AND category = 'code' LIMIT 1"
        )
        .get(item.id);
    if (!codeUpload) {
        return NextResponse.json(
            { error: "Upload at least one code file before completing" },
            { status: 400 }
        );
    }

    // Gate 2: summary non-empty and >= 40 chars
    const progress = db
        .prepare("SELECT summary FROM item_progress WHERE item_id = ?")
        .get(item.id) as { summary: string | null };
    if (!progress.summary || progress.summary.length < 40) {
        return NextResponse.json(
            { error: "Write a summary of at least 40 characters before completing" },
            { status: 400 }
        );
    }

    // Gate 3: quiz attempt with passed=1
    const passedQuiz = db
        .prepare(
            "SELECT id FROM quiz_attempts WHERE item_id = ? AND passed = 1 LIMIT 1"
        )
        .get(item.id);
    if (!passedQuiz) {
        return NextResponse.json(
            { error: "Pass a quiz before completing" },
            { status: 400 }
        );
    }

    // Mark completed
    db.prepare(
        `UPDATE item_progress
     SET status = 'completed', completed_at = unixepoch(), updated_at = unixepoch()
     WHERE item_id = ?`
    ).run(item.id);

    // Award badge
    const badge = db
        .prepare("SELECT * FROM badges WHERE item_slug = ?")
        .get(slug) as { id: number; slug: string; title: string; description: string; icon_path: string } | undefined;

    let badgeInfo = null;
    if (badge) {
        db.prepare(
            "INSERT OR IGNORE INTO badge_awards (badge_id) VALUES (?)"
        ).run(badge.id);
        badgeInfo = {
            slug: badge.slug,
            title: badge.title,
            description: badge.description,
            iconPath: badge.icon_path,
        };
    }

    // Compute new rank
    const totalCompleted = (
        db
            .prepare(
                "SELECT COUNT(*) AS c FROM item_progress WHERE status = 'completed'"
            )
            .get() as { c: number }
    ).c;

    const rank = getRank(totalCompleted);

    return NextResponse.json({ ok: true, badge: badgeInfo, rank });
}
