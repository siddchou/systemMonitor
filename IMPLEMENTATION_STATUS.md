# Implementation Status

## 2026-08-15 — Phase 1 run: scope selection + exploration

**Chosen scope (of the four offered): #2 — Color-coded temp thresholds on readout + chart line.**
Rationale: most surgical option. No new dependencies (options 1/4 need electron-store), no IPC/main-process changes, and it maps directly onto existing components (`GPUCard`, `GPUChart`, `SummaryCard`).

**Exploration findings (13 files read):**
- Live dev flow: `npm run electron:dev` → Vite serves `src/index.html` → `/renderer.tsx` → IPC (`get-gpus`/`get-cpus`) handled in `src/main.ts` (nvidia-smi / PowerShell). Chart.js is loaded from CDN as `window.Chart`.
- `src/main.tsx` is a stale HTTP-fetch variant (used only by the `electron:dev:all` server path) — left untouched.
- GPU temp readouts today are hardcoded red (`GPUCard` badge + bar), chart line is a fixed `#ff6b6b`; `SummaryCard` "Max GPU Temp" uses its own magic thresholds (60/80). All will be driven by one shared constants module.
- **Pre-existing bug found:** `GPUChart`'s effect deps are `[color]` and `renderer.tsx` mutates history arrays in place (stable reference), so chart lines never update after mount. Minimal fix included (split create/destroy vs data-sync effects + immutable history updates) — required for the chart-line part of this feature to be observable.

**Plan:**
1. New `src/utils/tempThresholds.ts` — constants `TEMP_WARN_THRESHOLD_C = 70`, `TEMP_CRITICAL_THRESHOLD_C = 85`; level fn (green <70, amber 70–85 inclusive, red >85); static Tailwind class + hex maps (full literal strings so Tailwind JIT generates them).
2. `GPUCard.tsx` — badge, temp bar gradient, and chart line color driven by level.
3. `SummaryCard.tsx` — Max GPU Temp readout uses the shared constants instead of 60/80 magic numbers.
4. `GPUChart.tsx` + `renderer.tsx` — live-update fix described above.
5. `npm run build`, then commit scope-relevant files only.

## 2026-08-15 — Implementation complete, build green

**Changes (all renderer-side; IPC boundary untouched):**
- **NEW `src/utils/tempThresholds.ts`** — single source of truth: `TEMP_WARN_THRESHOLD_C = 70`, `TEMP_CRITICAL_THRESHOLD_C = 85`; `getTempLevel()` (green <70, amber 70–85 inclusive, red >85); `TEMP_LEVEL_STYLES` map with hex chart colors + literal Tailwind class strings for badge/bar/text.
- **`src/components/GPUCard.tsx`** — header temp pill and temperature bar gradient now use level-based classes (was hardcoded red); chart line color passed from the module instead of fixed `#ff6b6b`.
- **`src/components/SummaryCard.tsx`** — "Max GPU Temp" readout now uses the shared constants (replaced magic 60/80 ternary).
- **`src/components/GPUChart.tsx`** — split the single `[color]`-keyed effect into create/destroy (`[color]`) + data-sync (`[data, color]`). Fixes pre-existing frozen-chart bug: lines now update every poll and recolor when a threshold level is crossed.
- **`src/renderer.tsx`** — GPU/CPU history updates are now immutable (new array per poll) so the chart data-sync effect fires; same 30-sample window as before.

**Verification:** `npm run build` (tsc + vite build) passed on attempt 1/3.

## 2026-08-15 — Runtime smoke test passed, committed

Ran the real dev flow (`vite` + `electron .`, ~15s, auto-killed) with `ELECTRON_ENABLE_LOGGING=1` so renderer console output lands in the terminal. Machine has 2× RTX 3090, so live GPU cards rendered through the new threshold code for several 1s poll cycles:

- No renderer console errors (no React/Chart.js exceptions, no "Failed to load data").
- Only pre-existing noise: Electron CSP security warning (index.html has no CSP meta — unrelated to this change) and GPU disk-cache warnings.
- Visual color confirmation is left to a manual `npm run electron:dev` run (no screenshot access to the Electron window from here).

Committed scope-relevant files only: `src/utils/tempThresholds.ts`, `src/components/GPUCard.tsx`, `src/components/SummaryCard.tsx`, `src/components/GPUChart.tsx`, `src/renderer.tsx`, this file.

## 2026-08-15 — Phase 2 security fix: context isolation + preload bridge, committed

**Scope:** wire up the orphaned `src/preload.ts` and switch to `contextIsolation: true` / `nodeIntegration: false`.

**Changes:**
- **`src/preload.ts`** — rewritten as a sandboxed-preload CommonJS bridge exposing `getGPUs`, `getCPUs`, `clearDataCache` (all three channels main.ts registers) via `contextBridge.exposeInMainWorld('gpuMonitor', ...)`. Key gotcha: first attempt used ESM `import` because package.json has `"type": "module"` — smoke test failed with `SyntaxError: Cannot use import statement outside a module` from Electron's `sandbox_bundle`. Sandboxed preloads are **always loaded as CommonJS** regardless of the package type field, so it must stay `require('electron')`.
- **`src/main.ts`** — `webPreferences` now sets `preload: path.join(__dirname, 'preload.js')`, `contextIsolation: true`, `nodeIntegration: false`.
- **`src/renderer.tsx`** — removed `window.require('electron')` + direct `ipcRenderer.invoke`; data loading now goes through `window.gpuMonitor.getGPUs()` / `getCPUs()`.
- **`src/types/electron.d.ts`** — rewritten (old file was broken: referenced unimported `CPUData`, malformed top-level `NodeJS.ProcessEnv` in a module file). Now declares `Window.gpuMonitor` with the three methods typed against `GPUData`/`CPUData`.
- `@ts-nocheck` kept on renderer.tsx line 1: removing it surfaces two pre-existing TS2322 errors (GPUCard/CPUCard `key` prop) unrelated to this change — left as pre-existing per scope.
- No build-script changes needed: `tsconfig.electron.json` already compiles `src/preload.ts` → `dist/preload.js`.

**Verification:** `npm run build` (tsc + vite) green. Bounded `electron:dev` smoke test (~20s, `ELECTRON_ENABLE_LOGGING=1`): preload loads cleanly (no "Unable to load preload script"), zero renderer errors across ~20 one-second polls, and `nvidia-smi.exe` observed spawning during the run — live GPU/CPU data flowing through the new bridge. Only pre-existing dev-only CSP warning in the log.

**Environment note:** port 5173 was occupied by orphaned vite/electron processes from a prior session's smoke test (confirmed via process command lines before killing). Also learned `taskkill //T` on the npm `$!` PID can leave vite/esbuild behind — verify with netstat/tasklist after kill and clean up stragglers.

Committed scope-relevant files only: `src/preload.ts`, `src/main.ts`, `src/renderer.tsx`, `src/types/electron.d.ts`, this file.
