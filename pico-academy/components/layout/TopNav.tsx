"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Home, BookOpen, Wrench, Award, User, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/lessons", label: "Lessons", icon: BookOpen },
    { href: "/projects", label: "Projects", icon: Wrench },
    { href: "/parts", label: "Parts", icon: Package },
    { href: "/badges", label: "Badges", icon: Award },
    { href: "/profile", label: "Profile", icon: User },
];

export default function TopNav() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 h-16 border-b border-border bg-white px-6">
            <nav className="mx-auto flex h-full max-w-7xl items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
                    <Cpu className="h-6 w-6" />
                    <span className="font-display">Kush&apos;s Pico Academy</span>
                </Link>

                <ul className="flex items-center gap-1">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                        const isActive =
                            href === "/" ? pathname === "/" : pathname.startsWith(href);

                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "text-primary border-b-2 border-primary"
                                            : "text-text-muted hover:text-foreground hover:bg-surface-muted",
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </header>
    );
}
