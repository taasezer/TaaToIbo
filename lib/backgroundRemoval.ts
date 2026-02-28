"use client";

/**
 * Client-side background removal using @imgly/background-removal (WASM).
 * This module is dynamically imported to avoid SSR issues.
 */

type ProgressCallback = (progress: number) => void;

/**
 * Remove the background from an image data URL using WASM-based segmentation.
 * Extracts the alpha mask from the AI generated foreground and applies it to the 
 * purely original RGB pixels, explicitly preventing any color bleeding or destruction 
 * of inner dark pixels (like Mickey Mouse's body).
 * Returns a transparent PNG as a data URL.
 */
export async function removeBackground(
    originalDataUrl: string,
    segmentationDataUrl: string,
    onProgress?: ProgressCallback
): Promise<string> {
    // Dynamic import to keep this out of SSR
    const { removeBackground: imglyRemoveBackground } = await import(
        "@imgly/background-removal"
    );

    // Convert segmentation data URL to Blob for the library
    const response = await fetch(segmentationDataUrl);
    const blob = await response.blob();

    // 1. Run inference using 'isnet'. We extract the standard 'foreground' to get the processed alpha mask.
    const resultBlob = await imglyRemoveBackground(blob, {
        model: "isnet",
        progress: (key: string, current: number, total: number) => {
            if (onProgress && total > 0) {
                onProgress(current / total);
            }
        },
    });

    // 2. Graft the Alpha channel from the WASM result onto the pristine original image.
    return new Promise<string>((resolve, reject) => {
        const originalImg = new Image();
        const segmentedImg = new Image();
        let loaded = 0;

        const checkReady = () => {
            loaded++;
            if (loaded !== 2) return;

            try {
                const canvas = document.createElement("canvas");
                const width = originalImg.width;
                const height = originalImg.height;
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                if (!ctx) {
                    throw new Error("Could not get 2d context for masking");
                }

                // Draw and extract precise RGB from original
                ctx.drawImage(originalImg, 0, 0, width, height);
                const originalData = ctx.getImageData(0, 0, width, height);

                // Draw and extract precise Alpha from the segmented result
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(segmentedImg, 0, 0, width, height);
                const segmentedData = ctx.getImageData(0, 0, width, height);

                // Transplant the alpha channel
                for (let i = 0; i < originalData.data.length; i += 4) {
                    originalData.data[i + 3] = segmentedData.data[i + 3]; // graft Alpha
                }

                // Place the pristine RGB + AI Alpha back on the canvas
                ctx.putImageData(originalData, 0, 0);

                const finalDataUrl = canvas.toDataURL("image/png");
                resolve(finalDataUrl);

                // Cleanup
                URL.revokeObjectURL(segmentedImg.src);
            } catch (err) {
                reject(err);
            }
        };

        originalImg.onload = checkReady;
        segmentedImg.onload = checkReady;

        originalImg.onerror = () => reject(new Error("Failed to load original image for masking"));
        segmentedImg.onerror = () => reject(new Error("Failed to load AI segmented mask"));

        originalImg.src = originalDataUrl;
        segmentedImg.src = URL.createObjectURL(resultBlob);
    });
}
