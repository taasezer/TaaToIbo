"use client";

/**
 * Client-side background removal using @imgly/background-removal (WASM).
 * This module is dynamically imported to avoid SSR issues.
 */

type ProgressCallback = (progress: number) => void;

/**
 * Remove the background from an image data URL using WASM-based segmentation.
 * Returns a transparent PNG as a data URL.
 */
export async function removeBackground(
    dataUrl: string,
    onProgress?: ProgressCallback
): Promise<string> {
    // Dynamic import to keep this out of SSR
    const { removeBackground: imglyRemoveBackground } = await import(
        "@imgly/background-removal"
    );

    // Convert data URL to Blob for the library
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const resultBlob = await imglyRemoveBackground(blob, {
        model: "isnet",
        progress: (key: string, current: number, total: number) => {
            if (onProgress && total > 0) {
                onProgress(current / total);
            }
        },
    });

    // Convert result blob back to data URL
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("Failed to convert background removal result to data URL"));
            }
        };
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(resultBlob);
    });
}
