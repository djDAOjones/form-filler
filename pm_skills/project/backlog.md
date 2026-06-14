# Backlog

<!-- Generated during project initialization. Edit freely. -->
<!-- OPEN WORK ONLY. Status: [ ] todo  [~] in progress  [-] cut. -->
<!-- Shipped work does NOT stay here. On ship: add one line to
     trajectory.md (the outcome) + an entry to decision-log.md (the why),
     then remove the item from this file. There is no Completed section. -->
<!-- Hot sectional. Agents read the Active section only by default. -->
<!-- See AGENTS.md → "Memory size budgets" for limits; run
     roadmap-refactor.md when the queue drifts into dated rounds. -->

## Active

<!-- MVP shipped 2026-06-13 — see trajectory.md → "MVP". -->

### Current milestone

<!-- Presets + auto-load demo, high-res export, and auto-fit scaling shipped
     2026-06-14 — see trajectory.md → "Presets, high-res export & auto-fit". -->
<!-- Next batch is unscoped; pull from Next milestone / Icebox below. -->

### Next milestone

<!-- Seed-on-load + preview backdrop shipped 2026-06-14 — see trajectory.md
     → "Preview & seed UX". -->

- [ ] Generation Web Worker (perf follow-up #1) — move `generate()` off-thread so the UI never blocks regardless of job size (pass masks/geometry only, never the `HTMLImageElement`; cancel via `terminate()`; progress via `postMessage`; no-worker fallback). Commit or skip based on the Performance-pass numbers. Land before the source attempt cache so its savings run off-thread.
- [ ] Source attempt cache (perf follow-up #2) — reuse rasterised transforms across candidate positions (quantised by angle/scale) to cut per-attempt recompute; output-changing, so land after the Web Worker.
- [ ] Placement-resolution tuning (perf follow-up) — lower `PLACEMENT_MAX_DIM` (sweep 2026-06-14: 600≈−29%, 500≈−55%, 400≈−71%, ~quadratic); output-changing (packing precision, not export quality), needs a visual sign-off. Paused mid-comparison.

### Icebox

- [ ] Vector/SVG nesting and polygon-packing optimisation.
- [ ] Multiple targets / multi-region composition.
- [ ] Persisted projects (save/load settings + composition).
- [ ] Full undo/redo history.

<!-- Ticket grammar: quick items stay one line. Non-trivial or sign-off
     items add two lines so intent survives compression:
       - **ID Short title** [flags]
         Intent: the outcome wanted.
         Done when: the acceptance condition.
     Add optional Scope:/Risks: lines only for sign-off items. -->
