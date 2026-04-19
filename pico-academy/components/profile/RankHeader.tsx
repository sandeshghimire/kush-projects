"use client";

import { getRank } from "@/lib/rank";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankHeaderProps {
    completedCount: number;
}

const rankColors: Record<string, string> = {
    Cadet: "from-gray-500 to-gray-600",
    "Spark Scout": "from-yellow-400 to-yellow-600",
    "Circuit Explorer": "from-green-400 to-green-600",
    "Signal Seeker": "from-blue-400 to-blue-600",
    "Junior Engineer": "from-indigo-400 to-indigo-600",
    Engineer: "from-violet-500 to-violet-700",
    "Robotics Specialist": "from-purple-500 to-purple-700",
    "Senior Engineer": "from-pink-500 to-pink-700",
    "Master Roboticist": "from-orange-500 to-orange-700",
    "Grand Roboticist": "from-amber-400 to-red-600",
};

export default function RankHeader({ completedCount }: RankHeaderProps) {
    const rank = getRank(completedCount);
    const gradient = rankColors[rank.title] ?? "from-gray-500 to-gray-600";

    const progressValue = rank.itemsToNext !== null
        ? completedCount - rank.min
        : rank.max - rank.min;
    const progressMax = rank.itemsToNext !== null
        ? (rank.nextTitle ? rank.max - rank.min + 1 : 1)
        : rank.max - rank.min;

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl bg-gradient-to-r p-6 text-white shadow-lg",
                gradient,
            )}
        >
            <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur-sm">
                    <Trophy className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/80">Current Rank</p>
                    <h2 className="text-2xl font-bold">{rank.title}</h2>
                    {rank.nextTitle && rank.itemsToNext !== null && (
                        <div className="mt-2">
                            <div className="mb-1 flex items-center justify-between text-xs text-white/80">
                                <span>Next: {rank.nextTitle}</span>
                                <span>{rank.itemsToNext} more to go</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">
                                <div
                                    className="h-full rounded-full bg-white/80 transition-all duration-300"
                                    style={{
                                        width: `${progressMax > 0 ? (progressValue / progressMax) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    {!rank.nextTitle && (
                        <p className="mt-1 text-sm text-white/80">Maximum rank achieved!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
