"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { removeBackground } from "@/lib/backgroundRemoval";
import type { GarmentImage, ApiErrorResponse, ExtractResponseData, ProcessingResult } from "@/types";

interface UseExtractionReturn {
    extract: (image: GarmentImage) => Promise<void>;
    isLoading: boolean;
    progress: number;
    currentStep: string;
    stepMessage: string;
    error: string | null;
    retry: () => void;
}

export function useExtraction(): UseExtractionReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [lastImage, setLastImage] = useState<GarmentImage | null>(null);

    const store = useAppStore();

    const extract = useCallback(
        async (image: GarmentImage) => {
            setIsLoading(true);
            setLastImage(image);
            store.setError(null);

            try {
                // Step 1: Upload & Detect
                store.setProcessingStep("detecting");

                const formData = new FormData();
                formData.append("image", image.file);

                const extractRes = await fetch("/api/extract", {
                    method: "POST",
                    body: formData,
                });

                const extractData = await extractRes.json();

                if (!extractData.success) {
                    const errorResp = extractData as ApiErrorResponse;
                    store.setError(errorResp.error);
                    setIsLoading(false);
                    return;
                }

                const detection = (extractData as { success: true; data: ExtractResponseData }).data;
                store.setDetection(detection);

                // Step 2: Process (crop + perspective + enhance)
                store.setProcessingStep("processing");

                // Convert image file to base64 for the process endpoint
                const reader = new FileReader();
                const imageBase64 = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        // Strip the data URL prefix to get raw base64
                        const base64 = result.split(",")[1];
                        resolve(base64);
                    };
                    reader.onerror = () => reject(new Error("Failed to read image"));
                    reader.readAsDataURL(image.file);
                });

                const processRes = await fetch("/api/process", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        imageBase64,
                        detection,
                        adjustedPoints: store.adjustedPoints,
                    }),
                });

                const processData = await processRes.json();

                if (!processData.success) {
                    const errorResp = processData as ApiErrorResponse;
                    store.setError(errorResp.error);
                    setIsLoading(false);
                    return;
                }

                const processed = (processData as { success: true; data: ProcessingResult }).data;
                const processedDataUrl = `data:image/png;base64,${processed.processedImageBase64}`;
                store.setProcessedImage(processedDataUrl);

                // Step 3: Background removal (client-side WASM)
                store.setProcessingStep("removing-bg");

                const finalDataUrl = await removeBackground(processedDataUrl, (progress) => {
                    // Update progress granularly during bg removal (80% → 100%)
                    const mappedProgress = 80 + progress * 20;
                    useAppStore.setState({
                        processingProgress: Math.round(mappedProgress),
                        stepMessage:
                            progress < 0.3
                                ? "Loading AI model..."
                                : progress < 0.7
                                    ? "Segmenting design..."
                                    : "Finalizing transparency...",
                    });
                });

                store.setFinalImage(finalDataUrl, processed.colorPalette);
            } catch (err) {
                const message = err instanceof Error ? err.message : "An unexpected error occurred";
                store.setError({
                    code: "GEMINI_ERROR",
                    message,
                    retryable: true,
                });
            } finally {
                setIsLoading(false);
            }
        },
        [store]
    );

    const retry = useCallback(() => {
        if (lastImage) {
            extract(lastImage);
        }
    }, [lastImage, extract]);

    return {
        extract,
        isLoading,
        progress: store.processingProgress,
        currentStep: store.processingStep,
        stepMessage: store.stepMessage,
        error: store.error?.message ?? null,
        retry,
    };
}
