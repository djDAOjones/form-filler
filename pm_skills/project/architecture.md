# Architecture

<!-- Generated during project initialization. Review and edit as needed. -->
<!-- Update this file when major structural decisions change. -->
<!-- Hot whole-file read. See AGENTS.md → "Memory size budgets" for limits. -->
<!-- Describe current structure only. Move historical batch notes to decision-log.md. -->

## Tech stack

- **React 18 + TypeScript** — component UI with type safety for the
  pixel-level algorithm code.
- **Vite** — dev server and static production build; minimal config.
- **Canvas 2D API** — all masking, placement testing, rendering, and PNG
  export. No WebGL needed at MVP scale.
- **Vitest** — unit tests for the pure geometry/mask functions.
- No UI framework. Carbon-style productive UI is implemented in our own CSS
  with design tokens; icons are inlined SVG.

## Project structure

```text
src/
  lib/                  — framework-free core (pure, unit-testable)
    rng.ts              — seedable PRNG (mulberry32)
    types.ts            — shared types (Mask, Placement, Settings, …)
    imageLoading.ts     — File/URL → HTMLImageElement + ImageData
    mask.ts             — binary/alpha mask build, trim, erode/dilate
    transform.ts        — rotate/scale a source mask; containment + collision tests
    placement.ts        — the placement algorithm (both modes), chunked
    render.ts           — draw placements to canvas; export transparent PNG
  components/           — React UI
    App.tsx             — top-level state + orchestration
    Uploaders.tsx       — target + sources upload
    Controls.tsx        — all generation controls
    CanvasStage.tsx     — preview canvas + progress
    Report.tsx          — placement report
  main.tsx              — React entry
  index.css             — imports tokens + app styles
styles/
  tokens.css            — Carbon-style design tokens
  app.css               — layout + component styles
index.html              — Vite entry HTML
```

## Key modules

- **`lib/mask.ts`** — converts ImageData to a binary mask (Uint8Array +
  width/height/bounds); trims sources to visible alpha bounds; erodes target
  for edge padding and dilates occupancy for spacing.
- **`lib/transform.ts`** — produces a rotated+scaled raster of a source mask
  and tests (a) full containment in the target mask and (b) collision with
  the occupancy mask.
- **`lib/placement.ts`** — the seedable, chunked placement loop driving both
  reuse and use-each-once modes; returns placements + a report.
- **`lib/render.ts`** — composites placed source *images* (full quality) to
  an output canvas at export resolution and exports a transparent PNG.
- **`components/App.tsx`** — owns settings/state, runs generation off the UI
  thread via chunking, wires controls to the algorithm.

## Communication patterns

Direct imports (pure functions in `lib/`); React state lifted to `App.tsx`
and passed down via props. No event bus or global store — the app is small
and single-screen. Generation runs as an async, chunked routine that yields
to the event loop and reports progress via a callback.

## Dependency policy

- **Runtime deps:** `react`, `react-dom` only. Anything else needs explicit
  approval (see `AGENTS.md`).
- **Dev deps:** `vite`, `@vitejs/plugin-react`, `typescript`,
  `@types/react`, `@types/react-dom`, `vitest` — the build/test toolchain.

## Dev workflow

- Install: `npm install`
- Dev: `npm run dev` → `http://localhost:5173`
- Build: `npm run build` → output in `dist/`
- Preview build: `npm run preview`
- Test: `npm test` (Vitest)
