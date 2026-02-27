"use client";

import { motion } from "framer-motion";
import { X, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GarmentImage } from "@/types";

interface ImagePreviewProps {
    image: GarmentImage;
    garmentType?: string;
    onRemove: () => void;
}

export function ImagePreview({ image, garmentType, onRemove }: ImagePreviewProps) {
    const sizeMB = (image.sizeBytes / (1024 * 1024)).toFixed(1);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-xl mx-auto rounded-2xl overflow-hidden border border-border bg-card"
        >
            {/* Image */}
            <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={image.dataUrl}
                    alt="Uploaded garment"
                    className="w-full h-full object-contain"
                />

                {/* Garment type badge */}
                {garmentType && (
                    <Badge
                        className="absolute top-3 left-3 gap-1 capitalize"
                        variant="secondary"
                    >
                        <ImageIcon className="h-3 w-3" />
                        {garmentType}
                    </Badge>
                )}

                {/* Remove button */}
                <Button
                    id="remove-image-btn"
                    variant="secondary"
                    size="icon"
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={onRemove}
                    aria-label="Remove image"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* File info bar */}
            <div className="flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground bg-muted/30">
                <span className="truncate max-w-[200px]">{image.file.name}</span>
                <span className="shrink-0 ml-2">
                    {image.width}×{image.height} · {sizeMB} MB
                </span>
            </div>
        </motion.div>
    );
}
