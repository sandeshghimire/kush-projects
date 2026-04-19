import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon className="mb-4 h-12 w-12 text-text-muted/50" />
            <h3 className="text-lg font-medium text-text-muted">{title}</h3>
            <p className="mt-1 max-w-sm text-sm text-text-muted/70">{description}</p>
        </div>
    );
}
