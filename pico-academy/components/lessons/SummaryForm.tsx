"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface SavedSummary {
    text: string;
    savedAt: string;
}

interface SummaryFormProps {
    slug: string;
    kind: "lesson" | "project";
    initialSummary: string;
}

export default function SummaryForm({ slug, kind, initialSummary }: SummaryFormProps) {
    const [summary, setSummary] = useState("");
    const [saving, setSaving] = useState(false);
    const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>(
        initialSummary ? [{ text: initialSummary, savedAt: new Date().toISOString() }] : []
    );

    const isValid = summary.trim().length >= 40;

    const handleSave = async () => {
        if (!isValid) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/${kind}s/${slug}/summary`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ summary }),
            });
            if (!res.ok) throw new Error("Failed to save summary");
            setSavedSummaries((prev) => [
                { text: summary, savedAt: new Date().toISOString() },
                ...prev,
            ]);
            setSummary("");
        } catch {
            // error silently handled
        } finally {
            setSaving(false);
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
            return "";
        }
    };

    return (
        <div id="summary" className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4" />
                Summary Notes
            </h3>

            <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Write a summary of what you learned (min 40 characters)..."
                    className="min-h-[100px] text-sm"
                />
                <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                        {summary.trim().length} / 40 min characters
                    </span>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!isValid || saving}
                    >
                        {saving ? "Saving..." : "Save Summary"}
                    </Button>
                </div>
            </div>

            {savedSummaries.length > 0 && (
                <div className="space-y-2">
                    {savedSummaries.map((s, i) => (
                        <div
                            key={i}
                            className="rounded-lg border border-border bg-surface p-3"
                        >
                            <p className="whitespace-pre-wrap text-sm text-foreground">
                                {s.text}
                            </p>
                            <p className="mt-2 text-xs text-text-muted">
                                {formatDate(s.savedAt)}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
