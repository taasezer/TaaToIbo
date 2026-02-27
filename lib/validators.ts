import { z } from "zod";

// --- Shared Schemas ---

export const boundingBoxSchema = z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
});

export const perspectivePointSchema = z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
]);

export const perspectivePointsSchema = z.tuple([
    perspectivePointSchema,
    perspectivePointSchema,
    perspectivePointSchema,
    perspectivePointSchema,
]);

export const garmentTypeSchema = z.enum(["tshirt", "hoodie", "jacket", "other"]);
export const printLocationSchema = z.enum(["front", "back", "sleeve", "pocket"]);
export const fabricDistortionSchema = z.enum(["none", "minimal", "moderate", "severe"]);
export const extractionApproachSchema = z.enum(["direct", "perspective-correct", "texture-remove"]);

// --- Gemini Response Validation ---

export const detectionResultSchema = z.object({
    garmentType: garmentTypeSchema,
    printLocation: printLocationSchema,
    boundingBox: boundingBoxSchema,
    perspectivePoints: perspectivePointsSchema,
    confidence: z.number().min(0).max(1),
    printDescription: z.string(),
    dominantColors: z.array(z.string()).min(1).max(10),
    fabricDistortion: fabricDistortionSchema,
    extractionApproach: extractionApproachSchema,
});

// --- /api/extract ---

export const extractOptionsSchema = z.object({
    sensitivity: z.number().min(0).max(1).default(0.7),
});

export const extractResponseSchema = z.object({
    success: z.literal(true),
    data: detectionResultSchema.extend({
        processingTime: z.number(),
    }),
});

// --- /api/process ---

export const processRequestSchema = z.object({
    imageBase64: z.string().min(1, "imageBase64 is required"),
    detection: detectionResultSchema,
    adjustedPoints: perspectivePointsSchema.optional(),
});

export const processResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        processedImageBase64: z.string(),
        width: z.number(),
        height: z.number(),
        colorPalette: z.array(z.string()),
        processingTime: z.number(),
    }),
});

// --- API Error ---

export const apiErrorCodeSchema = z.enum([
    "INVALID_IMAGE",
    "NO_PRINT_DETECTED",
    "GEMINI_ERROR",
    "RATE_LIMIT",
    "FILE_TOO_LARGE",
    "PROCESSING_ERROR",
    "VALIDATION_ERROR",
]);

export const apiErrorSchema = z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
});

export const apiErrorResponseSchema = z.object({
    success: z.literal(false),
    error: apiErrorSchema,
});

// --- File Upload Validation ---

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateImageFile(file: File): { valid: true } | { valid: false; error: string } {
    if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
        return { valid: false, error: `Invalid file type: ${file.type}. Accepted: JPEG, PNG, WEBP.` };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return { valid: false, error: `File too large: ${sizeMB}MB. Maximum: 10MB.` };
    }
    return { valid: true };
}
