"use client";

import { useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
    id: string;
    name: string;
    content: string;
    createdAt: string;
}

interface CommentsThreadProps {
    slug: string;
    kind: "lesson" | "project";
    initialComments: Comment[];
}

export default function CommentsThread({ slug, kind, initialComments }: CommentsThreadProps) {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [name, setName] = useState("Kush");
    const [content, setContent] = useState("");
    const [posting, setPosting] = useState(false);

    const postComment = async () => {
        if (!content.trim()) return;
        setPosting(true);
        try {
            const res = await fetch(`/api/${kind}s/${slug}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name || "Kush", content }),
            });
            if (!res.ok) throw new Error("Failed to post comment");
            const comment = await res.json();
            setComments((prev) => [comment, ...prev]);
            setContent("");
        } catch {
            // error silently handled
        } finally {
            setPosting(false);
        }
    };

    const deleteComment = async (id: string) => {
        try {
            const res = await fetch(`/api/${kind}s/${slug}/comments`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error("Failed to delete comment");
            setComments((prev) => prev.filter((c) => c.id !== id));
        } catch {
            // error silently handled
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="h-4 w-4" />
                Comments
            </h3>

            <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="text-sm"
                />
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write a comment..."
                    className="min-h-[60px] text-sm"
                />
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={postComment}
                        disabled={!content.trim() || posting}
                        className="h-7 text-xs"
                    >
                        {posting ? "Posting..." : "Post"}
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {comments.map((comment) => (
                    <div
                        key={comment.id}
                        className="rounded-lg border border-border bg-surface p-3"
                    >
                        <div className="mb-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                    {comment.name}
                                </span>
                                <span className="text-xs text-text-muted">
                                    {formatDate(comment.createdAt)}
                                </span>
                            </div>
                            <button
                                onClick={() => deleteComment(comment.id)}
                                className="rounded p-1 text-text-muted hover:bg-surface-muted hover:text-foreground"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                            {comment.content}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
