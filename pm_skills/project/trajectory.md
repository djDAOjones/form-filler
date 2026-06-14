# Trajectory

<!-- Shipped-work narrative. The story of what changed over time, in chunks. -->
<!-- Warm tier. Agents do NOT auto-read this every task. Read it on demand:
     during roadmap-refactor.md, release.md, or when reconstructing what
     already shipped. See AGENTS.md -> "Before every task". -->
<!-- Compress on ship. One line per item: the outcome, not the implementation.
     The WHY lives in decision-log.md; the per-file roles live in file-map.md.
     Never paste a decision-log entry in here. A pointer is enough. -->
<!-- Keep every shipped ID individually greppable: start each line with the
     item ID. When one line covers a group of related sub-items, spell out
     each ID (e.g. WL-19a, WL-19b, ... WL-19h) rather than a range, so an
     ID-level reconcile can find them all. -->
<!-- Structure: newest phase/milestone at the top. Group items by the phase or
     milestone they belong to, with a one-line Outcome per phase. -->
<!-- Budget: see AGENTS.md -> "Memory size budgets". Over budget -> prune-memory.md
     moves the oldest phases to archive/trajectory/trajectory-NNNN-<range>.md and
     adds a row to archive/INDEX.md. Archives are append-only; never rewrite. -->

## Presets, high-res export & auto-fit (shipped 2026-06-14)

- FEAT-PRESETS — bundled example shapes + fillers under `src/assets/presets/` (`import.meta.glob`); sidebar preset pickers; first-run demo auto-loads + auto-generates (localStorage-guarded). Commit bbb7550.
- FEAT-EXPORT — export decoupled from preview: preview at `PREVIEW_MAX_DIM` (1400px), export rendered offscreen at a chosen size (2048/3600/4800px, default 3600) with a dimensions readout. Commit 2a0b21b.
- FEAT-AUTOFIT — "Auto-fit size" toggle sizes reuse-mode pieces by one uniform area-budget scale (matching use-each-once); hides Min/Max when on.

Outcome: app opens on a working example; t-shirt-ready high-res PNG export; one-click auto-sizing. 26 tests green, build clean. See decision-log 2026-06-14.

## Performance pass — placement allocation fix (shipped 2026-06-14)

- PERF-A — `rasterizeTransformed` fills reusable module scratch buffers (borrowed-buffer contract; consumers honor `count`) instead of per-attempt `number[]` + `Int32Array.from`; output-preserving, ~1.43×/1.25× faster (reuse / use-each-once). Added a seeded benchmark (`npm run bench`) + a placement determinism / containment-overlap / output-snapshot safety net. See decision-log 2026-06-14.

Outcome: ~30%/20% faster generation with zero output change; 25 tests green, build clean. Resolution tuning identified (`PLACEMENT_MAX_DIM` dominant) but paused pending visual sign-off.

## MVP — Raster form filler (shipped 2026-06-13)

- Foundation — brief, architecture, backlog, README; AGENTS/UI-STANDARDS/DEV-INFRASTRUCTURE populated; Vite+React+TS scaffold. See decision-log 2026-06-13.
- Core libs — rng, types, imageLoading, mask (build/trim/erode/disk), transform (rasterise + canPlace + stamp), placement (both modes, chunked), render (+ PNG export).
- UI — uploaders (target + sources), full control set, canvas preview, progress, placement report; Carbon-style CSS tokens, WCAG-AAA-tuned.
- Tests — Vitest safety net for RNG determinism, mask trim/detect/erode, and containment/collision/spacing (21 tests).

Outcome: upload a target shape + transparent PNG silhouettes, generate a non-overlapping, non-clipped, in-bounds composition (reuse or use-each-once with a placement report), preview on canvas, and export a transparent PNG. `npm run build` + `npm test` green.
