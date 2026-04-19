function getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}

export function formatDate(date: Date = new Date()): string {
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
    const day = date.getDate();
    const year = date.getFullYear();
    const suffix = getOrdinalSuffix(day);

    return `${weekday}, ${month} ${day}${suffix} ${year}`;
}

export function getGreetingPeriod(): "morning" | "afternoon" | "evening" {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
}
