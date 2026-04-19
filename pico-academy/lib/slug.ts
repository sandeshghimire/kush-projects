export function toSlug(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export function isValidSlug(slug: string): boolean {
    return /^(lesson|project)-([1-9]|1[0-9]|20)$/.test(slug);
}

export function parseSlug(slug: string): { kind: "lesson" | "project"; order: number } | null {
    const match = slug.match(/^(lesson|project)-(\d+)$/);
    if (!match) return null;

    const kind = match[1] as "lesson" | "project";
    const order = parseInt(match[2], 10);

    if (order < 1 || order > 20) return null;

    return { kind, order };
}
