# Decision Log

<!-- Append new decisions at the top. Don't edit old entries. -->
<!-- Use this during the design phase of each task to record what you chose and why. -->
<!-- Hot sectional. Agents read the latest 10 entries by default. -->
<!-- Keep each entry tight: Decision / Rationale / Alternatives, not an essay.
     The live log is budgeted by WORDS as well as entry count (see AGENTS.md
     → "Memory size budgets"), so verbose entries trip a prune sooner. -->
<!-- This is the home of the WHY. The backlog/trajectory only point here;
     never paste an entry's prose into those files. -->
<!-- Append-only: when archiving, move entries verbatim. Never rewrite. -->

## 2026-06-14 — Presets, high-res export & auto-fit (feature milestone)

**Decision:** Three user-requested features. (1) Bundle example shapes
(targets) + filler silhouettes (sources) under `src/assets/presets/`,
collected via `import.meta.glob`; on first run with no content, auto-load a
default shape + the filler set (localStorage-guarded) and auto-generate so the
app opens on a finished example. (2) Decouple export from preview: the live
preview renders at `PREVIEW_MAX_DIM` (1400px); export renders offscreen at a
user-chosen size (`EXPORT_DIMS` 2048/3600/4800px, default 3600) via
`exportComposition`. (3) Add an `autoFit` toggle that sizes reuse-mode pieces
by one uniform area-budget scale `√(density·area / Σ area)` — the formula
use-each-once already uses — overriding Min/Max.

**Rationale:** The request's folder labels were swapped; contents confirmed
shapes = targets, fillers = sources. Export was target-native (floor 1200px),
too low for t-shirt print; export quality is independent of placement
resolution because render composites the originals. `autoFit` defaults false
and its false-path keeps the exact rng sequence, so the placement
determinism/snapshot tests are unchanged.

**Alternatives:** export size in `Settings` (rejected — not a generation input;
kept as separate App state); `public/` + hand-written manifest (rejected for
`import.meta.glob` auto-registration).

**Caveat:** export sharpness is capped by the filler PNGs' own resolution.

**Link:** trajectory.md → "Presets, high-res export & auto-fit".

## 2026-06-14 — Placement performance pass (allocation fix; tuning paused)

**Decision:** Cut `rasterizeTransformed`'s per-attempt cost by filling reusable
module-level scratch `Int32Array`s in a single pass and returning them with a
valid `count`, instead of growing `number[]`s and copying via `Int32Array.from`.
Output-preserving. Added a seeded benchmark (`npm run bench`) and a placement
determinism + containment/overlap + output-snapshot safety net, written and run
green BEFORE the change.

**Rationale:** Per-attempt allocation/GC dominated the hot loop. The scratch
buffers are allocation-free per attempt; all consumers (`canPlace`,
`stampOccupancy`, the placement loops) already iterate by `count`, never
`xs.length`, so nothing else changed. Result: reuse ~1.43×, use-each-once
~1.25× faster; snapshot identical; 25 tests green; build clean.

**Contract:** returned `xs`/`ys` are shared buffers — valid only until the next
`rasterizeTransformed` call, possibly longer than `count`. The placement loop
fully consumes each transform (no `await` while one is live), so this holds.

**Tuning paused:** a sweep showed `PLACEMENT_MAX_DIM` is the dominant lever
(600≈−29%, 500≈−55%, 400≈−71%, ~quadratic). It is output-changing (packing
precision, NOT export quality — render composites originals), so it needs a
visual sign-off; deferred to a follow-up.

**Alternatives:** exact-size `slice` per call (owned arrays, simpler contract
but still 2 allocs/attempt) — rejected for the zero-alloc scratch since
consumers honor `count`. Lowering `SOURCE_MAX_DIM` — rejected: transformed size
∝ target longest side, so it barely affects speed but cuts fidelity.

**Link:** trajectory.md → "Performance pass".

## 2026-06-13 — MVP foundation + first build (init-mvp)

**Decision:** Build the Artwork Form Filler MVP as a browser-only
React 18 + TypeScript + Vite SPA using a raster-mask/Canvas 2D approach.
Runtime deps limited to `react`/`react-dom`; UI is Carbon-style productive,
implemented in our own CSS tokens (`--aff-*`) with no UI-framework or
Carbon-package dependency. Vitest covers the pure geometry functions.

**Rationale:** The user specified the stack and a raster-first approach.
Masks (Uint8Array) make containment/collision exact and alpha-aware, are
cheap to test, and keep the algorithm readable. Placement runs on downscaled
masks (`PLACEMENT_MAX_DIM` 700, `SOURCE_MAX_DIM` 360) for speed while render
composites the original full-res images for quality. Generation is chunked
(batches + `setTimeout` yields) so the UI never freezes, and seeded
(mulberry32) so a seed + settings reproduce a layout.

**Key algorithm choices / assumptions:**

- Containment uses the target mask **eroded** by edge padding; spacing is
  applied by **dilating** committed pieces into the occupancy mask (disk
  offsets). A single `canPlace` pass tests bounds + target + occupancy.
- Target inside-region detection: `auto` = alpha if the image has
  transparency else dark-is-inside; plus `alpha`/`dark`/`light` modes and an
  Invert toggle.
- Reuse mode fills toward `density · targetArea`; use-each-once derives a base
  scale from `√(density·targetArea / Σ sourceArea)`, places largest-first, and
  shrinks the global scale (×0.88, up to 6 retries) until all fit, reporting
  "Placed X of N".
- The two "reuse" toggles are modelled as a single mutually-exclusive radio
  group (better UX than two conflicting toggles).
- Render is WYSIWYG with export: only silhouettes on a transparent canvas.

**Alternatives considered:**

- Vector/SVG nesting or polygon packing — rejected per brief (raster MVP first).
- Carbon npm package / Tailwind / shadcn — rejected for the minimal-dependency
  rule; Carbon language implemented in own CSS instead.
- Per-attempt re-dilation of the whole occupancy mask — rejected for cost;
  stamp dilated pieces once at commit time instead.

**Fix:** `rasterizeTransformed` subtracts a 1e-9 epsilon before `ceil` so
floating-point noise (90° rotation → 1.0000000000000002) doesn't inflate the
transformed bbox by a pixel. Caught by a regression test.

**Link:** trajectory.md → "MVP".
