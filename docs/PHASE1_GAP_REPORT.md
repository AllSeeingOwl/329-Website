# Phase 1 (Zine Launch) — Gap Report

_Audit date: 2026-11-09. Scope: everything a player touches in **Phase 1: Zine Launch**, compared
against the Google Drive "Welcome To Unknown" canon. Later phases and unbuilt lore are listed at the
end only for context._

## Status update (2026-11-09, second pass)

Owner decisions: ZIP is a Phase 1 reward; radio MP3 is Phase 1.5; MailerLite account connected;
delivery method left to implementation; 4-digit Uncut Puzzle code still undecided.

| Item                                 | Status                                                                                                                                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 QR page dead end                  | **Fixed.** `/system-override` now asks for the serial, then the email, then routes to the data drop.                                                                                                                                                                       |
| B2 No email sent                     | **Code done, needs config.** Signups are copied to MailerLite once `MAILERLITE_API_KEY` and `MAILERLITE_GROUP_ID` are set on Render; the welcome automation still has to be built and switched on in MailerLite. Downloads no longer depend on email: they unlock on-site. |
| B3 Placeholder files                 | **Open** — waiting on final art.                                                                                                                                                                                                                                           |
| B4 Bypass codes in public JS         | **Fixed.** Client gate removed; held-back modules are refused server-side (admins can still preview while logged in).                                                                                                                                                      |
| B5 Ungated held-back pages           | **Fixed** by server-side enforcement (covers every listed module automatically).                                                                                                                                                                                           |
| B6 Password in public API            | **Fixed.** `/api/phases` no longer returns descriptions.                                                                                                                                                                                                                   |
| M1 ZIP phase                         | **Fixed.** Active from Phase 1; dashboard tile defaults to active.                                                                                                                                                                                                         |
| M2 MP3 phase                         | **Fixed in code** (held back in Phase 1, live from 1.5). The zine back cover still lists the MP3 — update the print copy.                                                                                                                                                  |
| M3 4-digit code                      | **Open** — needs a design decision.                                                                                                                                                                                                                                        |
| M4 `/press-twins-collusion`          | Open.                                                                                                                                                                                                                                                                      |
| M5 Solutions index                   | Open.                                                                                                                                                                                                                                                                      |
| M7 Velvet rope redirect              | **Fixed** target (now `/secure-data-drop-page`; redirect itself still switched off).                                                                                                                                                                                       |
| M8 Downloads visible before password | **Fixed.** Hidden until verified; files themselves are also server-gated.                                                                                                                                                                                                  |
| P1 Missing `/sw.js`                  | **Fixed** with a no-op service worker.                                                                                                                                                                                                                                     |

## 1. What Phase 1 is supposed to be (per Drive)

Sources: _The Game of Unknown Master Timeline Strategy_, _The Field (MINE) Guide_ (back cover +
"Master ARG & Digital Integration Audit"), _Design Briefs: Seedless Grapes Motel Blueprints & Uncut
Puzzle_, _Design Brief: Virtue Village Layouts_.

The intended player journey:

```
Physical zine (Vol. 0) ── back-cover QR ──▶ https://3minsto9.co.uk/system-override
   │                                          • 2.0 s polite 1950s tourism page, then glitch
   │                                          • asks for password 0408-1998-XXXX (Beatrix's card, p.3)
   │                                          • captures email ("comms link")
   ▼
"Unredacted digital cache" (back cover promises):
   • SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip (~18 MB)
   • UNCUT_PUZZLE.pdf (~6 MB: code-wheel printables + 26-Village Deduction Matrix)
   • 104_9_PIRATE_INTERCEPT.mp3 (~5 MB, Four Corners Radio)
   • Director Gretchen Meredith Executive Dossier (.txt)
   ▼
Automated welcome email (MailerLite) delivers the files; mailing list feeds Phase 1.5 drips.

MLTK surveillance dashboard (Timeline doc, Phase 1 row):
   ACTIVE  — Secure Data Drop, Project Tetromino doc, Storefront-offline notice
   LOCKED  — Ollie's Radio Scanner, Five Finger Wheel, NOVA archive / immigration exam
```

The Uncut Puzzle's page 4 is meant to produce a **4-digit code that unlocks Phase 1.5** on the terminal.

## 2. What already works

Verified locally (server started, every page loaded in headless Chromium, login flow exercised):

- All Phase 1 routes return 200: `/system-override`, `/mltk-login-gate`, `/mltk-surveillance-dashboard`,
  `/secure-data-drop-page`, `/mltk-classified-document`, `/mltk-privacy-policy`,
  `/104.9-global-directives`, `/arg-progress-dashboard`.
- Login gate accepts the zine serial and routes to the surveillance dashboard.
- Dashboard tiles show the right ACTIVE/LOCKED state for `phase1`, with rogue (Team Rabbit) styling on
  the Radio and Data Drop tiles — matching the Drive UX audit's recommendations.
- Email capture (`/api/emails/collect`) validates, rate-limits and stores addresses; admin can export CSV.
- `/api/verify` is server-side, timing-safe and rate limited.
- Unit tests 312/312 pass; typecheck clean; lint has 0 errors.

## 3. Blockers — fix before the zine ships

| #      | Problem                                                                                                                                                                                                                                   | Evidence                                                                                                       | Fix                                                                                                                                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | **The QR landing page is a dead end.** `/system-override` only asks for an email, has no password prompt, and after submit says "DATA PACKET DISPATCHED" — but nothing is sent and there is no link onward.                               | `public/system-override.html` (form `#hackedForm`, success message only)                                       | Add the password step (via `/api/verify`) and, on success, route to `/secure-data-drop-page` (or reveal downloads in place).                                                                                                    |
| **B2** | **No email is ever sent.** Addresses are stored in Redis only; there is no MailerLite (or any) integration, so the promised automated delivery and Phase 1.5 drips can't happen.                                                          | Only mention of MailerLite is a phase description string in `db.ts`                                            | Either (a) forward signups to MailerLite's API (needs an API key on Render) and build the welcome automation there, or (b) deliver files on-site after the password and treat email as list-building only. **Decision needed.** |
| **B3** | **All three download files are placeholders** (53–63 bytes; PDFs won't open).                                                                                                                                                             | `public/UNCUT_PUZZLE.pdf`, `VIRTUE_VILLAGE_LAYOUTS.pdf`, `SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip`                | Replace with final art from the commissions in Drive. Interim option: a ZIP built from the existing Seedless Grapes floor-plan press JPGs in Drive.                                                                             |
| **B4** | **Held-back content is unlockable by anyone.** `phase_gate_utils.js` hardcodes bypass codes `OVERRIDE` and `admin` (plus the zine password) in public JS, and `?preview=true` skips the gate entirely.                                    | `public/phase_gate_utils.js` `attemptBypass`, `checkPhaseModuleGate`                                           | Remove the hardcoded codes; verify bypasses server-side, or restrict preview to logged-in admins.                                                                                                                               |
| **B5** | **Three held-back pages have no gate at all** — `nova-parent-directory`, `mltk-virtue-village-index`, `mltk-customer-service` don't load the phase gate script, so they're fully open in Phase 1 to anyone who guesses or shares the URL. | Only `mltk-five-finger-wheel`, `nova-classified-archive`, `ollies-radio-scanner` include `phase_gate_utils.js` | Add the gate to every page listed in any `heldBackModules`; ideally enforce it in `server.ts` too.                                                                                                                              |
| **B6** | **Public API leaks the password.** `/api/phases` returns `"description": "Password: 0408-1998-XXXX"` to any visitor. The password is printed in the zine, so this mostly matters as a spoiler for people without the book.                | `db.ts` phase1 `description`; served by `/api/phases`                                                          | Move admin-only notes out of the public payload (strip `description` in the public endpoint).                                                                                                                                   |

## 4. Mismatches between Drive and the code

| #      | Drive says                                                                                                         | Code does                                                                                                                                           | Decision needed                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M1** | Seedless Grapes ZIP is a **Phase 1** reward (zine back cover + data-drop brief).                                   | `db.ts` holds it back until Phase 2; dashboard tile shows LOCKED — yet `/secure-data-drop-page` links it directly.                                  | Move ZIP into Phase 1 `activeModules`?                                                                                                                             |
| **M2** | Back cover promises `104_9_PIRATE_INTERCEPT.mp3` in the Phase 1 cache. Timeline doc puts radio audio in Phase 1.5. | No MP3 exists.                                                                                                                                      | Is the MP3 Phase 1 or 1.5? If 1.5, the back-cover copy should change before print.                                                                                 |
| **M3** | Uncut Puzzle p.4 yields a 4-digit code that unlocks Phase 1.5.                                                     | No input anywhere on the site accepts it.                                                                                                           | What should entering it do (unlock radio scanner tile? show a message?)                                                                                            |
| **M4** | Zine (Avery's readout) prints a hidden route `/press-twins-collusion`.                                             | 404.                                                                                                                                                | Build a small hidden page, or remove the route from the zine.                                                                                                      |
| **M5** | Zine audit: a "digital solutions index" revealing artist Red Herring signatures + credits.                         | Doesn't exist.                                                                                                                                      | Phase 1 or later?                                                                                                                                                  |
| **M6** | Phase 1 actives: Data Drop, Tetromino doc, storefront notice.                                                      | Code also activates Virtue Village Layouts PDF, Privacy Policy and 104.9 Global Directives.                                                         | Probably fine (the directives page is the Gretchen dossier the back cover promises). VVL PDF is a 32-page commission — keep active only once the real file exists. |
| **M7** | One QR landing page (`/system-override`).                                                                          | A second, overlapping landing page exists (`/velvet-rope-landing-page`); its redirect is switched off and points to `secure-drop.html`, which 404s. | Pick one; fix or remove the other.                                                                                                                                 |
| **M8** | Downloads appear after the password.                                                                               | On `/secure-data-drop-page` the download box is visible before the password is entered (the terminal is decorative).                                | Hide until verified?                                                                                                                                               |

## 5. Smaller fixes

- **P1** `public/app.js` registers `/sw.js`, which doesn't exist → a 404 and a console error on every page. Remove the registration or add a service worker.
- **P2** `/surface-home-page` requests `/images/placeholder.avif` → 404 (studio side).
- **P3** The surveillance dashboard is reachable without logging in (the login only redirects). Acceptable for an ARG, but worth knowing.

## 6. Suggested order of work

1. Decisions in §4 (M1, M2, M3, and the email approach in B2).
2. B1 + M8 — make the QR → password → cache journey work end-to-end, with a Playwright test.
3. B4 + B5 + B6 — close the leaks so Phase 1.5/2 content stays hidden.
4. B3 — drop in real files as they arrive from freelancers (tracked against the Drive briefs).
5. B2 — MailerLite hookup (or on-site delivery), then M4/M5 extras and P1/P2.

## 7. Outside Phase 1 (for later)

Drive lore with little or no site presence yet: UnKnNet (UKN Dossier), _Don't Get This Twisted_
(Clock Tower game show), St. Frankly O'Scary Church, MMMA & Subterranean Circuits, Current Thing
Exchange, Underworld Literature & Media, _Operation: Twin Archives_. Roadmap items in
`PROJECT_MANAGEMENT.md` not yet built: staff directory, incident reports, Team Rabbit safehouse,
lore timeline.

## Sources read

Read in full: Master Timeline Strategy; Design Briefs (SGM ZIP + Uncut Puzzle); Design Brief
(Virtue Village Layouts). _The Field (MINE) Guide_ (~190k characters) was **searched** for web
touchpoints (QR, URLs, passwords, file names, routes) rather than read cover to cover. Other Drive
documents were seen by title/snippet only.
