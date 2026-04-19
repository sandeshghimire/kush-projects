import { NextRequest } from "next/server";
import {
    handleGetUploads,
    handleCreateUpload,
    handleDeleteUpload,
} from "@/lib/api-helpers";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleGetUploads(slug, "project");
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleCreateUpload(slug, "project", request);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleDeleteUpload(slug, "project", request);
}
