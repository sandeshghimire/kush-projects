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
        <header className="sticky top-0 z-50 h-16 glass border-b border-white/60 shadow-[0_1px_0_0_rgb(222_226_243/0.8),0_4px_20px_0_rgb(13_16_33/0.06)]">
            <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_2px_8px_rgb(99_102_241/0.35)]">
                        <Cpu className="h-4.5 w-4.5 text-white" />
                    </div>
                    <span className="font-display text-[15px] font-bold tracking-tight gradient-text">
                        Kush&apos;s Pico Academy
                    </span>
                </Link>

                <ul className="flex items-center gap-0.5">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                        const isActive =
                            href === "/" ? pathname === "/" : pathname.startsWith(href);

                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                                        isActive
                                            ? "bg-primary/8 text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]"
                                            : "text-text-muted hover:text-foreground hover:bg-surface-muted/80",
                                    )}
                                >
                                    <Icon className={cn("h-3.5 w-3.5", isActive && "text-primary")} />
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
