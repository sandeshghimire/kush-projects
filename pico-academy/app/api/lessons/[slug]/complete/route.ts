import { NextRequest } from "next/server";
import { handleComplete } from "@/lib/api-helpers";

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleComplete(slug, "lesson");
}
