import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
    default: "bg-primary text-white",
    secondary: "bg-surface-muted text-foreground",
    outline: "border border-border text-foreground bg-transparent",
    destructive: "bg-danger text-white",
} as const;

type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                badgeVariants[variant],
                className,
            )}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
