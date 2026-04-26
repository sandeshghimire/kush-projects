import { handleGenerateAllQuizzes, handleQuizGenerationStatus } from "@/lib/api-helpers";

export async function GET() {
    return handleQuizGenerationStatus();
}

export async function POST() {
    return handleGenerateAllQuizzes();
}
