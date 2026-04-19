import { NextRequest } from "next/server";
import {
    handleGetComments,
    handleCreateComment,
    handleDeleteComment,
} from "@/lib/api-helpers";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleGetComments(slug, "project");
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleCreateComment(slug, "project", request);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleDeleteComment(slug, "project", request);
}
