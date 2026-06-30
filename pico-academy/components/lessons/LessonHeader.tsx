import Link from "next/link";
import { Clock, Pencil, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const topicColors: Record<string, { bg: string; text: string }> = {
    Setup:         { bg: "bg-blue-50",    text: "text-blue-600" },
    GPIO:          { bg: "bg-emerald-50", text: "text-emerald-600" },
    Communication: { bg: "bg-violet-50",  text: "text-violet-600" },
    Sensors:       { bg: "bg-orange-50",  text: "text-orange-600" },
    Displays:      { bg: "bg-pink-50",    text: "text-pink-600" },
    Audio:         { bg: "bg-rose-50",    text: "text-rose-600" },
    Wireless:      { bg: "bg-cyan-50",    text: "text-cyan-600" },
    Advanced:      { bg: "bg-red-50",     text: "text-red-600" },
    PWM:           { bg: "bg-amber-50",   text: "text-amber-600" },
    ADC:           { bg: "bg-teal-50",    text: "text-teal-600" },
    Timers:        { bg: "bg-indigo-50",  text: "text-indigo-600" },
    Interrupts:    { bg: "bg-violet-50",  text: "text-violet-600" },
    DMA:           { bg: "bg-fuchsia-50", text: "text-fuchsia-600" },
    PIO:           { bg: "bg-emerald-50", text: "text-emerald-600" },
    Storage:       { bg: "bg-yellow-50",  text: "text-yellow-600" },
    Power:         { bg: "bg-lime-50",    text: "text-lime-600" },
    Systems:       { bg: "bg-indigo-50",  text: "text-indigo-600" },
};

const difficultyBadge: Record<string, string> = {
    Beginner:     "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200",
    Intermediate: "text-amber-700   bg-amber-50   ring-1 ring-amber-200",
    Advanced:     "text-red-700     bg-red-50     ring-1 ring-red-200",
};

const statusDisplay: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    not_started: { label: "Not Started", icon: Circle,       className: "text-text-muted bg-surface-muted ring-1 ring-border" },
    in_progress: { label: "In Progress", icon: RefreshCw,    className: "text-primary bg-primary/8 ring-1 ring-primary/20" },
    completed:   { label: "Completed",   icon: CheckCircle2, className: "text-success bg-success/8 ring-1 ring-success/20" },
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
    const tc = topicColors[topic] ?? { bg: "bg-primary-50", text: "text-primary" };
    const st = statusDisplay[status] ?? statusDisplay["not_started"];
    const StatusIcon = st.icon;

    return (
        <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-primary/70 tabular-nums">
                            #{String(order).padStart(2, "0")}
                        </span>
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", tc.bg, tc.text)}>
                            {topic}
                        </span>
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", difficultyBadge[difficulty] ?? "text-text-muted bg-surface-muted ring-1 ring-border")}>
                            {difficulty}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                            <Clock className="h-3 w-3" />
                            {estimatedMinutes} min
                        </span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.className)}>
                            <StatusIcon className="h-3 w-3" />
                            {st.label}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
                </div>
                <Link href={`/lessons/${slug}/edit`} className="shrink-0">
                    <Button variant="outline" size="sm">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                    </Button>
                </Link>
            </div>
        </div>
    );
}
