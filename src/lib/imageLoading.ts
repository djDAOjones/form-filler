/**
 * Image loading: File → HTMLImageElement → ImageData → masks.
 *
 * Target images are rasterised at placement resolution and kept as ImageData
 * so the mask can be rebuilt when the detection mode / invert toggle changes
 * without reloading the file. Sources are masked, trimmed to their visible
 * bounds, and keep the original image for full-quality rendering.
 */
import { buildSourceMask, countVisible, trimMask } from './mask';
import { PLACEMENT_MAX_DIM, SOURCE_MAX_DIM } from './types';
import type { SourceItem } from './types';

export interface TargetData {
  image: HTMLImageElement;
  url: string;
  naturalWidth: number;
  naturalHeight: number;
  /** Rasterised at placement resolution; the mask is derived from this. */
  imageData: ImageData;
  /** Conversion from target natural pixels to placement pixels. */
  placementScale: number;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

/** Load a File into an HTMLImageElement via an object URL. */
export function loadImage(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load image: ${file.name}`));
    };
    image.src = url;
  });
}

/** Draw an image into an offscreen canvas, scaled so its longest side ≤ maxDim. */
function drawToImageData(
  image: HTMLImageElement,
  maxDim: number,
): { imageData: ImageData; scale: number } {
  const nw = image.naturalWidth;
  const nh = image.naturalHeight;
  const scale = Math.min(maxDim / Math.max(nw, nh), 1);
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  return { imageData: ctx.getImageData(0, 0, w, h), scale };
}

/** Load a target mask image, rasterised at placement resolution. */
export async function loadTarget(file: File): Promise<TargetData> {
  const { image, url } = await loadImage(file);
  const { imageData, scale } = drawToImageData(image, PLACEMENT_MAX_DIM);
  return {
    image,
    url,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    imageData,
    placementScale: scale,
  };
}

/** Load a source silhouette: alpha mask, trimmed to visible bounds. */
export async function loadSource(file: File): Promise<SourceItem> {
  const { image, url } = await loadImage(file);
  const { imageData } = drawToImageData(image, SOURCE_MAX_DIM);
  const full = buildSourceMask(imageData);
  const { mask, trim } = trimMask(full);
  const area = countVisible(mask);
  return {
    id: newId(),
    name: file.name,
    url,
    image,
    mask,
    area,
    longSide: Math.max(mask.width, mask.height),
    trim,
  };
}

/** Fetch a bundled/static asset URL into a File so the standard loaders apply. */
async function urlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch preset image: ${name}`);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

/** Load a target shape from a bundled preset URL. */
export async function loadTargetFromUrl(url: string, name: string): Promise<TargetData> {
  return loadTarget(await urlToFile(url, name));
}

/** Load a source silhouette from a bundled preset URL. */
export async function loadSourceFromUrl(url: string, name: string): Promise<SourceItem> {
  return loadSource(await urlToFile(url, name));
}
