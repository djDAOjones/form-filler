/**
 * Rendering and export.
 *
 * Placement maths runs on downscaled masks, but rendering composites the
 * ORIGINAL full-resolution source images (cropped to their visible bounds)
 * so the exported PNG is full quality. The output is silhouettes on a fully
 * transparent background — what you see is what you export.
 */
import { MIN_EXPORT_DIM } from './types';
import type { Placement, SourceItem } from './types';

export interface RenderParams {
  placements: Placement[];
  sources: SourceItem[];
  /** Placement-space (internal mask) dimensions. */
  placementWidth: number;
  placementHeight: number;
  /** Target natural dimensions — sets the export resolution. */
  targetWidth: number;
  targetHeight: number;
}

/** Compute the output canvas size from the target, with a minimum long side. */
function outputSize(p: RenderParams): { width: number; height: number; ratio: number } {
  const targetLong = Math.max(p.targetWidth, p.targetHeight);
  const outputLong = Math.max(targetLong, MIN_EXPORT_DIM);
  const placementLong = Math.max(p.placementWidth, p.placementHeight);
  const ratio = outputLong / placementLong; // placement-space → output-space
  return {
    width: Math.max(1, Math.round(p.placementWidth * ratio)),
    height: Math.max(1, Math.round(p.placementHeight * ratio)),
    ratio,
  };
}

/**
 * Draw the composition onto `canvas` (sized to the export resolution). The
 * background stays transparent; only the placed silhouettes are drawn.
 */
export function renderToCanvas(canvas: HTMLCanvasElement, params: RenderParams): void {
  const { width, height, ratio } = outputSize(params);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  for (const placement of params.placements) {
    const src = params.sources[placement.sourceIndex];
    if (!src) continue;
    const img = src.image;

    // Crop the original image to the source's visible bounds.
    const sx = src.trim.x * img.naturalWidth;
    const sy = src.trim.y * img.naturalHeight;
    const sw = src.trim.w * img.naturalWidth;
    const sh = src.trim.h * img.naturalHeight;

    // Output draw size: trimmed mask size × placement scale × output ratio.
    const dw = src.mask.width * placement.scale * ratio;
    const dh = src.mask.height * placement.scale * ratio;

    ctx.save();
    ctx.translate(placement.cx * ratio, placement.cy * ratio);
    ctx.rotate(placement.angle);
    ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
}

/** Export the canvas as a transparent PNG download. */
export function exportCanvasPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not export the image.'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
