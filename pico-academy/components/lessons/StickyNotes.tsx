"use client";

import { useState } from "react";
import { StickyNote, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Note {
    id: string;
    content: string;
    color: string;
    createdAt: string;
}

const NOTE_COLORS = [
    { name: "yellow", bg: "bg-yellow-100 border-yellow-300" },
    { name: "pink", bg: "bg-pink-100 border-pink-300" },
    { name: "blue", bg: "bg-blue-100 border-blue-300" },
    { name: "green", bg: "bg-green-100 border-green-300" },
    { name: "purple", bg: "bg-purple-100 border-purple-300" },
];

interface StickyNotesProps {
    slug: string;
    kind: "lesson" | "project";
    initialNotes: Note[];
}

export default function StickyNotes({ slug, kind, initialNotes }: StickyNotesProps) {
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const [newContent, setNewContent] = useState("");
    const [selectedColor, setSelectedColor] = useState("yellow");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const addNote = async () => {
        if (!newContent.trim()) return;
        try {
            const res = await fetch(`/api/${kind}s/${slug}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newContent, color: selectedColor }),
            });
            if (!res.ok) throw new Error("Failed to add note");
            const note = await res.json();
            setNotes((prev) => [note, ...prev]);
            setNewContent("");
            setShowForm(false);
        } catch {
            // error silently handled
        }
    };

    const updateNote = async (id: string) => {
        if (!editContent.trim()) return;
        try {
            const res = await fetch(`/api/${kind}s/${slug}/notes`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, content: editContent }),
            });
            if (!res.ok) throw new Error("Failed to update note");
            setNotes((prev) =>
                prev.map((n) => (n.id === id ? { ...n, content: editContent } : n)),
            );
            setEditingId(null);
        } catch {
            // error silently handled
        }
    };

    const deleteNote = async (id: string) => {
        try {
            const res = await fetch(`/api/${kind}s/${slug}/notes?id=${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete note");
            setNotes((prev) => prev.filter((n) => n.id !== id));
        } catch {
            // error silently handled
        }
    };

    const getColorClass = (color: string) =>
        NOTE_COLORS.find((c) => c.name === color)?.bg ?? "bg-yellow-100 border-yellow-300";

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <StickyNote className="h-4 w-4" />
                    Sticky Notes
                </h3>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowForm(!showForm)}
                    className="h-7 text-xs"
                >
                    <Plus className="h-3 w-3" />
                    Add
                </Button>
            </div>

            {showForm && (
                <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
                    <Textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Write a note..."
                        className="min-h-[60px] text-sm"
                    />
                    <div className="flex items-center gap-2">
                        {NOTE_COLORS.map((c) => (
                            <button
                                key={c.name}
                                onClick={() => setSelectedColor(c.name)}
                                className={cn(
                                    "h-5 w-5 rounded-full border-2",
                                    c.bg,
                                    selectedColor === c.name && "ring-2 ring-primary ring-offset-1",
                                )}
                            />
                        ))}
                        <div className="ml-auto flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-6 text-xs">
                                <X className="h-3 w-3" />
                            </Button>
                            <Button size="sm" onClick={addNote} className="h-6 text-xs">
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className={cn(
                            "rounded-lg border p-3 text-sm",
                            getColorClass(note.color),
                        )}
                    >
                        {editingId === note.id ? (
                            <div className="space-y-2">
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[60px] text-sm bg-white/50"
                                />
                                <div className="flex justify-end gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-6 text-xs">
                                        <X className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" onClick={() => updateNote(note.id)} className="h-6 text-xs">
                                        <Check className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="whitespace-pre-wrap">{note.content}</p>
                                <div className="mt-2 flex justify-end gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingId(note.id);
                                            setEditContent(note.content);
                                        }}
                                        className="rounded p-1 hover:bg-black/10"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={() => deleteNote(note.id)}
                                        className="rounded p-1 hover:bg-black/10"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
