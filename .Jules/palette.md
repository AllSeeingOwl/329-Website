## 2024-05-18 - Missing Disabled States on Form Buttons

**Learning:** Form submit buttons across the project are frequently disabled via JS during submission (`btn.disabled = true`), but lack a corresponding visual CSS `:disabled` state, leading to poor visual feedback for users.
**Action:** Always check for and add a `:disabled` CSS pseudo-class styling block (e.g. `cursor: not-allowed; background-color: #ccc;`) when a button's `disabled` attribute is toggled dynamically.

## 2026-04-23 - Replace :focus with :focus-visible for modal close button

**Learning:** Some custom UI elements (like modal close buttons) used `:focus` which causes an outline to appear when a mouse user clicks on them, resulting in unnecessary visual noise. Using `:focus-visible` is better because it only shows the focus indicator when navigating via keyboard (e.g., using Tab), preserving accessibility while improving the mouse user experience.
**Action:** When updating focus styles for interactive elements that are also frequently clicked by a mouse, prefer `:focus-visible` over `:focus`.

## 2024-04-25 - Missing Focus Visible Styles on MLTK Pages

**Learning:** Several static HTML pages featuring the "Glitch Effect" (like `404.html`, `mltk-privacy-policy.html`) had hover states for links and buttons, but lacked a distinct `:focus-visible` state for keyboard navigation. This made it difficult for keyboard users to track their focus.
**Action:** When creating retro-styled or custom interactive elements, always ensure a `a:focus-visible, button:focus-visible` style is defined (e.g., using a dashed outline matching the theme color) alongside any `:hover` effects to maintain keyboard accessibility.

## 2026-10-15 - Unscaled Numeric Range Sliders Lack ARIA Value Text

**Learning:** Custom UI sliders (like frequency scanners) often use raw integer ranges internally (e.g., `880` to `1080` for `88.0` to `108.0 MHz`). Screen readers announce raw numbers without context or formatting.
**Action:** Always provide `aria-valuetext` with formatted units (e.g. `104.9 MHz`) on `<input type="range">` elements and update `aria-valuetext` dynamically in JavaScript whenever the slider value changes.

## 2026-10-16 - Dynamically Injected Modals Require Explicit Dialog ARIA Roles and Focus Management

**Learning:** Dynamically created DOM overlays/dialogs in plain JS helper scripts often lack ARIA accessibility semantics (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) and keyboard escape handling (`Escape` key event listener), making them invisible or unusable for screen reader and keyboard-only users.
**Action:** Whenever generating dynamic dialog overlays in JS, always set `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, shift initial focus to the primary interactive element (e.g., close button), listen for `Escape` key events to close, and restore focus to the trigger element upon modal dismissal.
