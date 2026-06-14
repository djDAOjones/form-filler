# File Map

<!-- Add entries as files are created. One line per file. -->
<!-- Format: path — role or responsibility -->
<!-- Update when files are created, renamed, or deleted. -->
<!-- Hot whole-file read. See AGENTS.md → "Memory size budgets" for limits. -->
<!-- Map roles, not history. Move batch notes and change history to decision-log.md. -->

## Entry point

- `index.html` — Vite HTML entry.
- `src/main.tsx` — mounts React into `#root`, imports global CSS.
- `src/vite-env.d.ts` — Vite client types (`import.meta.glob`, asset-URL modules).

## Core modules

- `src/lib/types.ts` — shared types (Mask, SourceItem, Placement, Settings, report) + `DEFAULT_SETTINGS` and tuneable constants.
- `src/lib/rng.ts` — seedable mulberry32 PRNG (`Rng`) + `randomSeed`.
- `src/lib/imageLoading.ts` — File → image → ImageData at capped resolution; loads target + source items (incl. `loadTargetFromUrl`/`loadSourceFromUrl` for bundled presets).
- `src/lib/presets.ts` — bundled example presets (shapes + fillers) collected from `src/assets/presets/` via `import.meta.glob`.
- `src/lib/mask.ts` — build target/source masks, trim to visible bounds, erode (edge padding), disk offsets (spacing).
- `src/lib/transform.ts` — rasterise scaled+rotated source mask (reusable scratch buffers; borrowed `xs`/`ys` valid until next call, read by `count`); containment + collision test (`canPlace`); occupancy stamping.
- `src/lib/placement.ts` — the chunked, seedable placement algorithm (reuse + use-each-once modes); returns placements + report.
- `src/lib/render.ts` — composite full-res sources to canvas at a given output size (preview vs export decoupled); `exportComposition` renders offscreen + downloads a transparent PNG.

## UI

- `src/components/App.tsx` — state owner + generation orchestration.
- `src/components/Uploaders.tsx` — target + source uploaders (drag/drop, click, keyboard), mask mode + invert.
- `src/components/Controls.tsx` — all generation settings.
- `src/components/CanvasStage.tsx` — preview canvas, toolbar, progress, empty states.
- `src/components/Report.tsx` — placement report banner.
- `src/components/icons.tsx` — inline SVG icons (no icon-library dependency).

## Styles and tokens

- `styles/tokens.css` — Carbon-style design tokens (`--aff-*`).
- `styles/app.css` — layout + component styles.
- `src/index.css` — imports the two stylesheets.

## Config and constants

- `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`.
- Tuneable algorithm values live in `src/lib/types.ts` (`DEFAULT_SETTINGS`, `*_MAX_DIM`, `PREVIEW_MAX_DIM`, `EXPORT_DIMS`).
- `src/assets/presets/{shapes,fillers}/` — bundled example PNGs (preset shapes + filler silhouettes).

## Tests

- `src/lib/__tests__/rng.test.ts` — RNG determinism + ranges.
- `src/lib/__tests__/mask.test.ts` — trim, alpha/dark detection, invert, erode.
- `src/lib/__tests__/transform.test.ts` — rasterise dims, containment, collision, spacing.
- `src/lib/__tests__/placement.test.ts` — `generate` determinism (both modes) + containment/overlap invariant + output-preservation snapshot.
- `src/lib/__tests__/placement.bench.ts` — seeded `generate` benchmarks (reuse + use-each-once); run via `npm run bench`.

## Build and tooling

- Vite + Vitest; `.editorconfig`, `.gitignore` in root.
