import fs from "fs";
import path from "path";

function contentPath(kind: "lesson" | "project", slug: string): string {
    return path.join(process.cwd(), "public", "data", `${kind}s`, slug, "content.md");
}

export function readContent(kind: "lesson" | "project", slug: string): string {
    const filePath = contentPath(kind, slug);
    if (!fs.existsSync(filePath)) {
        return "";
    }
    return fs.readFileSync(filePath, "utf-8");
}

export function writeContent(
    kind: "lesson" | "project",
    slug: string,
    content: string
): void {
    const filePath = contentPath(kind, slug);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const tmpPath = filePath + ".tmp";
    fs.writeFileSync(tmpPath, content, "utf-8");
    fs.renameSync(tmpPath, filePath);
}
