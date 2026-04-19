"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue>({
    open: false,
    setOpen: () => { },
});

function Dialog({
    children,
    open: controlledOpen,
    onOpenChange,
}: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = onOpenChange ?? setUncontrolledOpen;

    return (
        <DialogContext.Provider value={{ open, setOpen }}>
            {children}
        </DialogContext.Provider>
    );
}

function DialogTrigger({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { setOpen } = React.useContext(DialogContext);
    return (
        <button className={className} onClick={() => setOpen(true)} {...props}>
            {children}
        </button>
    );
}

function DialogContent({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const { open, setOpen } = React.useContext(DialogContext);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!mounted || !open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50"
                onClick={() => setOpen(false)}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                className={cn(
                    "relative z-50 w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg",
                    className,
                )}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn("text-sm text-text-muted", className)} {...props} />;
}

function DialogClose({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { setOpen } = React.useContext(DialogContext);
    return (
        <button className={className} onClick={() => setOpen(false)} {...props}>
            {children}
        </button>
    );
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose };
