import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { processRequestSchema } from "@/lib/validators";
import {
    cropRegion,
    applyPerspectiveCorrection,
    enhanceDesign,
    extractColorPalette,
} from "@/lib/imageProcessor";
import type { ApiResult, ProcessingResult } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResult<ProcessingResult>>> {
    const startTime = Date.now();

    try {
        const body = await request.json();

        // Validate request body
        const parsed = processRequestSchema.safeParse(body);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: `Invalid request: ${issues}`,
                        retryable: false,
                    },
                },
                { status: 400, headers: { "Cache-Control": "no-store" } }
            );
        }

        const { imageBase64, detection, adjustedPoints } = parsed.data;

        // Decode base64 image to buffer
        const imageBuffer = Buffer.from(imageBase64, "base64");
        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width ?? 0;
        const imgHeight = metadata.height ?? 0;

        if (imgWidth === 0 || imgHeight === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "INVALID_IMAGE",
                        message: "Could not read image dimensions.",
                        retryable: false,
                    },
                },
                { status: 400, headers: { "Cache-Control": "no-store" } }
            );
        }

        // Use adjusted points if provided, otherwise use detection points
        const perspectivePoints = adjustedPoints ?? detection.perspectivePoints;

        let processedBuffer: Buffer;

        if (detection.extractionApproach === "direct") {
            // Simple crop for well-aligned prints
            processedBuffer = await cropRegion(imageBuffer, detection.boundingBox, imgWidth, imgHeight);
        } else {
            // Apply perspective correction then crop
            processedBuffer = await applyPerspectiveCorrection(
                imageBuffer,
                perspectivePoints,
                imgWidth,
                imgHeight
            );
        }

        // Enhance the extracted design
        processedBuffer = await enhanceDesign(processedBuffer);

        // Get final dimensions
        const finalMeta = await sharp(processedBuffer).metadata();

        // Extract color palette
        const colorPalette = await extractColorPalette(processedBuffer, 5);

        // Convert to base64
        const processedBase64 = processedBuffer.toString("base64");

        const processingTime = Date.now() - startTime;

        return NextResponse.json(
            {
                success: true,
                data: {
                    processedImageBase64: processedBase64,
                    width: finalMeta.width ?? 0,
                    height: finalMeta.height ?? 0,
                    colorPalette,
                    processingTime,
                },
            },
            { status: 200, headers: { "Cache-Control": "no-store" } }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown processing error";
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "PROCESSING_ERROR",
                    message: `Image processing failed: ${message}`,
                    retryable: true,
                },
            },
            { status: 500, headers: { "Cache-Control": "no-store" } }
        );
    }
}
