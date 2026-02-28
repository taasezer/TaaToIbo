"use client";

import { useState, useCallback, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { removeBackground } from "@/lib/backgroundRemoval";
import type {
    GarmentImage,
    ApiErrorResponse,
    ExtractResponseData,
    ProcessingResult,
    DetectionResult,
    PerspectivePoints,
} from "@/types";

interface UseExtractionReturn {
    /** Phase 1: Send image to Gemini for print detection. Pauses at "detected" for overlay. */
    detect: (image: GarmentImage) => Promise<void>;
    /** Phase 2: Process the confirmed selection (crop + enhance + bg removal). */
    processSelection: (
        image: GarmentImage,
        detection: DetectionResult,
        adjustedPoints?: PerspectivePoints | null
    ) => Promise<void>;
    /** Full pipeline: detect → auto-confirm → process (for re-detect). */
    extractFull: (image: GarmentImage) => Promise<void>;
    isLoading: boolean;
    progress: number;
    currentStep: string;
    stepMessage: string;
    error: string | null;
    retry: () => void;
}

/**
 * Map API error codes to user-friendly messages.
 */
function friendlyErrorMessage(code: string, fallbackMessage: string): string {
    const messages: Record<string, string> = {
        NO_PRINT_DETECTED:
            "No print design was found. Try a clearer photo with the print fully visible.",
        GEMINI_ERROR: "AI processing failed. Please try again in a moment.",
        RATE_LIMIT: "Too many requests. Please wait a moment and try again.",
        FILE_TOO_LARGE: "Image exceeds 10MB. Please compress and retry.",
        INVALID_IMAGE: "Invalid image file. Please upload a JPEG, PNG, or WEBP.",
        PROCESSING_ERROR: "Image processing failed. Try a different photo or angle.",
        VALIDATION_ERROR: "Something went wrong with the request. Please try again.",
    };
    return messages[code] || fallbackMessage;
}

/**
 * Read a File as a base64 string (without the data:... prefix).
 */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            resolve(base64);
        };
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
    });
}

export function useExtraction(): UseExtractionReturn {
    const [isLoading, setIsLoading] = useState(false);
    const lastImageRef = useRef<GarmentImage | null>(null);

    const store = useAppStore();

    /**
     * Phase 1: Send image to Gemini for print detection.
     * Stops at "detected" state so the user can review/adjust the overlay.
     */
    const detect = useCallback(
        async (image: GarmentImage) => {
            setIsLoading(true);
            lastImageRef.current = image;
            store.setError(null);

            try {
                store.setProcessingStep("detecting");

                const formData = new FormData();
                formData.append("image", image.file);

                const res = await fetch("/api/extract", {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();

                if (!data.success) {
                    const errResp = data as ApiErrorResponse;
                    store.setError({
                        ...errResp.error,
                        message: friendlyErrorMessage(errResp.error.code, errResp.error.message),
                    });
                    return;
                }

                const detection = (data as { success: true; data: ExtractResponseData }).data;
                // This sets processingStep to "detected" — pauses for user to review overlay
                store.setDetection(detection);
            } catch (err) {
                const message = err instanceof Error ? err.message : "An unexpected error occurred";
                store.setError({
                    code: "GEMINI_ERROR",
                    message: friendlyErrorMessage("GEMINI_ERROR", message),
                    retryable: true,
                });
            } finally {
                setIsLoading(false);
            }
        },
        [store]
    );

    /**
     * Phase 2: Process the confirmed selection.
     * Runs: crop → perspective correct → enhance → background removal.
     */
    const processSelection = useCallback(
        async (
            image: GarmentImage,
            detection: DetectionResult,
            adjustedPoints?: PerspectivePoints | null
        ) => {
            setIsLoading(true);
            store.setError(null);

            try {
                // Step: Server-side processing (Sharp)
                store.setProcessingStep("processing");

                const imageBase64 = await fileToBase64(image.file);

                const res = await fetch("/api/process", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        imageBase64,
                        detection,
                        adjustedPoints: adjustedPoints ?? undefined,
                    }),
                });

                const data = await res.json();

                if (!data.success) {
                    const errResp = data as ApiErrorResponse;
                    store.setError({
                        ...errResp.error,
                        message: friendlyErrorMessage(errResp.error.code, errResp.error.message),
                    });
                    return;
                }

                const processed = (data as { success: true; data: ProcessingResult }).data;
                const processedDataUrl = `data:image/png;base64,${processed.processedImageBase64}`;
                store.setProcessedImage(processedDataUrl);

                // Determine if we should skip client-side background removal
                // If it's a full-bleed texture or a direct crop, background removal will ruin it.
                const shouldSkipBgRemoval =
                    detection.extractionApproach === "texture-remove" ||
                    detection.extractionApproach === "direct";

                let finalDataUrl = processedDataUrl;

                if (!shouldSkipBgRemoval) {
                    // Step: Client-side background removal (WASM)
                    store.setProcessingStep("removing-bg");

                    finalDataUrl = await removeBackground(processedDataUrl, (bgProgress) => {
                        const mappedProgress = 80 + bgProgress * 20;
                        useAppStore.setState({
                            processingProgress: Math.round(mappedProgress),
                            stepMessage:
                                bgProgress < 0.3
                                    ? "Loading AI model..."
                                    : bgProgress < 0.7
                                        ? "Segmenting design..."
                                        : "Finalizing transparency...",
                        });
                    });
                } else {
                    // Skip bg removal, just jump to 100%
                    useAppStore.setState({
                        processingProgress: 100,
                        stepMessage: "Finalizing texture...",
                    });
                }

                store.setFinalImage(finalDataUrl, processed.colorPalette);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Processing failed";
                store.setError({
                    code: "PROCESSING_ERROR",
                    message: friendlyErrorMessage("PROCESSING_ERROR", message),
                    retryable: true,
                });
            } finally {
                setIsLoading(false);
            }
        },
        [store]
    );

    /**
     * Full pipeline: detect → skip overlay → process.
     * Used for re-detection where we don't want to pause at overlay again.
     */
    const extractFull = useCallback(
        async (image: GarmentImage) => {
            setIsLoading(true);
            lastImageRef.current = image;
            store.setError(null);

            try {
                // Detect
                store.setProcessingStep("detecting");
                const formData = new FormData();
                formData.append("image", image.file);

                const extractRes = await fetch("/api/extract", {
                    method: "POST",
                    body: formData,
                });
                const extractData = await extractRes.json();

                if (!extractData.success) {
                    const errResp = extractData as ApiErrorResponse;
                    store.setError({
                        ...errResp.error,
                        message: friendlyErrorMessage(errResp.error.code, errResp.error.message),
                    });
                    return;
                }

                const detection = (extractData as { success: true; data: ExtractResponseData }).data;
                store.setDetection(detection);

                // Process immediately (no overlay pause)
                store.setProcessingStep("processing");
                const imageBase64 = await fileToBase64(image.file);

                const processRes = await fetch("/api/process", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageBase64, detection }),
                });
                const processData = await processRes.json();

                if (!processData.success) {
                    const errResp = processData as ApiErrorResponse;
                    store.setError({
                        ...errResp.error,
                        message: friendlyErrorMessage(errResp.error.code, errResp.error.message),
                    });
                    return;
                }

                const processed = (processData as { success: true; data: ProcessingResult }).data;
                const processedDataUrl = `data:image/png;base64,${processed.processedImageBase64}`;
                store.setProcessedImage(processedDataUrl);

                // Background removal
                const shouldSkipBgRemoval =
                    detection.extractionApproach === "texture-remove" ||
                    detection.extractionApproach === "direct";

                let finalDataUrl = processedDataUrl;

                if (!shouldSkipBgRemoval) {
                    store.setProcessingStep("removing-bg");
                    finalDataUrl = await removeBackground(processedDataUrl, (bgProgress) => {
                        const mappedProgress = 80 + bgProgress * 20;
                        useAppStore.setState({
                            processingProgress: Math.round(mappedProgress),
                            stepMessage:
                                bgProgress < 0.3
                                    ? "Loading AI model..."
                                    : bgProgress < 0.7
                                        ? "Segmenting design..."
                                        : "Finalizing transparency...",
                        });
                    });
                } else {
                    useAppStore.setState({
                        processingProgress: 100,
                        stepMessage: "Finalizing texture...",
                    });
                }

                store.setFinalImage(finalDataUrl, processed.colorPalette);
            } catch (err) {
                const message = err instanceof Error ? err.message : "An unexpected error occurred";
                store.setError({
                    code: "GEMINI_ERROR",
                    message: friendlyErrorMessage("GEMINI_ERROR", message),
                    retryable: true,
                });
            } finally {
                setIsLoading(false);
            }
        },
        [store]
    );

    const retry = useCallback(() => {
        if (lastImageRef.current) {
            detect(lastImageRef.current);
        }
    }, [detect]);

    return {
        detect,
        processSelection,
        extractFull,
        isLoading,
        progress: store.processingProgress,
        currentStep: store.processingStep,
        stepMessage: store.stepMessage,
        error: store.error?.message ?? null,
        retry,
    };
}
