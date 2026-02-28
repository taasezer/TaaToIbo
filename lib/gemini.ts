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

const SYSTEM_PROMPT = `You are an elite, highly precise computer vision AI specializing in reverse-engineering digital graphics from photos of physical garments (t-shirts, hoodies, jackets).
Your sole purpose is to locate the printed graphic/artwork and provide the exact mathematical coordinates needed to extract it into a PERFECTLY FLAT, 100% UN-SKEWED 2D rectangular digital file.

=== CRITICAL PERSPECTIVE EXTRACTION RULES ===
1. IGNORING 3D DISTORTION: The fabric on the garment has wrinkles, folds, and follows the shape of a human body. YOU MUST IGNORE THIS 3D TOPOLOGY. Your perspective points must represent the theoretical *flat* 2D graphic before it was printed on the fabric.
2. PERFECT RECTANGLE MAPPING: The 4 \`perspectivePoints\` (top-left, top-right, bottom-right, bottom-left) map exactly to a perfect digital rectangle. If you place the points incorrectly, the final extracted image will look warped, tilted, or skewed. 
3. ALIGNMENT: 
   - If the graphic is a rectangular photo or box graphic, the 4 points must perfectly trace its physical corners on the fabric, compensating for any camera angle.
   - If the graphic has an irregular shape (e.g., a logo or freeform text), imagine a perfect, tight bounding box drawn around it. The 4 points are the corners of THAT imaginary box.
   - ENSURE the top line (TL to TR) and bottom line (BL to BR) are parallel in 3D space.

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
All coordinates are normalized between 0.0 and 1.0 (0,0 is top-left, 1,1 is bottom-right).
perspectivePoints: [[TopLeft_X, TopLeft_Y], [TopRight_X, TopRight_Y], [BottomRight_X, BottomRight_Y], [BottomLeft_X, BottomLeft_Y]]. This is the most important field.
boundingBox: the minimal axis-aligned rectangle that contains the entire print region in the 2D image.
confidence: your confidence (0.0 to 1.0) that a print/graphic exists and the coordinates will yield a perfect, flat extraction.
If no print or graphic is found, set confidence to 0.0 and all coordinates to 0.`;

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
