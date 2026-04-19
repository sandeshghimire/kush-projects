import path from "path";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
    code: [".c", ".h", ".hpp", ".cpp", ".ino"],
    doc: [".png", ".jpg", ".jpeg", ".gif", ".pdf"],
};

const MIME_MAP: Record<string, string> = {
    ".c": "text/x-c",
    ".h": "text/x-c",
    ".hpp": "text/x-c++",
    ".cpp": "text/x-c++",
    ".ino": "text/x-arduino",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
};

export function getUploadPath(
    slug: string,
    category: string,
    originalName: string
): string {
    const timestamp = Date.now();
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_");
    const storedName = `${baseName}_${timestamp}${ext}`;
    return path.join("public", "data", "uploads", slug, category, storedName);
}

export function validateUpload(
    category: string,
    originalName: string,
    size: number
): { valid: boolean; error?: string } {
    if (category !== "code" && category !== "doc") {
        return { valid: false, error: "Invalid category. Must be 'code' or 'doc'." };
    }

    if (size > MAX_SIZE_BYTES) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${MAX_SIZE_BYTES / (1024 * 1024)} MB.`,
        };
    }

    if (size === 0) {
        return { valid: false, error: "File is empty." };
    }

    const ext = path.extname(originalName).toLowerCase();
    const allowed = ALLOWED_EXTENSIONS[category];

    if (!allowed || !allowed.includes(ext)) {
        return {
            valid: false,
            error: `Extension '${ext}' not allowed for '${category}'. Allowed: ${allowed?.join(", ")}`,
        };
    }

    return { valid: true };
}

export function getMimeType(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    return MIME_MAP[ext] || "application/octet-stream";
}
