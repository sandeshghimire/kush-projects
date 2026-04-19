"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { funFacts } from "@/lib/curriculum";

function getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function FactOfTheDay() {
    const fact = funFacts[getDayOfYear() % funFacts.length];

    return (
        <Card className="rounded-[20px] shadow-[var(--shadow-card)]">
            <CardContent className="flex items-start gap-3 p-6">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Fact of the Day
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                        {fact}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
