"use client";

import { motion, type Variants } from "framer-motion";
import Greeting from "@/components/dashboard/Greeting";
import RankCard from "@/components/dashboard/RankCard";
import ProgressRings from "@/components/dashboard/ProgressRings";
import NextUpCard from "@/components/dashboard/NextUpCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import FactOfTheDay from "@/components/dashboard/FactOfTheDay";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  return (
    <motion.div
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Hero */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-px shadow-[var(--shadow-elevated)]">
          <div className="relative rounded-[calc(24px-1px)] bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#1e1b4b] px-8 py-6">
            {/* Decorative orbs */}
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/4 rounded-full bg-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
            <Greeting />
          </div>
        </div>
      </motion.div>

      {/* Row 1: Progress / Next Up / Rank */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <motion.div variants={fadeUp}>
          <ProgressRings />
        </motion.div>
        <motion.div variants={fadeUp}>
          <NextUpCard />
        </motion.div>
        <motion.div variants={fadeUp}>
          <RankCard />
        </motion.div>
      </div>

      {/* Row 2: Recent Activity / Fact */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <motion.div variants={fadeUp} className="md:col-span-2">
          <RecentActivity />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FactOfTheDay />
        </motion.div>
      </div>
    </motion.div>
  );
}
