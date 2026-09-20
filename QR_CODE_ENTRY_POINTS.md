# QR Code Entry Points & ARG Integration Guide

## 1. Overview
This document serves as a comprehensive reference and strategy guide for utilizing QR codes across the **3 Mins to 9 ARG** repository. It details all suitable web pages, narrative contexts, password/phase gate requirements, and best practices for deploying **dynamic vs. static QR codes** across physical props, event signage, and puzzle materials in a **phased rollout**.

---

## 2. Dynamic vs. Static QR Codes Strategy

### A. Dynamic QR Codes (Recommended for Phase-Gated ARG Entry Points)
* **What they are**: QR codes encoding a dynamic short link or manageable redirect URL (e.g. `https://hlnks.co/65b5e789` as seen in `hovercode.png`, or a custom domain shortener like `https://arg.domain.com/r/mltk-gate`).
* **Why use them in this ARG**:
  1. **Phase-Gated Narrative Progression**: As ARG phases transition (via `/api/admin/phases`), a physical prop printed months in advance (e.g., a badge or sticker) can be dynamically redirected from a teaser or held-back gate (`/velvet-rope-landing-page.html`) to an active mission page (`/mltk-login-gate.html` or `/system-override.html`) without re-printing physical merchandise.
  2. **Emergency Fail-Safes & Hotfixes**: If a public web route changes or a page is placed under emergency lockdown (via `SystemConfig.emergencyLockdown`), dynamic QR codes allow instantly pointing traffic to a backup status page.
  3. **Scan Analytics & Player Tracking**: Enables tracking scan counts per physical location, prop type, or event day.
* **Best suited for**: Physical props, badges, flyers, live event signage, phase-evolving puzzles, and dead drops.

### B. Static QR Codes
* **What they are**: QR codes directly encoding the fixed destination URL (e.g. `https://allseeingowl.github.io/329-Website/System%20Override.html` as seen in `public/system_override_qr.png`).
* **When to use them**:
  1. **In-Universe Static Downloads**: Fixed media files, PDFs, or permanent archives that will never change URL (e.g., `UNCUT_PUZZLE.pdf`, `VIRTUE_VILLAGE_LAYOUTS.pdf`, or `SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip`).
  2. **Permanent Surface Portal Links**: Main entry points to the public studio site (`/` or `/surface-home-page.html`) on official, permanent promotional banners.
* **Best suited for**: Permanent downloadable assets, official company business cards, and fixed static documents.

---

## 3. Phased Rollout Roadmap (Preventing Over-Saturation)

Deploying dozens of QR codes at launch creates player confusion and dilutes the narrative mystery. Follow this 3-Phase Rollout Plan:

```
[ Phase 1: Launch Gateways ] ──> [ Phase 2: Deep Intrusion ] ──> [ Phase 3: Endgame Breach ]
   1-2 High-Impact Dynamic QRs      Targeted Prop QRs (3-4)        Static Archive & Final Override QRs
```

### Phase 1: Launch & Teaser Phase (Minimal Setup)
* **Focus**: Hook players with 1–2 high-impact QR codes. Do NOT over-saturate early props.
* **Recommended QR Codes**:
  1. **Primary Entry Point (Dynamic QR)**:
     - **Initial Target**: `/velvet-rope-landing-page.html` (Teaser / VIP Gatekeeper).
     - **Phase Transition**: When Phase 1 activates, update the dynamic QR redirect URL to `/mltk-login-gate.html` (where players use "Beatrix's Password" / serial code to gain access).
     - **Physical Prop**: Print on MLTK visitor passes, employee badges, or primary convention flyers.
  2. **Glitch / Infiltration Teaser (Dynamic QR)**:
     - **Initial Target**: `/in-universe-404-error.html` or `/surface-home-page.html`.
     - **Physical Prop**: Clandestine sticker hidden on municipal tourism flyers or posters.

### Phase 2: Mid-Game / Deep Intrusion Phase (Targeted Expansion)
* **Focus**: As players decode Beatrix's credentials and breach Layer A corporate systems, reveal 3–4 new QR codes tied to specific physical items.
* **Recommended QR Codes**:
  1. **Radio Scanner Receiver (Dynamic QR)**:
     - **Target**: `/ollies-radio-scanner.html`
     - **Physical Prop**: Print on ham radio frequency cheat sheets or audio cassette tapes.
  2. **Virtue Village Directory (Dynamic QR)**:
     - **Target**: `/mltk-virtue-village-index.html` (Gated by `checkPhaseModuleGate`).
     - **Physical Prop**: Print on real estate brochures or town maps.
  3. **Classified Document / Leaked Memo (Dynamic QR)**:
     - **Target**: `/mltk-classified-document.html`
     - **Physical Prop**: Stamped "RESTRICTED" paper dossier or Manila file folder.
  4. **Secure Data Exfiltration Drop (Dynamic QR)**:
     - **Target**: `/secure-data-drop-page.html`
     - **Physical Prop**: Underground operative business card or resistance flyer.

### Phase 3: Endgame / Total System Breach (Final Overrides & Static Archives)
* **Focus**: Maximum chaos and permanent archival downloads.
* **Recommended QR Codes**:
  1. **System Override / Infiltration Terminal (Static or Dynamic QR)**:
     - **Target**: `/system-override.html`
     - **Physical Prop**: Uses `public/system_override_qr.png` on glitched tourist board postcards or dead-drop USB drives.
  2. **NOVA Clandestine Archive (Dynamic QR)**:
     - **Target**: `/nova-classified-archive.html` / `/nova-parent-directory.html`
     - **Physical Prop**: Clandestine hacker graffiti or resistance posters (`/team-rabbit-hack.html`).
  3. **Permanent Blueprint Archives (Static QR Codes)**:
     - **Targets**: `/VIRTUE_VILLAGE_LAYOUTS.pdf`, `/SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip`, `/UNCUT_PUZZLE.pdf`
     - **Physical Prop**: Architectural blueprint stamps or physical puzzle boxes where URLs never change.

---

## 4. Catalog of Suitable Entry Points & Pages

### 1. Core MLTK Corporate & Intrusion Hubs

| Page / Route | Access Requirements | Recommended QR Type | Recommended Phase | Narrative Context & Prop Suggestions |
| :--- | :--- | :--- | :--- | :--- |
| **MLTK Login Gate**<br>`/mltk-login-gate.html` | Serial Code / Password (e.g., Beatrix's password) verified via `/api/verify` | **Dynamic QR** | **Phase 1** | **Corporate Access Terminal**: Print on MLTK employee ID badges, visitor lanyards, or corporate security notices. Upon success, redirects players to the Surveillance Dashboard. |
| **MLTK Surveillance Dashboard**<br>`/mltk-surveillance-dashboard.html` | Phase Gated (`checkPhaseModuleGate`) | **Dynamic QR** | **Phase 1 -> 2** | **Central Monitoring Station**: Features Layer A corporate tools and Layer B rogue/hacked backdoor modules. Ideal for hacker stickers applied on physical props or clandestine notes. |
| **MLTK Virtue Village Directory**<br>`/mltk-virtue-village-index.html` | Phase Gated (`checkPhaseModuleGate`) | **Dynamic QR** | **Phase 2** | **Community Index**: Print on "Virtue Village" town brochure props, real estate flyers, or local community newsletters. |
| **MLTK Five Finger Wheel & 3D Map**<br>`/mltk-five-finger-wheel.html`<br>`/mltk-3d-map.html` | Public / Phase Gated | **Dynamic / Static QR** | **Phase 2** | **Spatial & Visual Diagnostics**: Place on physical facility blueprints (`VIRTUE_VILLAGE_LAYOUTS.pdf`) or architectural site plans. |
| **MLTK Classified Document**<br>`/mltk-classified-document.html` | Public (Static ICE Bypass Status) | **Dynamic / Static QR** | **Phase 2** | **Internal Leaked Memo**: Print on redacted paper documents or classified Manila folder props with "RESTRICTED ACCESS" stamps. |

---

### 2. Underground Hacker Layer (NOVA & Team Rabbit)

| Page / Route | Access Requirements | Recommended QR Type | Recommended Phase | Narrative Context & Prop Suggestions |
| :--- | :--- | :--- | :--- | :--- |
| **System Override**<br>`/system-override.html` | Public (In-universe Glitch Terminal) | **Dynamic / Static QR** | **Phase 3** | **Infiltration Terminal**: Glitched tourist board page. Hide QR codes inside innocent-looking city tourism postcards or municipal transit flyers. *(Uses `public/system_override_qr.png`)*. |
| **NOVA Classified Archive**<br>`/nova-classified-archive.html` | Public (Decryption Utils) | **Dynamic QR** | **Phase 2 -> 3** | **Hacker Archive**: Contains clandestine logs, dossier files (`GRETCHEN_DOSSIER.txt`), and audio recordings. Slap QR codes on physical cassette tapes or hidden dead drop stickers. |
| **NOVA Parent Directory**<br>`/nova-parent-directory.html` | Public (Index Directory) | **Dynamic QR** | **Phase 3** | **FTP / Directory Listing**: Suitable for cryptic terminal prompts found in physical escape rooms or puzzle printouts. |
| **Team Rabbit Hack**<br>`/team-rabbit-hack.html` | Public | **Dynamic QR** | **Phase 3** | **Operative Channel**: Print on resistance movement flyers, underground posters, or street graffiti props. |
| **Secure Data Drop**<br>`/secure-data-drop-page.html` | Email Submission Form | **Dynamic QR** | **Phase 2** | **Exfiltration Drop Box**: Used for players to submit physical photo evidence or decoded passwords back to game runners. |

---

### 3. Interactive Puzzle Tools & Audio Receivers

| Page / Route | Access Requirements | Recommended QR Type | Recommended Phase | Narrative Context & Prop Suggestions |
| :--- | :--- | :--- | :--- | :--- |
| **Ollie's Radio Scanner**<br>`/ollies-radio-scanner.html` | Interactive Audio Frequency Tuner | **Dynamic QR** | **Phase 2** | **Signal Interceptor**: Print on physical ham radio props, frequency cheat sheets, or fake radio station bumper stickers. |
| **Velvet Rope Landing Page**<br>`/velvet-rope-landing-page.html` | Public / Teaser Gate | **Dynamic QR** | **Phase 1** | **VIP Gatekeeper**: Excellent for live ARG events, convention VIP wristbands, party invitations, or queue line signage. |

---

### 4. System & Public Surface Pages

| Page / Route | Access Requirements | Recommended QR Type | Recommended Phase | Narrative Context & Prop Suggestions |
| :--- | :--- | :--- | :--- | :--- |
| **In-Universe 404 Error**<br>`/in-universe-404-error.html` | Public (3500ms Delayed Vandalism Effect) | **Dynamic QR** | **Phase 1** | **Dead Link / Glitch Simulation**: Appears as a standard corporate error page before being hijacked by an underground breach. Great for "broken link" puzzles. |
| **Surface Studio Portal**<br>`/index.html`<br>`/surface-home-page.html` | Public | **Static QR** | **Permanent** | **Official Front Door**: Studio main page. Suitable for permanent corporate banners, developer press kits, and trade show displays. |

---

## 5. Testing & Technical Verification
All QR code target endpoints and static assets are verified automatically via automated test suites in `__tests__/qrCodeRoutes.test.ts`. This ensures:
1. Target HTML pages exist in `public/` and respond with `200 OK`.
2. Static QR image assets (such as `system_override_qr.png`) remain intact in the web root.
3. Phase gate scripts (`phase_gate_utils.js`) and login logic (`mltk_login_utils.js`) load without runtime syntax errors.
4. Phased rollout documentation and dynamic vs static strategies remain present in `QR_CODE_ENTRY_POINTS.md`.
