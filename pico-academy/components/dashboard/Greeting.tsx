"use client";

import { motion } from "framer-motion";
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <h1 className="text-2xl font-bold font-display text-foreground sm:text-3xl">
                Good {period}, Kush!
            </h1>
            <p className="mt-1 text-sm text-text-muted">{formatDate()}</p>
            <p className="mt-2 text-sm italic text-text-muted">{tagline}</p>
        </motion.div>
    );
}
