"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Palette, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ResultPanelProps {
    imageUrl: string;
    colorPalette: string[];
    width?: number;
    height?: number;
}

export function ResultPanel({ imageUrl, colorPalette, width, height }: ResultPanelProps) {
    const [copiedColor, setCopiedColor] = useState<string | null>(null);
    const [fullscreen, setFullscreen] = useState(false);

    // Escape key closes fullscreen
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") setFullscreen(false);
    }, []);

    useEffect(() => {
        if (!fullscreen) return;
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [fullscreen, handleEscape]);

    const handleCopyColor = async (hex: string) => {
        try {
            await navigator.clipboard.writeText(hex);
            setCopiedColor(hex);
            setTimeout(() => setCopiedColor(null), 1500);
        } catch {
            // Clipboard API not available
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            {/* Extracted design preview */}
            <div className="relative rounded-2xl overflow-hidden border border-border">
                <div
                    className={cn(
                        "relative aspect-square checkerboard flex items-center justify-center p-4",
                        fullscreen && "fixed inset-0 z-50 aspect-auto bg-background/95 backdrop-blur-sm"
                    )}
                    onClick={() => fullscreen && setFullscreen(false)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Extracted design on transparent background"
                        className={cn(
                            "max-w-full max-h-full object-contain",
                            fullscreen ? "max-h-[90vh]" : ""
                        )}
                    />
                    {!fullscreen && (
                        <button
                            onClick={() => setFullscreen(true)}
                            className="absolute top-3 right-3 p-2 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                            aria-label="View fullscreen"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Resolution bar */}
                {width && height && (
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 text-xs text-muted-foreground border-t border-border">
                        <span>Extracted Design</span>
                        <span>{width} × {height} px</span>
                    </div>
                )}
            </div>

            {/* Color palette */}
            {colorPalette.length > 0 && (
                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Color Palette</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {colorPalette.map((hex) => (
                            <Tooltip key={hex}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => handleCopyColor(hex)}
                                        className="group relative flex flex-col items-center gap-1 focus-ring rounded-lg p-1.5 hover:bg-muted transition-colors"
                                        role="button"
                                        aria-label={`Copy hex code ${hex}`}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-lg border border-border shadow-sm transition-transform group-hover:scale-110"
                                            style={{ backgroundColor: hex }}
                                        />
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                            {copiedColor === hex ? (
                                                <span className="flex items-center gap-0.5 text-primary">
                                                    <Check className="h-2.5 w-2.5" />
                                                    Copied
                                                </span>
                                            ) : (
                                                hex.toUpperCase()
                                            )}
                                        </span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Click to copy {hex}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
