"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Package, BookOpen, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PageContainer from "@/components/layout/PageContainer";

interface PartItem {
    name: string;
    price: string | null;
}

interface ItemParts {
    slug: string;
    title: string;
    kind: "lesson" | "project";
    order: number;
    parts: PartItem[];
    total: string | null;
}

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function PartsPage() {
    const [data, setData] = useState<ItemParts[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch("/api/parts")
            .then((r) => {
                if (!r.ok) throw new Error();
                return r.json();
            })
            .then(setData)
            .catch(() => setError(true));
    }, []);

    if (error) {
        return (
            <PageContainer>
                <p className="text-text-muted">Error loading parts list.</p>
            </PageContainer>
        );
    }

    if (!data) {
        return (
            <PageContainer>
                <div className="space-y-4">
                    <div className="h-8 w-48 animate-pulse rounded bg-surface-muted" />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-muted" />
                    ))}
                </div>
            </PageContainer>
        );
    }

    const lessons = data.filter((d) => d.kind === "lesson");
    const projects = data.filter((d) => d.kind === "project");

    // Collect all unique parts across everything
    const allPartsMap = new Map<string, { count: number; prices: Set<string> }>();
    for (const item of data) {
        for (const part of item.parts) {
            // Normalize: strip leading quantity like "1× " or "2x "
            const normalized = part.name.replace(/^\d+[×x]\s*/i, "").toLowerCase();
            const existing = allPartsMap.get(normalized);
            if (existing) {
                existing.count++;
                if (part.price) existing.prices.add(part.price);
            } else {
                allPartsMap.set(normalized, {
                    count: 1,
                    prices: new Set(part.price ? [part.price] : []),
                });
            }
        }
    }

    return (
        <PageContainer>
            <div className="mb-8">
                <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
                    <Package className="h-7 w-7 text-primary" />
                    Parts List
                </h1>
                <p className="mt-1 text-text-muted">
                    All the components needed for each lesson and project
                </p>
            </div>

            {/* Lessons section */}
            <Section
                title="Lesson Parts"
                icon={<BookOpen className="h-5 w-5" />}
                items={lessons}
                colorClass="text-blue-600 bg-blue-50"
            />

            {/* Projects section */}
            <Section
                title="Project Parts"
                icon={<Wrench className="h-5 w-5" />}
                items={projects}
                colorClass="text-emerald-600 bg-emerald-50"
            />
        </PageContainer>
    );
}

function Section({
    title,
    icon,
    items,
    colorClass,
}: {
    title: string;
    icon: React.ReactNode;
    items: ItemParts[];
    colorClass: string;
}) {
    if (items.length === 0) return null;

    return (
        <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
                {icon}
                {title}
            </h2>
            <div className="space-y-4">
                {items.map((item) => (
                    <motion.div
                        key={item.slug}
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                    >
                        <Card className="rounded-xl shadow-[var(--shadow-card)]">
                            <CardContent className="p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-foreground">
                                        <span className={`mr-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                                            {item.kind === "lesson" ? `L${item.order}` : `P${item.order}`}
                                        </span>
                                        {item.title}
                                    </h3>
                                    {item.total && (
                                        <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                            Total: {item.total}
                                        </span>
                                    )}
                                </div>
                                <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                    {item.parts.map((part, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center justify-between rounded-md bg-surface-muted/50 px-3 py-1.5 text-sm"
                                        >
                                            <span className="text-foreground">{part.name}</span>
                                            {part.price && (
                                                <span className="ml-2 whitespace-nowrap text-text-muted">
                                                    {part.price}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
