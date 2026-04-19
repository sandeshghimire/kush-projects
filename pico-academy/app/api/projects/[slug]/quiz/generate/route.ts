import { NextRequest } from "next/server";
import { handleQuizGenerate } from "@/lib/api-helpers";

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleQuizGenerate(slug, "project");
}
