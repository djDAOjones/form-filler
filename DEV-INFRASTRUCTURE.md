# Dev Infrastructure

<!-- NOTE: This file is a template. It contains CUSTOMISE placeholders
     that must be populated before it can serve as an authoritative reference.
     Complete the kickstart process (init.md Step 8) to fill them in.
     If this project has no build step, dev server, or package manager,
     this file can be removed from the boilerplate. -->

This file defines the permanent rules for how the project is built,
run, tested, versioned, and shipped. `AGENTS.md` references this file.
Read it before any task that involves the build system, dev server,
scripts, configuration, or deployment.

---

## Package management

Package manager: **npm** (`package.json` + `package-lock.json` in root).

- **Runtime dependencies:** `react`, `react-dom` only. Adding any other
  runtime dependency requires explicit approval.
- **Dev dependencies:** `vite`, `@vitejs/plugin-react`, `typescript`,
  `@types/react`, `@types/react-dom`, `vitest` — the build/test toolchain.
- Run `npm install` after cloning. Do not commit `node_modules/`.

---

## Canonical scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Dev server with hot reload |
| `build` | `tsc && vite build` | Type-check + production build to `dist/` |
| `preview` | `vite preview` | Serve the production build locally |
| `test` | `vitest run` | Run unit tests once |
| `test:watch` | `vitest` | Tests in watch mode |

Do not add scripts without updating this table.

---

## Dev server

- **URL:** `http://localhost:5173`
- **Start:** `npm run dev`
- **Serves:** the app from source via Vite with hot module replacement.

All development and testing use this URL. Do not hard-code alternative ports.

---

## Build system

- **Bundler:** Vite (Rollup under the hood).
- **Entry point:** `index.html` → `src/main.tsx`.
- **Output directory:** `dist/` (read-only — never hand-edit; overwritten on
  every build).
- **Format:** ESM, browser target per Vite defaults.
- **Static files:** anything in `public/` is copied verbatim to `dist/`.

---

## Version management

Single source: the `version` field in `package.json`. Bump manually using
semver when shipping a meaningful change. No automated version stamping at
MVP.

---

## Deployment

Static host. `npm run build` produces `dist/`; deploy its contents to any
static file host (Netlify, GitHub Pages, etc.). No backend, no environment
variables required.

---

## Utility scripts

None beyond the canonical scripts above.

---

## Configuration strategy

- **Algorithm defaults / tuneable constants:** `src/lib/types.ts`
  (`DEFAULT_SETTINGS`) and `src/lib/placement.ts`.
- **Design tokens:** `styles/tokens.css` (Carbon-style colour, spacing,
  typography custom properties).
- **Layout / component styles:** `styles/app.css`.

Do not scatter tuneable constants across component files.

---

## Editor config

The project root contains `.editorconfig` (copied from
`pm_skills/scaffold/`) for mechanical style enforcement: UTF-8, LF line
endings, 2-space indentation, trailing whitespace trimmed.

---

## Files agents must not hand-edit

- `dist/` — Vite build output, overwritten on every build.
- `node_modules/` — managed by npm.
- `package-lock.json` — managed by npm; commit it but do not hand-edit.
