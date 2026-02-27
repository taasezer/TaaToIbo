import { GoogleGenerativeAI } from "@google/generative-ai";
import { detectionResultSchema } from "@/lib/validators";
import type { DetectionResult } from "@/types";

// Lazy-initialized Gemini client — only created on first call
let genAIInstance: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!genAIInstance) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error(
                "GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/app/apikey"
            );
        }
        genAIInstance = new GoogleGenerativeAI(apiKey);
    }
    return genAIInstance;
}

function getModel() {
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-pro";
    return getGenAI().getGenerativeModel({ model: modelName });
}

const SYSTEM_PROMPT = `You are a specialized computer vision system for textile print extraction.
Analyze the garment image and locate the printed graphic design.

Respond ONLY with a valid JSON object. No markdown. No explanation. No backticks.
Exact schema:
{
  "garmentType": "tshirt|hoodie|jacket|other",
  "printLocation": "front|back|sleeve|pocket",
  "boundingBox": {"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0},
  "perspectivePoints": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]],
  "confidence": 0.0,
  "printDescription": "...",
  "dominantColors": ["#hex1","#hex2","#hex3","#hex4","#hex5"],
  "fabricDistortion": "none|minimal|moderate|severe",
  "extractionApproach": "direct|perspective-correct|texture-remove"
}
All coordinates are normalized between 0.0 and 1.0.
perspectivePoints: top-left, top-right, bottom-right, bottom-left corners of the print.
boundingBox: the minimal axis-aligned rectangle that contains the print region.
confidence: your confidence that a print/graphic exists and the coordinates are accurate.
If no print or graphic is found, set confidence to 0.0 and set all coordinates to 0.`;

/**
 * Strip markdown code fences if the model wraps the response in them.
 * Gemini sometimes returns ```json ... ``` despite being told not to.
 */
function stripCodeFences(raw: string): string {
    let cleaned = raw.trim();
    // Remove ```json or ``` wrapper
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    return cleaned.trim();
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Detect the print region on a garment image using Gemini 2.5 Pro Vision.
 *
 * - Sends the image as inline data to Gemini
 * - Parses and validates the JSON response with Zod
 * - Retries on 429/503 with exponential backoff
 * - Hard timeout of 30s per attempt
 */
export async function detectPrintRegion(
    imageBase64: string,
    mimeType: "image/jpeg" | "image/png" | "image/webp"
): Promise<DetectionResult> {
    const model = getModel();
    const maxRetries = Number(process.env.GEMINI_MAX_RETRIES) || 3;
    const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const result = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: SYSTEM_PROMPT },
                            {
                                inlineData: {
                                    mimeType,
                                    data: imageBase64,
                                },
                            },
                            { text: "Analyze this garment image and extract the print region coordinates." },
                        ],
                    },
                ],
            });

            clearTimeout(timeoutId);

            const response = result.response;
            const rawText = response.text();

            if (!rawText || rawText.trim().length === 0) {
                throw new Error("Gemini returned an empty response");
            }

            // Parse JSON, stripping any code fences
            const cleaned = stripCodeFences(rawText);
            let parsed: unknown;
            try {
                parsed = JSON.parse(cleaned);
            } catch {
                throw new Error(`Gemini returned invalid JSON: ${cleaned.substring(0, 200)}`);
            }

            // Validate the response shape
            const validated = detectionResultSchema.safeParse(parsed);
            if (!validated.success) {
                const issues = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
                throw new Error(`Gemini response failed validation: ${issues}`);
            }

            return validated.data;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));

            // Check if this is a retryable error (rate limit or server error)
            const errMsg = lastError.message.toLowerCase();
            const isRetryable =
                errMsg.includes("429") ||
                errMsg.includes("503") ||
                errMsg.includes("rate") ||
                errMsg.includes("overloaded") ||
                errMsg.includes("resource exhausted");

            if (isRetryable && attempt < maxRetries - 1) {
                // Exponential backoff: 1s, 2s, 4s
                const backoffMs = Math.pow(2, attempt) * 1000;
                await sleep(backoffMs);
                continue;
            }

            // Non-retryable error or final attempt — throw immediately
            throw lastError;
        }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error("Detection failed after all retries");
}
