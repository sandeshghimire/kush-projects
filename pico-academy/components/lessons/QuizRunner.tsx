"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ConfettiBurst from "@/components/animations/ConfettiBurst";
import { cn } from "@/lib/utils";

interface QuizQuestion {
    id: string;
    type: "mc" | "tf";
    prompt: string;
    choices?: string[];
}

interface ReviewItem {
    id: string;
    correct: number | boolean;
    right: boolean;
}

interface QuizResult {
    score: number;
    passed: boolean;
    review: ReviewItem[];
}

interface QuizRunnerProps {
    slug: string;
    kind: "lesson" | "project";
}

export default function QuizRunner({ slug, kind }: QuizRunnerProps) {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number | boolean>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [noPool, setNoPool] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const loadQuiz = () => {
        setLoading(true);
        setError(null);
        setNoPool(false);
        fetch(`/api/${kind}s/${slug}/quiz`)
            .then((res) => {
                if (res.status === 404) {
                    setNoPool(true);
                    return null;
                }
                if (!res.ok) throw new Error("Failed to load quiz");
                return res.json();
            })
            .then((data) => {
                if (!data) return;
                const raw = data.items ?? data.questions ?? data;
                const mapped: QuizQuestion[] = raw.map((q: Record<string, unknown>) => ({
                    id: String(q.id),
                    type: q.type === "mc" || q.type === "tf" ? q.type : "mc",
                    prompt: String(q.prompt ?? q.question ?? ""),
                    choices: (q.choices ?? q.options) as string[] | undefined,
                }));
                setQuestions(mapped);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadQuiz();
    }, [slug, kind]);

    const generatePool = async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch(`/api/${kind}s/${slug}/quiz/generate`, {
                method: "POST",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to generate quiz pool");
            }
            setNoPool(false);
            loadQuiz();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed");
        } finally {
            setGenerating(false);
        }
    };

    const current = questions[currentIdx];
    const answered = current ? answers[current.id] !== undefined : false;
    const isLast = currentIdx === questions.length - 1;

    const handleAnswer = (value: number | boolean) => {
        if (!current) return;
        setAnswers((prev) => ({ ...prev, [current.id]: value }));
    };

    const handleNext = () => {
        if (isLast) {
            submitQuiz();
        } else {
            setCurrentIdx((prev) => prev + 1);
        }
    };

    const submitQuiz = async () => {
        setSubmitting(true);
        try {
            const answersArray = Object.entries(answers).map(([id, selected]) => ({
                id,
                selected,
            }));
            const res = await fetch(`/api/${kind}s/${slug}/quiz`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: answersArray }),
            });
            if (!res.ok) throw new Error("Failed to submit quiz");
            const data = await res.json();
            setResult({
                score: data.score,
                passed: data.passed,
                review: data.review ?? [],
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Submit failed");
        } finally {
            setSubmitting(false);
        }
    };

    const retake = () => {
        setResult(null);
        setAnswers({});
        setCurrentIdx(0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <p className="text-sm text-danger">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (noPool) {
        return (
            <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-8 text-center">
                    <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        No Quiz Pool Generated
                    </h3>
                    <p className="mb-4 text-sm text-text-muted">
                        A quiz pool needs to be generated before you can take this quiz.
                        Make sure Ollama is running locally.
                    </p>
                    <Button onClick={generatePool} disabled={generating}>
                        {generating ? "Generating…" : "Generate Quiz Pool"}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (result) {
        const passed = result.passed;
        return (
            <>
                <ConfettiBurst trigger={passed} />
                <div className="mx-auto max-w-2xl space-y-6">
                    <Card>
                        <CardContent className="py-8 text-center">
                            <div
                                className={cn(
                                    "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold",
                                    passed
                                        ? "bg-green-100 text-green-600"
                                        : "bg-orange-100 text-orange-600",
                                )}
                            >
                                {result.score}/{questions.length}
                            </div>
                            <h2 className="mb-2 text-xl font-bold">
                                {passed ? "Passed!" : "Keep going!"}
                            </h2>
                            <p className="mb-4 text-sm text-text-muted">
                                {passed
                                    ? "Great work! You've demonstrated solid understanding."
                                    : "You need at least 7/10 to pass. Review the material and try again."}
                            </p>
                            {!passed && (
                                <Button onClick={retake}>Retake Quiz</Button>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Review</h3>
                        {questions.map((q, idx) => {
                            const reviewItem = result.review.find(
                                (r) => r.id === q.id,
                            );
                            const isCorrect = reviewItem?.right ?? false;
                            return (
                                <Card key={q.id} className={cn(isCorrect ? "border-green-200" : "border-red-200")}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            {isCorrect ? (
                                                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                                            ) : (
                                                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {idx + 1}. {q.prompt}
                                                </p>
                                                {!isCorrect && reviewItem && q.type === "mc" && q.choices && (
                                                    <p className="mt-1 text-xs text-text-muted">
                                                        Correct answer: {q.choices[reviewItem.correct as number]}
                                                    </p>
                                                )}
                                                {!isCorrect && reviewItem && q.type === "tf" && (
                                                    <p className="mt-1 text-xs text-text-muted">
                                                        Correct answer: {reviewItem.correct ? "True" : "False"}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </>
        );
    }

    if (!current) return null;

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-text-muted">
                    <span>
                        Question {currentIdx + 1} of {questions.length}
                    </span>
                    <span>
                        {Math.round(((currentIdx + 1) / questions.length) * 100)}%
                    </span>
                </div>
                <Progress value={currentIdx + 1} max={questions.length} />
            </div>

            <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
            >
                <Card>
                    <CardContent className="p-6">
                        <p className="mb-6 text-base font-medium text-foreground">
                            {current.prompt}
                        </p>

                        {current.type === "mc" && current.choices && (
                            <div className="space-y-2">
                                {current.choices.map((choice, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(idx)}
                                        className={cn(
                                            "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                                            answers[current.id] === idx
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-primary/50 hover:bg-surface-muted",
                                        )}
                                    >
                                        <span className="mr-2 font-medium">
                                            {String.fromCharCode(65 + idx)}.
                                        </span>
                                        {choice}
                                    </button>
                                ))}
                            </div>
                        )}

                        {current.type === "tf" && (
                            <div className="flex gap-3">
                                {[true, false].map((val) => (
                                    <button
                                        key={String(val)}
                                        onClick={() => handleAnswer(val)}
                                        className={cn(
                                            "flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-colors",
                                            answers[current.id] === val
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-primary/50 hover:bg-surface-muted",
                                        )}
                                    >
                                        {val ? "True" : "False"}
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            <div className="flex justify-end">
                <Button
                    onClick={handleNext}
                    disabled={!answered || submitting}
                >
                    {submitting
                        ? "Submitting..."
                        : isLast
                            ? "Finish"
                            : "Next"}
                    {!isLast && !submitting && <ChevronRight className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
