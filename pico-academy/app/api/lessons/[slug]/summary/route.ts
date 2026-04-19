import { NextRequest } from "next/server";
import { handleGetSummary, handlePutSummary } from "@/lib/api-helpers";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleGetSummary(slug, "lesson");
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handlePutSummary(slug, "lesson", request);
}
