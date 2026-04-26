import PageContainer from "@/components/layout/PageContainer";
import BadgeGrid from "@/components/badges/BadgeGrid";

export default function BadgesPage() {
    return (
        <PageContainer>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Badges</h1>
                <p className="mt-1 text-text-muted">
                    Collect a badge for every lesson and project you complete
                </p>
            </div>
            <BadgeGrid />
        </PageContainer>
    );
}
