"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, File, FileCode, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface UploadedFile {
    id: string;
    name: string;
    size: number;
    category: string;
    createdAt: string;
}

interface UploadsPanelProps {
    slug: string;
    kind: "lesson" | "project";
    initialUploads: UploadedFile[];
}

const CODE_EXTENSIONS = [".py", ".c", ".cpp", ".h", ".rs", ".zig", ".uf2", ".ino"];
const DOC_EXTENSIONS = [".pdf", ".md", ".txt", ".png", ".jpg", ".jpeg", ".gif", ".svg"];

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadsPanel({ slug, kind, initialUploads }: UploadsPanelProps) {
    const [uploads, setUploads] = useState<UploadedFile[]>(initialUploads);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const codeFiles = uploads.filter((f) => f.category === "code");
    const docFiles = uploads.filter((f) => f.category === "document");

    const uploadFiles = useCallback(
        async (files: FileList | File[]) => {
            setUploading(true);
            try {
                for (const file of Array.from(files)) {
                    const formData = new FormData();
                    formData.append("file", file);
                    const res = await fetch(`/api/${kind}s/${slug}/uploads`, {
                        method: "POST",
                        body: formData,
                    });
                    if (!res.ok) continue;
                    const uploaded = await res.json();
                    setUploads((prev) => [...prev, uploaded]);
                }
            } catch {
                // error silently handled
            } finally {
                setUploading(false);
            }
        },
        [slug, kind],
    );

    const deleteFile = async (id: string) => {
        try {
            const res = await fetch(`/api/${kind}s/${slug}/uploads`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error("Failed to delete");
            setUploads((prev) => prev.filter((f) => f.id !== id));
        } catch {
            // error silently handled
        }
    };

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length > 0) {
                uploadFiles(e.dataTransfer.files);
            }
        },
        [uploadFiles],
    );

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        } catch {
            return dateStr;
        }
    };

    const FileList = ({ files }: { files: UploadedFile[] }) => (
        <div className="space-y-1">
            {files.length === 0 && (
                <p className="py-4 text-center text-sm text-text-muted">No files uploaded yet</p>
            )}
            {files.map((file) => (
                <div
                    key={file.id}
                    className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {file.category === "code" ? (
                            <FileCode className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                            <File className="h-4 w-4 shrink-0 text-text-muted" />
                        )}
                        <span className="truncate text-sm font-medium">{file.name}</span>
                        <span className="shrink-0 text-xs text-text-muted">{formatSize(file.size)}</span>
                        <span className="shrink-0 text-xs text-text-muted">{formatDate(file.createdAt)}</span>
                    </div>
                    <button
                        onClick={() => deleteFile(file.id)}
                        className="ml-2 rounded p-1 text-text-muted hover:bg-surface-muted hover:text-foreground"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );

    return (
        <div id="uploads" className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Upload className="h-4 w-4" />
                Uploads
            </h3>

            <div
                className={cn(
                    "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                    dragging ? "border-primary bg-primary/5" : "border-border",
                )}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
            >
                <Upload className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                <p className="mb-1 text-sm text-foreground">
                    Drag & drop files here or{" "}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="font-medium text-primary hover:underline"
                    >
                        browse
                    </button>
                </p>
                <p className="text-xs text-text-muted">
                    Code: {CODE_EXTENSIONS.join(", ")} | Docs: {DOC_EXTENSIONS.join(", ")}
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) uploadFiles(e.target.files);
                    }}
                />
                {uploading && (
                    <p className="mt-2 text-sm text-primary">Uploading...</p>
                )}
            </div>

            <Tabs defaultValue="code">
                <TabsList>
                    <TabsTrigger value="code">
                        <FileCode className="mr-1 h-3.5 w-3.5" />
                        Code ({codeFiles.length})
                    </TabsTrigger>
                    <TabsTrigger value="documents">
                        <File className="mr-1 h-3.5 w-3.5" />
                        Documents ({docFiles.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="code">
                    <FileList files={codeFiles} />
                </TabsContent>
                <TabsContent value="documents">
                    <FileList files={docFiles} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
