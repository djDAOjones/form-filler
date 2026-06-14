# Project Brief

<!-- Hot whole-file read. See AGENTS.md → "Memory size budgets" for limits. -->

## What are we building?

**Artwork Form Filler** — a browser-only tool that fills a target shape
with multiple source silhouette images. The user uploads one target mask
(black/white, transparent PNG, or simple silhouette) and many source
silhouettes (ideally transparent PNGs). The app arranges the sources inside
the target shape so that every placed silhouette is complete (never
clipped), never overlaps another, never extends outside the target, and the
result does not look like a tiled pattern. The composition renders to canvas
and exports as a transparent PNG.

## Who is it for?

A single maker / designer doing artwork composition locally. No accounts,
no collaboration, no server — everything runs in the browser.

## Platform and deployment

Client-side single-page web app. React + Vite + TypeScript. Static build,
deployable to any static host. No backend.

## Core features (v1 / MVP)

- Upload one target mask and many source silhouettes.
- Alpha-aware masking: ignore transparent pixels, trim sources to visible
  bounds, place by real silhouette not bounding box.
- Raster placement algorithm with full target containment and non-overlap,
  configurable spacing and edge padding, seedable randomness.
- Two modes: "allow reuse of sources" (fill to a density target) and "use
  each source once" (auto base scale, shrink-retry, placement report).
- Render to canvas and export as transparent PNG.

## Constraints

- Raster-mask / canvas approach only for the MVP — no vector nesting, SVG
  packing, ML, or server rendering.
- Minimal runtime dependencies (react, react-dom only). Carbon-style
  productive UI implemented in our own CSS — no UI framework dependency.
- Must stay responsive: chunked generation with progress, never freeze the
  UI for long periods.

## Out of scope (for now)

Vector/SVG nesting, polygon-packing optimisation, machine learning,
server-side rendering, multiple simultaneous targets, full undo history
(Regenerate covers re-runs).

## Open questions

- Best default heuristic for detecting the target's inside region across
  black/white vs transparent inputs (resolved for MVP: auto-detect alpha,
  else dark = inside, plus an Invert toggle).
