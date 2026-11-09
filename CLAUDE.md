# CLAUDE.md

Guidance for Claude Code (and any other coding agent) working in this repository.

## What this project is

The website for **3minsto9 Operations** (real studio, Wendover UK) and the **Unknown** ARG.
Source material — lore, puzzle specs, design briefs, broadcast scripts — lives in the owner's
Google Drive folder **"Welcome To Unknown"**. Treat Drive as the canon; the site implements it.

The site has two sides that must stay visually and tonally separate:

| Side                    | Voice                            | Pages (in `public/`)                                                                                                                                                                                                 |
| ----------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Studio** (real world) | Plain, professional              | `index`, `surface-home-page`, `studio-*`, `developer-blog`, `releases`, `business-*`                                                                                                                                 |
| **ARG** (in-universe)   | Diegetic, never breaks character | `system-override`, `velvet-rope-landing-page`, `mltk-*`, `104.9-global-directives`, `secure-data-drop-page`, `nova-*`, `ollies-radio-scanner`, `team-rabbit-hack`, `arg-progress-dashboard`, `in-universe-404-error` |

Inside the ARG, two layers coexist (the "Layer A / Layer B" rule from Drive):

- **Layer A — MLTK** (the corporate monolith): clean, rigid, green-terminal or sterile 1950s civic styling.
- **Layer B — Team Rabbit** (the vandals): red/pink, glitchy, "injected" modules. Rogue tiles on the
  surveillance dashboard use `isRogue: true`.

Never put out-of-character text (dev notes, "placeholder", TODOs) in visible ARG copy.

## Release phases (the most important system)

`db.ts` → `MLTK_PHASES` defines what is live. The admin panel (`/admin`) sets the active phase
(stored in Redis key `config:active_phase`, default `phase1`). Changing phase rewrites each
dashboard tile's `status` (`active`/`locked`) to match `activeModules` / `heldBackModules`.

- Current focus: **Phase 1 — Zine Launch**. See `docs/PHASE1_GAP_REPORT.md` for its state.
- The physical zine (_The Unknown Field (MINE) Guide, Vol. 0_) back-cover QR points to
  `https://3minsto9.co.uk/system-override`. The zine password is printed on Beatrix's card.
- Held-back pages are gated **client-side** by `public/phase_gate_utils.js`
  (`checkPhaseModuleGate`). The server still serves every file, so this is theatre, not security.
  Each held-back page must include the script itself — check when adding pages.

When adding an ARG module: add it to the right phase lists in `MLTK_PHASES`, add a dashboard tile in
`DEFAULT_DASHBOARD_CONFIG` if it should appear there, include the phase gate script if it can be
held back, and add it to the sitemap/maintenance file sets in `server.ts` if relevant.

## Architecture

- `server.ts` — Express app: security headers, maintenance/lockdown middleware, clean URLs
  (`.html` → 301 to extensionless), `/api/verify` (zine password, rate limited, timing-safe),
  `/api/emails/collect`, `/api/phases`, `/api/dashboard-config`, sitemaps, `llms.txt`.
- `db.ts` — config store (Upstash Redis with in-memory fallback + 2s cache), phases, dashboard tiles, emails.
- `src/routes/admin.ts`, `src/middleware/adminAuth.ts` — admin API (cookie auth + CSRF token).
- `public/` — static pages. Shared browser logic lives in `public/*_utils.js` using a UMD-style
  `if (typeof module !== 'undefined' && module.exports)` export so Jest can import it.
- `wiki_boilerplate/` — stripped-down template for other projects. **Not** part of the live site;
  don't edit it when changing the ARG.

## Commands

```bash
pnpm install          # if Cypress binary download fails offline: CYPRESS_INSTALL_BINARY=0 pnpm install
pnpm test             # Jest unit tests (root *.test.js and __tests__/)
pnpm run typecheck
pnpm run lint
pnpm run dev          # local server on :3000 (AUTH_PASSWORD optional outside production)
pnpm run test:e2e:playwright
```

Run `pnpm test && pnpm run typecheck && pnpm run lint` before committing. A husky pre-commit
hook runs formatting; CI auto-fixes Prettier/ESLint on push.

**Side effect:** the Jest suite (`__tests__/notebookSources.test.ts`) regenerates
`NOTEBOOK_SOURCES.md` and `public/llms-full.txt`. If you didn't intend to change those,
`git checkout NOTEBOOK_SOURCES.md public/llms-full.txt` before committing.

## Rules learned the hard way

Detailed history lives in `.jules/` (notes left by the previous agent — `bolt.md` performance,
`sentinel.md` security, `palette.md` accessibility). Read the relevant file before touching that area.
The essentials:

- **Security headers:** `server.test.js` asserts exact CSP/header strings. Change both together.
- **No secrets in client JS.** Passwords are checked server-side via `/api/verify`; never add a
  client-side fallback or hardcoded code.
- **Bound every in-memory map** (rate limits etc.) with O(1) eviction.
- **Sanitize CSV exports** (prefix `'` on cells starting with `= + - @ \t \r`).
- **All auth routes share the central rate limiter** in `adminAuth.ts`.
- **Accessibility:** `:focus-visible` styles on custom controls; dynamic dialogs need
  `role="dialog"`, `aria-modal`, focus management and Escape; success/error messages need
  `role="alert"`/`aria-live`; range sliders need `aria-valuetext`.
- **Performance:** use `requestAnimationFrame` (not tight `setInterval`) for typing/glitch effects;
  `IntersectionObserver` instead of scroll handlers.

## Git

- Work on the assigned feature branch; don't push to `main`.
- Commit messages: imperative, describe the change and why.
