const OLLAMA_BASE_URL =
    process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "glm-4.7-flash:latest";

export interface QuizQuestion {
    id: string;
    type: "mc" | "tf";
    prompt: string;
    choices?: string[];
    answer: number | boolean;
    explanation: string;
}

export interface HealthResult {
    ok: true;
    model: string;
    latencyMs: number;
}

export interface HealthError {
    ok: false;
    error: string;
}

export function getModel(): string {
    return MODEL;
}

export async function generateQuizPool(
    title: string,
    topic: string,
    difficulty: string,
    content: string
): Promise<QuizQuestion[]> {
    const prompt = `You are generating a quiz for a 10-year-old student learning the Raspberry Pi Pico 2 and the C/C++ SDK.

Lesson title: ${title}
Topic: ${topic}
Difficulty: ${difficulty}

Lesson content (markdown):
---
${content}
---

Produce EXACTLY 20 quiz questions as JSON with this shape:
{
  "questions": [
    { "id": "q01", "type": "mc", "prompt": "...", "choices": ["A","B","C","D"], "answer": 0, "explanation": "..." },
    { "id": "q02", "type": "tf", "prompt": "...", "answer": true, "explanation": "..." }
  ]
}

Rules:
- Mix of "mc" (multiple choice, exactly 4 choices, \`answer\` is the zero-based index of the correct choice) and "tf" (true/false, \`answer\` is a boolean). Aim for ~70% mc and ~30% tf.
- Language simple enough for a 10-year-old, but technically correct.
- Prefer questions that test understanding, not trivia.
- All questions must be answerable from the lesson content above.
- Do NOT include any text before or after the JSON.`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: MODEL,
            prompt,
            stream: false,
            // Release model/context window right after each quiz generation.
            keep_alive: "0s",
            options: {
                temperature: 0.7,
                num_predict: 8192,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as { response: string };
    const text = data.response.trim();

    // Clean common LLM JSON quirks (trailing commas, etc.)
    function cleanJson(raw: string): string {
        return raw
            .replace(/,\s*([}\]])/g, "$1")        // trailing commas
            .replace(/[\x00-\x1f]/g, (ch) =>      // unescaped control chars (except valid ones)
                ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""
            );
    }

    // Extract JSON object or array from the response
    let questions: QuizQuestion[];
    const objMatch = text.match(/\{[\s\S]*"questions"[\s\S]*\}/);
    if (objMatch) {
        const parsed = JSON.parse(cleanJson(objMatch[0])) as { questions: QuizQuestion[] };
        questions = parsed.questions;
    } else {
        const arrMatch = text.match(/\[[\s\S]*\]/);
        if (!arrMatch) {
            throw new Error("Failed to parse quiz questions from Ollama response");
        }
        questions = JSON.parse(cleanJson(arrMatch[0]));
    }

    // Validate structure
    for (const q of questions) {
        if (
            !q.id ||
            !q.type ||
            !q.prompt ||
            !q.explanation
        ) {
            throw new Error("Invalid question format in Ollama response");
        }
        if (q.type === "mc") {
            if (!Array.isArray(q.choices) || q.choices.length !== 4 || typeof q.answer !== "number" || q.answer < 0 || q.answer > 3) {
                throw new Error("Invalid MC question format in Ollama response");
            }
        } else if (q.type === "tf") {
            if (typeof q.answer !== "boolean") {
                throw new Error("Invalid TF question format in Ollama response");
            }
        }
    }

    return questions;
}

export async function checkHealth(): Promise<HealthResult | HealthError> {
    const start = Date.now();
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            return { ok: false, error: `Ollama returned ${response.status}` };
        }

        const latencyMs = Date.now() - start;
        const data = (await response.json()) as {
            models: { name: string }[];
        };

        return {
            ok: true,
            model: data.models?.[0]?.name ?? MODEL,
            latencyMs,
        };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Unknown error connecting to Ollama",
        };
    }
}
