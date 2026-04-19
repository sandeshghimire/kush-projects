import { handleListItems } from "@/lib/api-helpers";

export async function GET() {
    return handleListItems("project");
}
