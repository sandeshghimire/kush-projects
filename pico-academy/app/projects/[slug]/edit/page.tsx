"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import MarkdownEditor from "@/components/lessons/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface ProjectEditData {
    slug: string;
    title: string;
    description: string;
    topic: string;
    difficulty: string;
    estimatedMinutes: number;
    body: string;
}

const TOPICS = [
    "Setup", "GPIO", "Communication", "Sensors", "Displays", "Audio",
    "Wireless", "Advanced", "PWM", "ADC", "Timers", "Interrupts",
    "DMA", "PIO", "Storage", "Power",
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function ProjectEditPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [estimatedMinutes, setEstimatedMinutes] = useState(30);
    const [body, setBody] = useState("");

    useEffect(() => {
        fetch(`/api/projects/${slug}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load project");
                return res.json();
            })
            .then((data: ProjectEditData) => {
                setTitle(data.title);
                setDescription(data.description);
                setTopic(data.topic);
                setDifficulty(data.difficulty);
                setEstimatedMinutes(data.estimatedMinutes);
                setBody(data.body ?? "");
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [slug]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/projects/${slug}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    topic,
                    difficulty,
                    estimatedMinutes,
                    body,
                }),
            });
            if (!res.ok) throw new Error("Failed to save");
            router.push(`/projects/${slug}`);
        } catch {
            // error silently handled
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <PageContainer>
                <div className="space-y-4">
                    <div className="h-8 w-48 animate-pulse rounded bg-surface-muted" />
                    <div className="h-10 animate-pulse rounded bg-surface-muted" />
                    <div className="h-96 animate-pulse rounded bg-surface-muted" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Edit Project</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/projects/${slug}`)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                        Title
                    </label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                        Description
                    </label>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                            Topic
                        </label>
                        <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
                            {TOPICS.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                            Difficulty
                        </label>
                        <Select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                        >
                            {DIFFICULTIES.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                            Estimated Minutes
                        </label>
                        <Input
                            type="number"
                            value={estimatedMinutes}
                            onChange={(e) =>
                                setEstimatedMinutes(parseInt(e.target.value) || 0)
                            }
                            min={1}
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                        Content
                    </label>
                    <MarkdownEditor value={body} onChange={setBody} />
                </div>
            </div>
        </PageContainer>
    );
}
