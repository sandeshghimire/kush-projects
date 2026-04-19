"use client";

import { Lock } from "lucide-react";

interface LockOverlayProps {
    lockReason: string;
}

export default function LockOverlay({ lockReason }: LockOverlayProps) {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/60 backdrop-blur-sm">
            <Lock className="h-8 w-8 text-white/80" />
            <p className="px-4 text-center text-sm font-medium text-white/90">
                {lockReason}
            </p>
        </div>
    );
}
