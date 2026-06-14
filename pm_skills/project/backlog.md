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

- [ ] Bundled presets + auto-load demo — ship the example shapes (targets) + filler silhouettes as in-app presets under `src/assets/presets/`; preset pickers in the Target/Sources sections; on first launch with no content, auto-load a default shape + the filler set (localStorage guard) and run an initial generate so the app opens on a finished example.
- [ ] High-res export (t-shirt) — add an Export size selector decoupled from target-native size; render the live preview at ≤~1500px and render export to an offscreen canvas at the chosen size. Presets 2048/3600/4800 px (≈7"/12"/16" @300 DPI), default 3600. Export sharpness is capped by the filler PNGs' own resolution.
- [ ] Auto-fit scaling toggle — "Auto-fit size" overrides the manual min/max sliders with one global size `s = √(targetArea·density / Σ fillerArea)`: fits the provided images into the shape at the largest uniform size within the density budget (each-once fits them all; reuse repeats at that size to close gaps).

### Next milestone

- [ ] Random seed on app load — initialise the live seed to a fresh random value once per load (lazy `useState` in `App.tsx`); keep `DEFAULT_SETTINGS.seed` deterministic so defaults/tests stay pure. The other five seed behaviours the user specified (fixed-until-changed, Generate/Regenerate reuse, Randomise auto-generates once target+sources exist, manual edits don't auto-run) already match the code as of 2026-06-13.
- [ ] Preview polish — optional faint target backdrop behind the silhouettes (preview only, never exported) so the shape is visible before/after generation.
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
