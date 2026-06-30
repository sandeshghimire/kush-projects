import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
    variant: {
        default: "bg-gradient-to-r from-primary to-accent text-white shadow-[0_2px_8px_rgb(99_102_241/0.30)] hover:shadow-[0_4px_16px_rgb(99_102_241/0.40)] hover:opacity-90 active:scale-[0.98]",
        destructive: "bg-danger text-white hover:bg-red-600 shadow-sm",
        outline: "border border-border/80 bg-surface/80 hover:bg-surface-muted text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        secondary: "bg-surface-muted text-foreground hover:bg-border/50",
        ghost: "hover:bg-surface-muted text-foreground",
    },
    size: {
        default: "h-10 px-5 py-2 text-sm",
        sm: "h-8 px-3.5 text-xs rounded-xl",
        lg: "h-12 px-7 text-base rounded-2xl",
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
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
