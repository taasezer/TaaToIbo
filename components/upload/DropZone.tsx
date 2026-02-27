"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, ImageIcon, AlertCircle, FileImage } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateImageFile } from "@/lib/validators";
import type { GarmentImage } from "@/types";

interface DropZoneProps {
    onImageSelected: (image: GarmentImage) => void;
    disabled?: boolean;
}

export function DropZone({ onImageSelected, disabled = false }: DropZoneProps) {
    const [error, setError] = useState<string | null>(null);

    const processFile = useCallback(
        (file: File) => {
            setError(null);
            const validation = validateImageFile(file);
            if (!validation.valid) {
                setError(validation.error);
                return;
            }

            // Create object URL for preview and read dimensions
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const garmentImage: GarmentImage = {
                    file,
                    dataUrl: url,
                    width: img.width,
                    height: img.height,
                    mimeType: file.type as GarmentImage["mimeType"],
                    sizeBytes: file.size,
                };
                onImageSelected(garmentImage);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                setError("Failed to read image. Please try a different file.");
            };
            img.src = url;
        },
        [onImageSelected]
    );

    const onDrop = useCallback(
        (acceptedFiles: File[], rejections: FileRejection[]) => {
            if (rejections.length > 0) {
                setError("Invalid file. Please upload a JPEG, PNG, or WEBP image under 10MB.");
                return;
            }
            if (acceptedFiles.length > 0) {
                processFile(acceptedFiles[0]);
            }
        },
        [processFile]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"],
        },
        maxSize: 10 * 1024 * 1024,
        multiple: false,
        disabled,
        noClick: false,
        noKeyboard: false,
    });

    const handleTrySample = useCallback(async () => {
        setError(null);
        try {
            const response = await fetch("/samples/sample-tshirt-front.jpg");
            if (!response.ok) throw new Error("Sample not found");
            const blob = await response.blob();
            const file = new File([blob], "sample-tshirt-front.jpg", { type: "image/jpeg" });
            processFile(file);
        } catch {
            setError("Sample images not available.");
        }
    }, [processFile]);

    return (
        <div className="w-full max-w-xl mx-auto">
            <div
                {...getRootProps()}
                className={cn(
                    "relative flex flex-col items-center justify-center gap-4 p-8 sm:p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300",
                    isDragActive
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                role="button"
                tabIndex={0}
                aria-label="Upload garment image. Press Enter or Space to open file picker."
            >
                <input {...getInputProps()} id="file-upload" />

                <AnimatePresence mode="wait">
                    {isDragActive ? (
                        <motion.div
                            key="drag"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <ImageIcon className="h-8 w-8 text-primary animate-bounce" />
                            </div>
                            <p className="text-lg font-medium text-primary">Drop your image here</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-medium">
                                    Drop your garment image here
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    or click to browse — JPEG, PNG, WEBP up to 10MB
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Animated border particles on drag */}
                {isDragActive && (
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse" />
                    </div>
                )}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                    id="try-sample-btn"
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleTrySample();
                    }}
                    disabled={disabled}
                >
                    <FileImage className="h-4 w-4" />
                    Try a Sample
                </Button>
            </div>

            {/* Error display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-2 mt-3 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm"
                    >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
