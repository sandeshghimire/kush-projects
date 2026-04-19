"use client";

import { useEffect, useState } from "react";
import BadgeTile, { type BadgeData } from "./BadgeTile";
import EmptyState from "@/components/common/EmptyState";
import { Award } from "lucide-react";

export default function BadgeGrid() {
    const [badges, setBadges] = useState<BadgeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/badges")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch badges");
                return res.json();
            })
            .then((data) => setBadges(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const earned = badges.filter((b) => b.earned).length;

    if (loading) {
        return (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-40 animate-pulse rounded-lg bg-surface-muted"
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                icon={Award}
                title="Error loading badges"
                description={error}
            />
        );
    }

    if (badges.length === 0) {
        return (
            <EmptyState
                icon={Award}
                title="No badges yet"
                description="Badges will appear here as they become available."
            />
        );
    }

    return (
        <div>
            <p className="mb-4 text-sm font-medium text-text-muted">
                {earned} / {badges.length} earned
            </p>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {badges.map((badge) => (
                    <BadgeTile key={badge.slug} badge={badge} />
                ))}
            </div>
        </div>
    );
}
