import Link from "next/link";
import { Clock, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const topicColors: Record<string, string> = {
    Setup: "bg-blue-100 text-blue-700",
    GPIO: "bg-green-100 text-green-700",
    Communication: "bg-purple-100 text-purple-700",
    Sensors: "bg-orange-100 text-orange-700",
    Displays: "bg-pink-100 text-pink-700",
    Audio: "bg-rose-100 text-rose-700",
    Wireless: "bg-cyan-100 text-cyan-700",
    Advanced: "bg-red-100 text-red-700",
    PWM: "bg-amber-100 text-amber-700",
    ADC: "bg-teal-100 text-teal-700",
    Timers: "bg-indigo-100 text-indigo-700",
    Interrupts: "bg-violet-100 text-violet-700",
    DMA: "bg-fuchsia-100 text-fuchsia-700",
    PIO: "bg-emerald-100 text-emerald-700",
    Storage: "bg-yellow-100 text-yellow-700",
    Power: "bg-lime-100 text-lime-700",
};

const difficultyColors: Record<string, string> = {
    Beginner: "bg-green-100 text-green-700",
    Intermediate: "bg-yellow-100 text-yellow-700",
    Advanced: "bg-red-100 text-red-700",
};

const statusConfig: Record<string, { label: string; className: string }> = {
    "not-started": { label: "Not Started", className: "bg-gray-100 text-gray-600" },
    "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-700" },
    completed: { label: "Completed", className: "bg-green-100 text-green-700" },
};

interface LessonHeaderProps {
    order: number;
    title: string;
    topic: string;
    difficulty: string;
    estimatedMinutes: number;
    status: string;
    slug: string;
}

export default function LessonHeader({
    order,
    title,
    topic,
    difficulty,
    estimatedMinutes,
    status,
    slug,
}: LessonHeaderProps) {
    const st = statusConfig[status] ?? statusConfig["not-started"];

    return (
        <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">
                            Lesson {String(order).padStart(2, "0")}
                        </span>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", topicColors[topic] ?? "bg-gray-100 text-gray-700")}>
                            {topic}
                        </span>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", difficultyColors[difficulty] ?? "bg-gray-100 text-gray-700")}>
                            {difficulty}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                            <Clock className="h-3 w-3" />
                            {estimatedMinutes} min
                        </span>
                        <Badge variant="secondary" className={cn("text-xs", st.className)}>
                            {st.label}
                        </Badge>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                </div>
                <Link href={`/lessons/${slug}/edit`}>
                    <Button variant="outline" size="sm">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                    </Button>
                </Link>
            </div>
        </div>
    );
}
