"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Move } from "lucide-react";
import type { DetectionResult, PerspectivePoints, GarmentImage } from "@/types";
import { cn } from "@/lib/utils";

interface SelectionOverlayProps {
    image: GarmentImage;
    detection: DetectionResult;
    onConfirm: (adjustedPoints: PerspectivePoints | null) => void;
    onRedetect: () => void;
}

export function SelectionOverlay({
    image,
    detection,
    onConfirm,
    onRedetect,
}: SelectionOverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [points, setPoints] = useState<PerspectivePoints>(detection.perspectivePoints);
    const [dragging, setDragging] = useState<number | null>(null);
    const [hasAdjusted, setHasAdjusted] = useState(false);

    // Reset points when detection changes
    useEffect(() => {
        setPoints(detection.perspectivePoints);
        setHasAdjusted(false);
    }, [detection]);

    const handlePointerDown = useCallback((index: number) => {
        setDragging(index);
    }, []);

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (dragging === null || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

            setPoints((prev) => {
                const updated = [...prev] as unknown as PerspectivePoints;
                updated[dragging] = [nx, ny];
                return updated;
            });
            setHasAdjusted(true);
        },
        [dragging]
    );

    const handlePointerUp = useCallback(() => {
        setDragging(null);
    }, []);

    // Keyboard navigation for corner handles (Arrow keys nudge by 1%)
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, idx: number) => {
            const step = 0.01;
            let dx = 0, dy = 0;
            switch (e.key) {
                case "ArrowLeft": dx = -step; break;
                case "ArrowRight": dx = step; break;
                case "ArrowUp": dy = -step; break;
                case "ArrowDown": dy = step; break;
                default: return;
            }
            e.preventDefault();
            setPoints((prev) => {
                const updated = [...prev] as unknown as PerspectivePoints;
                const [cx, cy] = updated[idx];
                updated[idx] = [
                    Math.max(0, Math.min(1, cx + dx)),
                    Math.max(0, Math.min(1, cy + dy)),
                ];
                return updated;
            });
            setHasAdjusted(true);
        },
        []
    );

    const confidencePercent = Math.round(detection.confidence * 100);

    // Build SVG polygon path from perspective points  
    const svgPath = points.map(([x, y]) => `${x * 100}%,${y * 100}%`).join(" ");

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-xl mx-auto rounded-2xl overflow-hidden border border-border bg-card"
        >
            {/* Image with overlay */}
            <div
                ref={containerRef}
                className="relative aspect-[4/3] w-full bg-muted cursor-crosshair touch-none"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={image.dataUrl}
                    alt="Garment with detected print region"
                    className="w-full h-full object-contain"
                />

                {/* Dim overlay outside selection */}
                <div className="absolute inset-0 bg-black/30 pointer-events-none" />

                {/* Selection polygon rendered as SVG overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <polygon
                        points={svgPath}
                        fill="transparent"
                        stroke="oklch(0.65 0.2 280)"
                        strokeWidth="2"
                        strokeDasharray="8 4"
                        className="animate-[dash_1s_linear_infinite]"
                    />
                </svg>

                {/* Draggable corner handles */}
                {points.map(([x, y], idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "absolute w-7 h-7 sm:w-5 sm:h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-lg cursor-grab active:cursor-grabbing transition-transform z-10 focus-ring",
                            dragging === idx && "scale-125 ring-2 ring-primary/50"
                        )}
                        style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                        onPointerDown={(e) => {
                            e.preventDefault();
                            handlePointerDown(idx);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        role="slider"
                        aria-label={`Corner ${idx + 1} handle. Drag or use arrow keys to adjust.`}
                        aria-valuetext={`${Math.round(x * 100)}%, ${Math.round(y * 100)}%`}
                        tabIndex={0}
                    >
                        <Move className="h-3 w-3 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                ))}

                {/* Confidence badge */}
                <Badge
                    className="absolute top-3 left-3"
                    variant={confidencePercent >= 70 ? "default" : "secondary"}
                >
                    {confidencePercent}% Confidence
                </Badge>

                {/* Print location badge */}
                <Badge className="absolute top-3 right-3 capitalize" variant="secondary">
                    {detection.printLocation}
                </Badge>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                    {hasAdjusted ? "Selection adjusted — ready to process" : "Drag corners to fine-tune selection"}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        id="redetect-btn"
                        variant="ghost"
                        size="sm"
                        onClick={onRedetect}
                        className="gap-1.5"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Re-detect
                    </Button>
                    <Button
                        id="confirm-selection-btn"
                        size="sm"
                        onClick={() => onConfirm(hasAdjusted ? points : null)}
                        className="gap-1.5"
                    >
                        <Check className="h-3.5 w-3.5" />
                        Confirm
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
