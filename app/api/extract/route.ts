import { NextRequest, NextResponse } from "next/server";
import { detectPrintRegion } from "@/lib/gemini";
import type { ApiResult, ExtractResponseData } from "@/types";

// Accepted image MIME types
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest): Promise<NextResponse<ApiResult<ExtractResponseData>>> {
    const startTime = Date.now();

    try {
        const formData = await request.formData();
        const imageFile = formData.get("image");

        // Validate file presence
        if (!imageFile || !(imageFile instanceof File)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "INVALID_IMAGE",
                        message: "No image file provided. Send a file with the key 'image'.",
                        retryable: false,
                    },
                },
                { status: 400, headers: { "Cache-Control": "no-store" } }
            );
        }

        // Validate file type
        if (!ACCEPTED_TYPES.has(imageFile.type)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "INVALID_IMAGE",
                        message: `Invalid file type: ${imageFile.type}. Accepted: JPEG, PNG, WEBP.`,
                        retryable: false,
                    },
                },
                { status: 400, headers: { "Cache-Control": "no-store" } }
            );
        }

        // Validate file size
        if (imageFile.size > MAX_FILE_SIZE) {
            const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(1);
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "FILE_TOO_LARGE",
                        message: `Image is ${sizeMB}MB. Maximum allowed: 10MB.`,
                        retryable: false,
                    },
                },
                { status: 413, headers: { "Cache-Control": "no-store" } }
            );
        }

        // Convert file to base64
        const bytes = await imageFile.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const mimeType = imageFile.type as "image/jpeg" | "image/png" | "image/webp";

        // Parse optional sensitivity from form data
        const sensitivityRaw = formData.get("sensitivity");
        // sensitivity is used for future tuning — currently passed as context
        const _sensitivity = sensitivityRaw ? parseFloat(sensitivityRaw as string) : 0.7;

        // Call Gemini 2.5 Pro for print detection
        const detection = await detectPrintRegion(base64, mimeType);

        // Check if a print was actually found
        if (detection.confidence < 0.1) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "NO_PRINT_DETECTED",
                        message: "No print design was found. Try a clearer photo with the print fully visible.",
                        retryable: true,
                    },
                },
                { status: 404, headers: { "Cache-Control": "no-store" } }
            );
        }

        const processingTime = Date.now() - startTime;

        return NextResponse.json(
            {
                success: true,
                data: {
                    ...detection,
                    processingTime,
                },
            },
            { status: 200, headers: { "Cache-Control": "no-store" } }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";

        // Classify the error
        if (message.includes("429") || message.includes("rate") || message.includes("resource exhausted")) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "RATE_LIMIT",
                        message: "Too many requests. Please wait a moment and try again.",
                        retryable: true,
                    },
                },
                { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "GEMINI_ERROR",
                    message: "AI processing failed. Please try again.",
                    retryable: true,
                },
            },
            { status: 500, headers: { "Cache-Control": "no-store" } }
        );
    }
}
