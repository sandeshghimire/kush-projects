"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { formatDate, getGreetingPeriod } from "@/lib/date";

const taglines = [
    "Every circuit starts with a single wire.",
    "Keep building — robots don't assemble themselves!",
    "Today's a great day to learn something new.",
    "One blink at a time, you're becoming an engineer.",
    "Curiosity is the best debugger.",
    "Small steps, big circuits.",
    "Let's turn ideas into working machines!",
    "Sensors ready, motors spinning — let's go!",
    "The best engineers never stop experimenting.",
    "Your next breakthrough is just one lesson away.",
];

function getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Greeting() {
    const period = getGreetingPeriod();
    const tagline = taglines[getDayOfYear() % taglines.length];

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    Pico Academy
                </span>
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl tracking-tight">
                Good {period}, Kush!
            </h1>
            <p className="mt-1.5 text-sm text-white/50">{formatDate()}</p>
            <p className="mt-3 text-sm text-white/70 italic leading-relaxed max-w-md">&ldquo;{tagline}&rdquo;</p>
        </motion.div>
    );
}
