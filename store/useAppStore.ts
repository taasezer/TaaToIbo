import { create } from "zustand";
import type {
    AppState,
    GarmentImage,
    DetectionResult,
    PerspectivePoints,
    ProcessingStepId,
    ApiError,
    AppStep,
} from "@/types";
import { PROCESSING_STEPS } from "@/types";

/** Derive the visible app step from the processing step */
function deriveAppStep(processingStep: ProcessingStepId): AppStep {
    switch (processingStep) {
        case "upload":
            return "upload";
        case "detecting":
        case "detected":
        case "processing":
        case "removing-bg":
            return "detect";
        case "complete":
            return "download";
        case "error":
            return "upload";
        default:
            return "upload";
    }
}

const initialState = {
    currentStep: "upload" as AppStep,
    image: null as GarmentImage | null,
    detection: null as DetectionResult | null,
    adjustedPoints: null as PerspectivePoints | null,
    processingStep: "upload" as ProcessingStepId,
    processingProgress: 0,
    stepMessage: PROCESSING_STEPS.upload.message,
    processedImageUrl: null as string | null,
    finalImageUrl: null as string | null,
    colorPalette: [] as string[],
    error: null as ApiError | null,
};

export const useAppStore = create<AppState>((set) => ({
    ...initialState,

    setImage: (image: GarmentImage) =>
        set({
            image,
            currentStep: "upload",
            processingStep: "upload",
            processingProgress: 0,
            stepMessage: "Image loaded",
            detection: null,
            adjustedPoints: null,
            processedImageUrl: null,
            finalImageUrl: null,
            colorPalette: [],
            error: null,
        }),

    setDetection: (detection: DetectionResult) =>
        set({
            detection,
            currentStep: "detect",
            processingStep: "detected",
            processingProgress: PROCESSING_STEPS.detected.progress,
            stepMessage: PROCESSING_STEPS.detected.message,
        }),

    setAdjustedPoints: (points: PerspectivePoints | null) =>
        set({ adjustedPoints: points }),

    setProcessingStep: (step: ProcessingStepId) =>
        set({
            processingStep: step,
            currentStep: deriveAppStep(step),
            processingProgress: PROCESSING_STEPS[step].progress,
            stepMessage: PROCESSING_STEPS[step].message,
        }),

    setProcessedImage: (url: string) =>
        set({ processedImageUrl: url }),

    setFinalImage: (url: string, palette: string[]) =>
        set({
            finalImageUrl: url,
            colorPalette: palette,
            currentStep: "download",
            processingStep: "complete",
            processingProgress: 100,
            stepMessage: PROCESSING_STEPS.complete.message,
        }),

    setError: (error: ApiError | null) =>
        set({
            error,
            processingStep: error ? "error" : "upload",
            currentStep: error ? "upload" : "upload",
            stepMessage: error ? error.message : PROCESSING_STEPS.upload.message,
        }),

    reset: () => set(initialState),
}));
