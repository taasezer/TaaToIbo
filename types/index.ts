// ============================================
// TaaToIbo — Core Type Definitions
// All TypeScript interfaces for the application
// ============================================

// --- Garment & Detection Types ---

export type GarmentType = "tshirt" | "hoodie" | "jacket" | "other";
export type PrintLocation = "front" | "back" | "sleeve" | "pocket";
export type FabricDistortion = "none" | "minimal" | "moderate" | "severe";
export type ExtractionApproach = "direct" | "perspective-correct" | "texture-remove";

export interface BoundingBox {
  /** Normalized X coordinate (0.0–1.0) */
  x: number;
  /** Normalized Y coordinate (0.0–1.0) */
  y: number;
  /** Normalized width (0.0–1.0) */
  width: number;
  /** Normalized height (0.0–1.0) */
  height: number;
}

/** Four corner points [x, y] normalized 0–1, ordered: TL, TR, BR, BL */
export type PerspectivePoints = [[number, number], [number, number], [number, number], [number, number]];

export interface DetectionResult {
  garmentType: GarmentType;
  printLocation: PrintLocation;
  boundingBox: BoundingBox;
  perspectivePoints: PerspectivePoints;
  confidence: number;
  printDescription: string;
  dominantColors: string[];
  fabricDistortion: FabricDistortion;
  extractionApproach: ExtractionApproach;
}

// --- Processing Types ---

export interface ProcessingResult {
  processedImageBase64: string;
  segmentationImageBase64: string;
  width: number;
  height: number;
  colorPalette: string[];
  processingTime: number;
}

export interface GarmentImage {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
}

// --- Processing Pipeline ---

export type ProcessingStepId =
  | "upload"
  | "detecting"
  | "detected"
  | "processing"
  | "removing-bg"
  | "complete"
  | "error";

export interface ProcessingStep {
  id: ProcessingStepId;
  label: string;
  message: string;
  progress: number;
}

export const PROCESSING_STEPS: Record<ProcessingStepId, ProcessingStep> = {
  upload: { id: "upload", label: "Upload", message: "Ready to upload", progress: 0 },
  detecting: { id: "detecting", label: "Detect", message: "Sending to Nano Banana Pro...", progress: 20 },
  detected: { id: "detected", label: "Detect", message: "Print region detected", progress: 40 },
  processing: { id: "processing", label: "Process", message: "Cropping and enhancing...", progress: 60 },
  "removing-bg": { id: "removing-bg", label: "Process", message: "Removing background...", progress: 80 },
  complete: { id: "complete", label: "Download", message: "Design extracted!", progress: 100 },
  error: { id: "error", label: "Error", message: "Something went wrong", progress: 0 },
};

// --- Download Types ---

export type DownloadFormat = "png" | "jpg" | "svg";

export interface DownloadOption {
  format: DownloadFormat;
  label: string;
  description: string;
  mimeType: string;
  extension: string;
}

export const DOWNLOAD_OPTIONS: DownloadOption[] = [
  { format: "png", label: "PNG", description: "Transparent background", mimeType: "image/png", extension: ".png" },
  { format: "jpg", label: "JPG", description: "White background", mimeType: "image/jpeg", extension: ".jpg" },
  { format: "svg", label: "SVG", description: "Vector traced", mimeType: "image/svg+xml", extension: ".svg" },
];

// --- API Types ---

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export type ApiErrorCode =
  | "INVALID_IMAGE"
  | "NO_PRINT_DETECTED"
  | "GEMINI_ERROR"
  | "RATE_LIMIT"
  | "FILE_TOO_LARGE"
  | "PROCESSING_ERROR"
  | "VALIDATION_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// --- Extract Endpoint Types ---

export interface ExtractOptions {
  sensitivity: number;
}

export interface ExtractResponseData extends DetectionResult {
  processingTime: number;
}

// --- Process Endpoint Types ---

export interface ProcessRequestBody {
  imageBase64: string;
  detection: DetectionResult;
  adjustedPoints?: PerspectivePoints;
}

// --- App State ---

export type AppStep = "upload" | "detect" | "download";

export interface AppState {
  // Current application step
  currentStep: AppStep;

  // Image state
  image: GarmentImage | null;

  // Detection state
  detection: DetectionResult | null;
  adjustedPoints: PerspectivePoints | null;

  // Processing state
  processingStep: ProcessingStepId;
  processingProgress: number;
  stepMessage: string;

  // Result state
  processedImageUrl: string | null;
  finalImageUrl: string | null;
  colorPalette: string[];

  // Error state
  error: ApiError | null;

  // Actions
  setImage: (image: GarmentImage) => void;
  setDetection: (detection: DetectionResult) => void;
  setAdjustedPoints: (points: PerspectivePoints | null) => void;
  setProcessingStep: (step: ProcessingStepId) => void;
  setProcessedImage: (url: string) => void;
  setFinalImage: (url: string, palette: string[]) => void;
  setError: (error: ApiError | null) => void;
  reset: () => void;
}
