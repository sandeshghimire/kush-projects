export interface Rank {
    title: string;
    min: number;
    max: number;
    nextTitle: string | null;
    itemsToNext: number | null;
}

const thresholds: { title: string; min: number; max: number }[] = [
    { title: "Cadet", min: 0, max: 0 },
    { title: "Spark Scout", min: 1, max: 3 },
    { title: "Circuit Explorer", min: 4, max: 7 },
    { title: "Signal Seeker", min: 8, max: 12 },
    { title: "Junior Engineer", min: 13, max: 17 },
    { title: "Engineer", min: 18, max: 22 },
    { title: "Robotics Specialist", min: 23, max: 27 },
    { title: "Senior Engineer", min: 28, max: 32 },
    { title: "Master Roboticist", min: 33, max: 37 },
    { title: "Grand Roboticist", min: 38, max: 40 },
];

export function getRank(completedCount: number): Rank {
    const clamped = Math.max(0, Math.min(40, completedCount));

    let currentIdx = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (clamped >= thresholds[i].min) {
            currentIdx = i;
            break;
        }
    }

    const current = thresholds[currentIdx];
    const next = currentIdx < thresholds.length - 1 ? thresholds[currentIdx + 1] : null;

    return {
        title: current.title,
        min: current.min,
        max: current.max,
        nextTitle: next ? next.title : null,
        itemsToNext: next ? next.min - clamped : null,
    };
}
