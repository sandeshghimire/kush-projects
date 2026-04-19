"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface CompletionEntry {
    completedAt: string;
}

interface TimelineChartProps {
    completions: CompletionEntry[];
}

export default function TimelineChart({ completions }: TimelineChartProps) {
    // Build cumulative data from completions sorted by date
    const sorted = [...completions]
        .filter((c) => c.completedAt)
        .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    if (sorted.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8 text-sm text-text-muted">
                    No completions yet. Start learning to see your progress!
                </CardContent>
            </Card>
        );
    }

    const dataMap = new Map<string, number>();
    let cumulative = 0;

    for (const entry of sorted) {
        const date = new Date(entry.completedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        cumulative += 1;
        dataMap.set(date, cumulative);
    }

    const chartData = Array.from(dataMap.entries()).map(([date, count]) => ({
        date,
        count,
    }));

    return (
        <Card>
            <CardContent className="p-4">
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                    Completion Timeline
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                fontSize: "12px",
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#6366f1" }}
                            activeDot={{ r: 6 }}
                            name="Completions"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
