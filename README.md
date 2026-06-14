# Artwork Form Filler

A browser-only tool that fills a **target shape** with many **source
silhouette images**, arranging them so every placed silhouette is complete
(never clipped), never overlaps another, never extends outside the target,
and the result does not look tiled. The composition renders to a canvas and
exports as a transparent PNG.

The mental model is **raster masks**: the target and every source are binary
pixel masks. Placement is a seed-driven search that tests a transformed
source mask for full containment in the target mask and non-collision with an
occupancy mask. It is *not* a vector nester or a tiling/pattern fill.

## Run it

Prerequisites: Node 18+ and npm.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
npm test         # run unit tests (Vitest)
```

## How to use

1. Upload a **target mask** — a black/white image, a transparent PNG, or a
   simple silhouette. The opaque (or dark) area is the allowed region. Use
   **Invert mask** if detection picks the wrong side.
2. Upload one or more **source silhouettes** — ideally transparent PNGs.
   Transparent pixels are ignored; each source is trimmed to its visible
   bounds.
3. Adjust the controls (density, size range, spacing, edge padding, angle
   and size variation, seed, attempts, reuse mode) and press **Generate**.
4. **Regenerate** repeats with the same settings, **Randomise seed** picks a
   new layout, and **Export PNG** saves the transparent result.

## Key modules

- `src/lib/mask.ts` — build binary/alpha masks, trim sources, erode/dilate.
- `src/lib/transform.ts` — rotate/scale a source mask; containment +
  collision tests.
- `src/lib/placement.ts` — the seedable, chunked placement algorithm
  (reuse and use-each-once modes).
- `src/lib/render.ts` — composite full-quality source images and export PNG.
- `src/components/App.tsx` — state, orchestration, chunked generation.

## Invariants (do not break)

- A placement is valid only if **every** visible source pixel is inside the
  target and **none** collide with the occupancy mask. Never relax these to
  fit more pieces.
- All containment/collision/trimming use the real visible (alpha) silhouette,
  never the rectangular image box.
- Generation is deterministic for a given seed + settings and runs chunked so
  the UI never freezes.

See `pm_skills/project/` for living project memory and `AGENTS.md`,
`UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md` for the permanent contracts.
