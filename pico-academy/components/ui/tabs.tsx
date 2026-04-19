"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
    activeTab: string;
    setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
    activeTab: "",
    setActiveTab: () => { },
});

function Tabs({
    defaultValue,
    value,
    onValueChange,
    children,
    className,
    ...props
}: {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
    const activeTab = value ?? uncontrolled;
    const setActiveTab = onValueChange ?? setUncontrolled;

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={className} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "inline-flex items-center justify-center rounded-lg bg-surface-muted p-1 text-text-muted",
                className,
            )}
            role="tablist"
            {...props}
        />
    );
}

function TabsTrigger({
    value,
    className,
    ...props
}: { value: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { activeTab, setActiveTab } = React.useContext(TabsContext);
    const isActive = activeTab === value;

    return (
        <button
            role="tab"
            aria-selected={isActive}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                    ? "bg-surface text-foreground shadow-sm"
                    : "hover:text-foreground",
                className,
            )}
            onClick={() => setActiveTab(value)}
            {...props}
        />
    );
}

function TabsContent({
    value,
    className,
    ...props
}: { value: string } & React.HTMLAttributes<HTMLDivElement>) {
    const { activeTab } = React.useContext(TabsContext);

    if (activeTab !== value) return null;

    return (
        <div
            role="tabpanel"
            className={cn("mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
            {...props}
        />
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
