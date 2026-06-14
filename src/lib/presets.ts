/**
 * Bundled example presets: target shapes and filler silhouettes.
 *
 * Assets live under `src/assets/presets/` and are collected at build time via
 * `import.meta.glob`, so dropping a new PNG into those folders registers it
 * automatically — no manual list to maintain.
 */
export interface PresetItem {
  id: string;
  label: string;
  url: string;
}

/** Derive a readable label from an asset path (basename, no extension). */
function toLabel(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

function collect(globbed: Record<string, string>): PresetItem[] {
  return Object.entries(globbed)
    .map(([path, url]) => ({ id: path, label: toLabel(path), url }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

const shapeUrls = import.meta.glob('../assets/presets/shapes/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const fillerUrls = import.meta.glob('../assets/presets/fillers/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Example target shapes available as one-click presets. */
export const PRESET_SHAPES: PresetItem[] = collect(shapeUrls);

/** Example filler silhouettes available as a one-click set. */
export const PRESET_FILLERS: PresetItem[] = collect(fillerUrls);

/** A sensible default demo shape, falling back to the first available. */
export const DEFAULT_DEMO_SHAPE: PresetItem | undefined =
  PRESET_SHAPES.find((s) => /^circular$/i.test(s.label)) ??
  PRESET_SHAPES.find((s) => /circle|circular/i.test(s.label)) ??
  PRESET_SHAPES[0];
