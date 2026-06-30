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
        <Card className="h-full">
            <CardContent className="flex flex-col h-full p-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                        Fact of the Day
                    </p>
                </div>
                <p className="text-sm leading-relaxed text-foreground flex-1">
                    {fact}
                </p>
            </CardContent>
        </Card>
    );
}
