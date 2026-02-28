import sharp from "sharp";
import type { BoundingBox, PerspectivePoints } from "@/types";

/**
 * Crop a region from the image buffer based on normalized bounding box coordinates.
 */
export async function cropRegion(
    buffer: Buffer,
    boundingBox: BoundingBox,
    imgWidth: number,
    imgHeight: number
): Promise<Buffer> {
    const left = Math.round(boundingBox.x * imgWidth);
    const top = Math.round(boundingBox.y * imgHeight);
    const width = Math.round(boundingBox.width * imgWidth);
    const height = Math.round(boundingBox.height * imgHeight);

    // Clamp values to image bounds
    const clampedLeft = Math.max(0, Math.min(left, imgWidth - 1));
    const clampedTop = Math.max(0, Math.min(top, imgHeight - 1));
    const clampedWidth = Math.min(width, imgWidth - clampedLeft);
    const clampedHeight = Math.min(height, imgHeight - clampedTop);

    return sharp(buffer)
        .extract({ left: clampedLeft, top: clampedTop, width: clampedWidth, height: clampedHeight })
        .toBuffer();
}

/**
 * Apply perspective correction using affine transform.
 * Sharp does not have native perspective transform, so we use affine approximation.
 * The perspectivePoints are normalized [0-1] corner coords: TL, TR, BR, BL.
 */
export async function applyPerspectiveCorrection(
    buffer: Buffer,
    points: PerspectivePoints,
    imgWidth: number,
    imgHeight: number
): Promise<Buffer> {
    // Convert normalized points to pixel coordinates
    const [tl, tr, br, bl] = points.map(([px, py]) => [
        Math.round(px * imgWidth),
        Math.round(py * imgHeight),
    ]);

    // Calculate output dimensions from the perspective quad
    const topWidth = Math.sqrt(Math.pow(tr[0] - tl[0], 2) + Math.pow(tr[1] - tl[1], 2));
    const bottomWidth = Math.sqrt(Math.pow(br[0] - bl[0], 2) + Math.pow(br[1] - bl[1], 2));
    const leftHeight = Math.sqrt(Math.pow(bl[0] - tl[0], 2) + Math.pow(bl[1] - tl[1], 2));
    const rightHeight = Math.sqrt(Math.pow(br[0] - tr[0], 2) + Math.pow(br[1] - tr[1], 2));

    const outputWidth = Math.round(Math.max(topWidth, bottomWidth));
    const outputHeight = Math.round(Math.max(leftHeight, rightHeight));

    // Extract the bounding box region first, then use Sharp's affine for minor correction.
    // For severe perspective, we extract the tight bounding region.
    const minX = Math.min(tl[0], bl[0]);
    const minY = Math.min(tl[1], tr[1]);
    const maxX = Math.max(tr[0], br[0]);
    const maxY = Math.max(bl[1], br[1]);

    const extractLeft = Math.max(0, minX);
    const extractTop = Math.max(0, minY);
    const extractWidth = Math.min(maxX - minX, imgWidth - extractLeft);
    const extractHeight = Math.min(maxY - minY, imgHeight - extractTop);

    if (extractWidth <= 0 || extractHeight <= 0) {
        return buffer;
    }

    const extracted = await sharp(buffer)
        .extract({
            left: extractLeft,
            top: extractTop,
            width: extractWidth,
            height: extractHeight,
        })
        .resize(outputWidth, outputHeight, { fit: "fill" })
        .toBuffer();

    return extracted;
}

/**
 * Enhance the extracted design for maximum visual appeal (pop, contrast, sharpness).
 */
export async function enhanceDesign(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
        // Advanced unsharp mask for crisp details
        .sharpen({ sigma: 1.5, m1: 2.0, m2: 0.5 })
        // Apply a slight S-curve contrast boost and brightness
        .linear(1.05, -2)
        // Boost saturation for vibrant colors
        .modulate({
            saturation: 1.2,
            brightness: 1.0
        })
        .png({ quality: 100 })
        .toBuffer();
}

/**
 * Creates a severely brightened and de-contrasted copy of the image specifically 
 * for the AI background segmentation model. This prevents the model from thinking 
 * that solid black colors (like Mickey Mouse's body) are empty background shadows.
 */
export async function prepareForSegmentation(buffer: Buffer): Promise<string> {
    return sharp(buffer)
        // Aggressively lift shadows and midtones to turn blacks into distinct greys
        .gamma(2.5) // Gamma correction > 1 lightens midtones significantly
        .linear(1.3, +40) // Boost multiplier and dramatically raise the noise floor (black point)
        .png({ quality: 80 })
        // Return base64 for the payload
        .toBuffer()
        .then((b) => b.toString("base64"));
}

/**
 * Extract the top N dominant colors as hex codes using pixel sampling.
 */
export async function extractColorPalette(
    buffer: Buffer,
    topN: number = 5
): Promise<string[]> {
    // Resize to small thumbnail for fast sampling
    const { data, info } = await sharp(buffer)
        .resize(64, 64, { fit: "cover" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Count color occurrences by quantizing to 4-bit per channel
    const colorCounts = new Map<string, number>();
    const pixelCount = info.width * info.height;

    for (let i = 0; i < pixelCount * 3; i += 3) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Quantize to reduce unique colors (group by 16-value bands)
        const qr = Math.round(r / 16) * 16;
        const qg = Math.round(g / 16) * 16;
        const qb = Math.round(b / 16) * 16;

        const hex = `#${qr.toString(16).padStart(2, "0")}${qg.toString(16).padStart(2, "0")}${qb.toString(16).padStart(2, "0")}`;
        colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }

    // Sort by count descending, return top N
    return Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([hex]) => hex);
}
