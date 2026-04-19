import { NextRequest } from "next/server";
import { handleGetItem, handlePatchItem } from "@/lib/api-helpers";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleGetItem(slug, "lesson");
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handlePatchItem(slug, "lesson", request);
}
