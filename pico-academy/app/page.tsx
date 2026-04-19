"use client";

import { motion, type Variants } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Greeting from "@/components/dashboard/Greeting";
import RankCard from "@/components/dashboard/RankCard";
import ProgressRings from "@/components/dashboard/ProgressRings";
import NextUpCard from "@/components/dashboard/NextUpCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import FactOfTheDay from "@/components/dashboard/FactOfTheDay";

const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
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
        <Card className="rounded-[20px] shadow-[var(--shadow-card)] bg-gradient-to-br from-primary-50 to-white">
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <Greeting />
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">Pico Academy</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 1: Progress / Next Up / Rank */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
