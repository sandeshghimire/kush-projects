import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
    const db = getDb();

    const badges = db
        .prepare(
            `SELECT b.id, b.slug, b.item_slug, b.title, b.description, b.icon_path,
                            i.title AS item_title,
              ba.awarded_at
       FROM badges b
             JOIN items i ON i.slug = b.item_slug
       LEFT JOIN badge_awards ba ON ba.badge_id = b.id
             ORDER BY CASE i.kind WHEN 'lesson' THEN 0 ELSE 1 END, i.order_index`
        )
        .all() as {
            id: number;
            slug: string;
            item_slug: string;
            title: string;
            description: string;
            icon_path: string;
            item_title: string;
            awarded_at: number | null;
        }[];

    return NextResponse.json(
        badges.map((b) => ({
            slug: b.slug,
            itemSlug: b.item_slug,
            title: b.title,
            description: b.description,
            iconPath: b.icon_path,
            itemTitle: b.item_title,
            earned: b.awarded_at !== null,
            awardedAt: b.awarded_at ? new Date(b.awarded_at * 1000).toISOString() : null,
        }))
    );
}
