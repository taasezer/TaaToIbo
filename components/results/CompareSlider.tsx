"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CompareSliderProps {
    beforeSrc: string;
    afterSrc: string;
    beforeLabel?: string;
    afterLabel?: string;
}

export function CompareSlider({
    beforeSrc,
    afterSrc,
    beforeLabel = "Original",
    afterLabel = "Extracted",
}: CompareSliderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);

    const updatePosition = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
        setPosition(percent);
    }, []);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault();
            setIsDragging(true);
            updatePosition(e.clientX);
        },
        [updatePosition]
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!isDragging) return;
            updatePosition(e.clientX);
        },
        [isDragging, updatePosition]
    );

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Keyboard control (Left/Right arrow keys)
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            setPosition((p) => Math.max(5, p - 2));
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setPosition((p) => Math.min(95, p + 2));
        }
    }, []);

    // Handle global pointer up
    useEffect(() => {
        if (!isDragging) return;
        const handleUp = () => setIsDragging(false);
        window.addEventListener("pointerup", handleUp);
        return () => window.removeEventListener("pointerup", handleUp);
    }, [isDragging]);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-border cursor-ew-resize touch-none select-none focus-ring"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown}
            role="slider"
            aria-label="Compare slider — use Left and Right arrow keys to adjust"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            tabIndex={0}
        >
            {/* After image (full, background) */}
            <div className="absolute inset-0 checkerboard">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={afterSrc}
                    alt={afterLabel}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Before image (clipped) */}
            <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
                <div className="absolute inset-0 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={beforeSrc}
                        alt={beforeLabel}
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Divider line */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                style={{ left: `${position}%` }}
            >
                {/* Handle circle */}
                <div
                    className={cn(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center transition-transform",
                        isDragging && "scale-110"
                    )}
                >
                    <div className="flex items-center gap-0.5">
                        <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                        <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Labels */}
            <div className="absolute bottom-3 left-3 pointer-events-none">
                <span className="px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                    {beforeLabel}
                </span>
            </div>
            <div className="absolute bottom-3 right-3 pointer-events-none">
                <span className="px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                    {afterLabel}
                </span>
            </div>
        </motion.div>
    );
}
