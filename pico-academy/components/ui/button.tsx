import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
    variant: {
        default: "bg-primary text-white hover:bg-primary-600 shadow-sm",
        destructive: "bg-danger text-white hover:bg-red-600 shadow-sm",
        outline: "border border-border bg-transparent hover:bg-surface-muted text-foreground",
        secondary: "bg-surface-muted text-foreground hover:bg-gray-200",
        ghost: "hover:bg-surface-muted text-foreground",
    },
    size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-12 px-6 text-base rounded-lg",
        icon: "h-10 w-10",
    },
} as const;

type ButtonVariant = keyof typeof buttonVariants.variant;
type ButtonSize = keyof typeof buttonVariants.size;

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    buttonVariants.variant[variant],
                    buttonVariants.size[size],
                    className,
                )}
                ref={ref}
                {...props}
            />
        );
    },
);
Button.displayName = "Button";

export { Button, buttonVariants };
