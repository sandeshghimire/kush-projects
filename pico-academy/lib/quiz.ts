import fs from "fs";
import path from "path";

export type Kind = "lesson" | "project";

export interface QuizQuestion {
    id: string;
    type: "mc" | "tf";
    prompt: string;
    choices?: string[];
    answer: number | boolean;
    explanation: string;
}

export interface QuizPool {
    slug: string;
    generatedAt: string;
    model: string;
    questions: QuizQuestion[];
}

export interface SampledQuestion {
    id: string;
    type: "mc" | "tf";
    prompt: string;
    choices?: string[];
}

export interface QuizReviewItem {
    id: string;
    correct: number | boolean;
    right: boolean;
}

export interface GradeResult {
    score: number;
    passed: boolean;
    review: QuizReviewItem[];
}

function poolPath(slug: string, kind: Kind): string {
    return path.join(process.cwd(), "public", "data", `${kind}s`, slug, "quiz.json");
}

export function readQuizPool(slug: string, kind: Kind): QuizPool | null {
    const filePath = poolPath(slug, kind);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as QuizPool;
}

export function writeQuizPool(slug: string, kind: Kind, pool: QuizPool): void {
    const filePath = poolPath(slug, kind);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(pool, null, 2), "utf-8");
}

export function sampleQuestions(
    pool: QuizPool,
    count = 10
): SampledQuestion[] {
    const indices = pool.questions.map((_, i) => i);

    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return indices.slice(0, Math.min(count, indices.length)).map((idx) => {
        const q = pool.questions[idx];
        const sampled: SampledQuestion = {
            id: q.id,
            type: q.type,
            prompt: q.prompt,
        };
        if (q.type === "mc") {
            sampled.choices = q.choices;
        }
        return sampled;
    });
}

export function gradeQuiz(
    pool: QuizPool,
    answers: { id: string; selected: number | boolean }[]
): GradeResult {
    let correct = 0;
    const review: QuizReviewItem[] = [];

    const questionMap = new Map(pool.questions.map((q) => [q.id, q]));

    for (const answer of answers) {
        const q = questionMap.get(answer.id);
        if (!q) continue;

        const isCorrect = answer.selected === q.answer;
        if (isCorrect) correct++;

        review.push({
            id: q.id,
            correct: q.answer,
            right: isCorrect,
        });
    }

    const score = correct;

    return {
        score,
        passed: score >= 7,
        review,
    };
}
