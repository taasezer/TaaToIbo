"use client";

import { useCallback } from "react";
import type { DownloadFormat } from "@/types";

/**
 * Generate a timestamped filename for downloads.
 */
function makeFilename(format: DownloadFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return `taatooibo-${timestamp}.${format}`;
}

/**
 * Trigger a browser download from a data URL.
 */
function triggerDownload(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Convert a transparent PNG data URL to a JPG with white background.
 */
async function convertToJpg(pngDataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            // Fill white background first
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw the transparent image on top
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
        img.onerror = () => reject(new Error("Failed to load image for JPG conversion"));
        img.src = pngDataUrl;
    });
}

/**
 * Wrap a PNG data URL into an SVG document (embedded raster in SVG wrapper).
 * For true vectorization, a library like potrace-wasm would be needed.
 */
async function convertToSvg(pngDataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${img.width}" height="${img.height}" viewBox="0 0 ${img.width} ${img.height}">
  <image width="${img.width}" height="${img.height}" xlink:href="${pngDataUrl}"/>
</svg>`;
            const blob = new Blob([svg], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            resolve(url);
        };
        img.onerror = () => reject(new Error("Failed to load image for SVG conversion"));
        img.src = pngDataUrl;
    });
}

interface UseDownloadReturn {
    downloadPNG: (dataUrl: string) => void;
    downloadJPG: (dataUrl: string) => Promise<void>;
    downloadSVG: (dataUrl: string) => Promise<void>;
    copyToClipboard: (dataUrl: string) => Promise<boolean>;
}

export function useDownload(): UseDownloadReturn {
    const downloadPNG = useCallback((dataUrl: string) => {
        triggerDownload(dataUrl, makeFilename("png"));
    }, []);

    const downloadJPG = useCallback(async (dataUrl: string) => {
        const jpgDataUrl = await convertToJpg(dataUrl);
        triggerDownload(jpgDataUrl, makeFilename("jpg"));
    }, []);

    const downloadSVG = useCallback(async (dataUrl: string) => {
        const svgUrl = await convertToSvg(dataUrl);
        triggerDownload(svgUrl, makeFilename("svg"));
        // Clean up the object URL after a short delay
        setTimeout(() => URL.revokeObjectURL(svgUrl), 1000);
    }, []);

    const copyToClipboard = useCallback(async (dataUrl: string): Promise<boolean> => {
        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob }),
            ]);
            return true;
        } catch {
            return false;
        }
    }, []);

    return { downloadPNG, downloadJPG, downloadSVG, copyToClipboard };
}
