import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
    const db = getDb();
    const learner = db
        .prepare("SELECT display_name, bio, avatar_url, created_at FROM learner WHERE id = 1")
        .get() as { display_name: string; bio: string; avatar_url: string; created_at: number } | undefined;

    if (!learner) {
        return NextResponse.json({ displayName: "Kush", bio: "", avatarUrl: "", createdAt: null });
    }

    return NextResponse.json({
        displayName: learner.display_name,
        bio: learner.bio,
        avatarUrl: learner.avatar_url,
        createdAt: new Date(learner.created_at * 1000).toISOString(),
    });
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const params: (string)[] = [];

    if (typeof body.displayName === "string") {
        const name = body.displayName.trim().slice(0, 50);
        if (name.length > 0) {
            updates.push("display_name = ?");
            params.push(name);
        }
    }
    if (typeof body.bio === "string") {
        updates.push("bio = ?");
        params.push(body.bio.slice(0, 500));
    }
    if (typeof body.avatarUrl === "string") {
        updates.push("avatar_url = ?");
        params.push(body.avatarUrl.slice(0, 500));
    }

    if (updates.length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    db.prepare(`UPDATE learner SET ${updates.join(", ")} WHERE id = 1`).run(...params);

    return NextResponse.json({ ok: true });
}
