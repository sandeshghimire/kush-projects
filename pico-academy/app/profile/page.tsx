"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import {
    BookOpen, Wrench, Award, Brain, CheckCircle2, Trophy, Pencil, Save, X,
    Calendar, Zap, User,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import CountUp from "@/components/animations/CountUp";
import { getRank } from "@/lib/rank";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────── */

interface ProfileData {
    displayName: string;
    bio: string;
    avatarUrl: string;
    createdAt: string | null;
}

interface ProgressData {
    lessons: { total: number; completed: number; inProgress: number };
    projects: { total: number; completed: number; inProgress: number };
    badges: { total: number; earned: number };
    rank: { title: string; min: number; max: number; nextTitle: string | null; itemsToNext: number | null };
    recentActivity: { type: string; itemSlug: string; itemTitle: string; detail: string; timestamp: number }[];
}

interface BadgeData {
    slug: string; title: string; description: string; iconPath: string;
    earned: boolean; awardedAt: string | null;
}

/* ── Animations ────────────────────────────────── */

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

/* ── Avatars ───────────────────────────────────── */

const AVATAR_OPTIONS = [
    "🤖", "🚀", "⚡", "🔧", "🧠", "🎮", "💡", "🛸",
    "🏎️", "🎯", "🔬", "🌟", "🦾", "🎨", "🧪", "🔌",
];

/* ── Rank colours ──────────────────────────────── */

const rankColors: Record<string, string> = {
    Cadet: "from-gray-500 to-gray-600",
    "Spark Scout": "from-yellow-400 to-yellow-600",
    "Circuit Explorer": "from-green-400 to-green-600",
    "Signal Seeker": "from-blue-400 to-blue-600",
    "Junior Engineer": "from-indigo-400 to-indigo-600",
    Engineer: "from-violet-500 to-violet-700",
    "Robotics Specialist": "from-purple-500 to-purple-700",
    "Senior Engineer": "from-pink-500 to-pink-700",
    "Master Roboticist": "from-orange-500 to-orange-700",
    "Grand Roboticist": "from-amber-400 to-red-600",
};

/* ── Page ──────────────────────────────────────── */

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [badges, setBadges] = useState<BadgeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editBio, setEditBio] = useState("");
    const [editAvatar, setEditAvatar] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        Promise.all([
            fetch("/api/profile").then((r) => r.json()),
            fetch("/api/progress").then((r) => r.json()),
            fetch("/api/badges").then((r) => r.json()),
        ])
            .then(([prof, prog, bdg]) => {
                setProfile(prof);
                setProgress(prog);
                setBadges(bdg);
                setEditName(prof.displayName);
                setEditBio(prof.bio);
                setEditAvatar(prof.avatarUrl);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleSave() {
        setSaving(true);
        await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: editName, bio: editBio, avatarUrl: editAvatar }),
        });
        setSaving(false);
        setEditing(false);
        load();
    }

    if (loading || !profile || !progress) {
        return (
            <PageContainer>
                <div className="space-y-6">
                    <div className="h-48 animate-pulse rounded-2xl bg-surface-muted" />
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-muted" />
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    const totalCompleted = progress.lessons.completed + progress.projects.completed;
    const rank = getRank(totalCompleted);
    const gradient = rankColors[rank.title] ?? "from-gray-500 to-gray-600";
    const earnedBadges = badges.filter((b) => b.earned);
    const memberSince = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : null;

    const rankProgress = rank.itemsToNext !== null
        ? ((totalCompleted - rank.min) / (rank.max - rank.min + 1)) * 100
        : 100;

    return (
        <PageContainer>
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

                {/* ── Hero Card ─────────────────────────────── */}
                <motion.div variants={fadeUp}>
                    <Card className="overflow-hidden rounded-2xl shadow-lg">
                        {/* Gradient banner */}
                        <div className={cn("relative h-28 bg-gradient-to-r", gradient)}>
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-50" />
                        </div>

                        <CardContent className="relative px-6 pb-6">
                            {/* Avatar */}
                            <div className="absolute -top-12 left-6">
                                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-white text-4xl shadow-md">
                                    {profile.avatarUrl || "🤖"}
                                </div>
                            </div>

                            {/* Edit button */}
                            <div className="flex justify-end pt-2">
                                {!editing ? (
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                                    >
                                        <Pencil className="h-3 w-3" /> Edit Profile
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditing(false)}
                                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-muted"
                                        >
                                            <X className="h-3 w-3" /> Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Profile info */}
                            <div className="mt-4">
                                {editing ? (
                                    <div className="space-y-4">
                                        {/* Avatar picker */}
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-text-muted">Avatar</label>
                                            <div className="flex flex-wrap gap-2">
                                                {AVATAR_OPTIONS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => setEditAvatar(emoji)}
                                                        className={cn(
                                                            "flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all",
                                                            editAvatar === emoji
                                                                ? "bg-primary/10 ring-2 ring-primary scale-110"
                                                                : "bg-surface-muted hover:bg-surface-muted/80"
                                                        )}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Name */}
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-text-muted">Display Name</label>
                                            <input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                maxLength={50}
                                                className="w-full max-w-xs rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                            />
                                        </div>
                                        {/* Bio */}
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-text-muted">Bio</label>
                                            <textarea
                                                value={editBio}
                                                onChange={(e) => setEditBio(e.target.value)}
                                                maxLength={500}
                                                rows={3}
                                                placeholder="Tell us about yourself..."
                                                className="w-full max-w-lg rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                            />
                                            <p className="mt-1 text-xs text-text-muted">{editBio.length}/500</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl font-bold text-foreground">{profile.displayName}</h1>
                                        {profile.bio && (
                                            <p className="mt-1 max-w-lg text-sm text-text-muted">{profile.bio}</p>
                                        )}
                                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-muted">
                                            <span className="flex items-center gap-1">
                                                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                                {rank.title}
                                            </span>
                                            {memberSince && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    Member since {memberSince}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                                                {totalCompleted} completed
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ── Stats Strip ───────────────────────────── */}
                <motion.div variants={fadeUp}>
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                        <StatCard icon={BookOpen} color="text-blue-500 bg-blue-50" label="Lessons" value={progress.lessons.completed} suffix={`/${progress.lessons.total}`} />
                        <StatCard icon={Wrench} color="text-emerald-500 bg-emerald-50" label="Projects" value={progress.projects.completed} suffix={`/${progress.projects.total}`} />
                        <StatCard icon={Award} color="text-amber-500 bg-amber-50" label="Badges" value={earnedBadges.length} suffix={`/${badges.length}`} />
                        <StatCard icon={Brain} color="text-purple-500 bg-purple-50" label="Completed" value={totalCompleted} suffix="/40" />
                    </div>
                </motion.div>

                {/* ── Rank Progress ─────────────────────────── */}
                <motion.div variants={fadeUp}>
                    <Card className="rounded-xl">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white", gradient)}>
                                        <Trophy className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">{rank.title}</h3>
                                        <p className="text-xs text-text-muted">
                                            {rank.nextTitle ? `${rank.itemsToNext} more to ${rank.nextTitle}` : "Maximum rank!"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-muted">
                                <motion.div
                                    className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${rankProgress}%` }}
                                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ── Badges Earned ─────────────────────────── */}
                <motion.div variants={fadeUp}>
                    <Card className="rounded-xl">
                        <CardContent className="p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Award className="h-4 w-4 text-amber-500" />
                                    Badges Earned
                                </h3>
                                <span className="text-xs text-text-muted">{earnedBadges.length} / {badges.length}</span>
                            </div>
                            {earnedBadges.length === 0 ? (
                                <p className="text-sm text-text-muted">Complete lessons and projects to earn badges!</p>
                            ) : (
                                <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                                    {earnedBadges.map((b) => (
                                        <motion.div
                                            key={b.slug}
                                            whileHover={{ scale: 1.1, rotateY: 10 }}
                                            className="group relative flex flex-col items-center"
                                        >
                                            <div className="mb-1.5 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 shadow-sm transition-shadow group-hover:shadow-md">
                                                <img src={b.iconPath} alt={b.title} className="h-10 w-10 object-contain" />
                                            </div>
                                            <span className="text-center text-[10px] font-medium leading-tight text-foreground">{b.title}</span>
                                            {/* Tooltip */}
                                            <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                {b.description}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Show a preview of locked badges */}
                            {badges.filter((b) => !b.earned).length > 0 && (
                                <div className="mt-4 border-t border-border pt-4">
                                    <p className="mb-3 text-xs font-medium text-text-muted">Up next</p>
                                    <div className="flex flex-wrap gap-3">
                                        {badges.filter((b) => !b.earned).slice(0, 6).map((b) => (
                                            <div key={b.slug} className="flex items-center gap-2 rounded-lg bg-surface-muted/60 px-3 py-1.5">
                                                <img src={b.iconPath} alt={b.title} className="h-6 w-6 object-contain grayscale opacity-50" />
                                                <span className="text-xs text-text-muted">{b.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ── Recent Activity ──────────────────────── */}
                <motion.div variants={fadeUp}>
                    <Card className="rounded-xl">
                        <CardContent className="p-5">
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Recent Activity
                            </h3>
                            {progress.recentActivity.length === 0 ? (
                                <p className="text-sm text-text-muted">No activity yet. Start learning!</p>
                            ) : (
                                <div className="space-y-2">
                                    {progress.recentActivity.map((a, i) => (
                                        <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-surface-muted/30">
                                            <div className="flex items-center gap-3">
                                                <ActivityIcon type={a.type} />
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{a.itemTitle}</p>
                                                    <p className="text-xs text-text-muted">{a.detail}</p>
                                                </div>
                                            </div>
                                            <span className="shrink-0 text-xs text-text-muted">
                                                {new Date(a.timestamp * 1000).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </PageContainer>
    );
}

/* ── Sub-components ──────────────────────────────── */

function StatCard({
    icon: Icon, color, label, value, suffix,
}: {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
    value: number;
    suffix: string;
}) {
    return (
        <Card className="rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-text-muted">{label}</p>
                    <p className="text-lg font-bold text-foreground">
                        <CountUp end={value} />{suffix}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function ActivityIcon({ type }: { type: string }) {
    const base = "h-8 w-8 flex items-center justify-center rounded-lg";
    switch (type) {
        case "completed":
            return <div className={cn(base, "bg-green-50 text-green-500")}><CheckCircle2 className="h-4 w-4" /></div>;
        case "quiz":
            return <div className={cn(base, "bg-purple-50 text-purple-500")}><Brain className="h-4 w-4" /></div>;
        case "upload":
            return <div className={cn(base, "bg-blue-50 text-blue-500")}><Zap className="h-4 w-4" /></div>;
        default:
            return <div className={cn(base, "bg-gray-50 text-gray-500")}><User className="h-4 w-4" /></div>;
    }
}
