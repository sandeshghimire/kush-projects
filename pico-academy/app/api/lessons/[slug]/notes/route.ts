import { NextRequest } from "next/server";
import {
    handleGetNotes,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
} from "@/lib/api-helpers";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleGetNotes(slug, "lesson");
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleCreateNote(slug, "lesson", request);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleUpdateNote(slug, "lesson", request);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleDeleteNote(slug, "lesson", request);
}
