import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/ollama";

export async function GET() {
    const result = await checkHealth();
    return NextResponse.json(result);
}
