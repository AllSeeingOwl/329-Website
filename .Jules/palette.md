## 2024-05-18 - Missing Disabled States on Form Buttons

**Learning:** Form submit buttons across the project are frequently disabled via JS during submission (`btn.disabled = true`), but lack a corresponding visual CSS `:disabled` state, leading to poor visual feedback for users.
**Action:** Always check for and add a `:disabled` CSS pseudo-class styling block (e.g. `cursor: not-allowed; background-color: #ccc;`) when a button's `disabled` attribute is toggled dynamically.

## 2026-04-23 - Replace :focus with :focus-visible for modal close button

**Learning:** Some custom UI elements (like modal close buttons) used `:focus` which causes an outline to appear when a mouse user clicks on them, resulting in unnecessary visual noise. Using `:focus-visible` is better because it only shows the focus indicator when navigating via keyboard (e.g., using Tab), preserving accessibility while improving the mouse user experience.
**Action:** When updating focus styles for interactive elements that are also frequently clicked by a mouse, prefer `:focus-visible` over `:focus`.

## 2024-04-25 - Missing Focus Visible Styles on MLTK Pages

**Learning:** Several static HTML pages featuring the "Glitch Effect" (like `404.html`, `mltk-privacy-policy.html`) had hover states for links and buttons, but lacked a distinct `:focus-visible` state for keyboard navigation. This made it difficult for keyboard users to track their focus.
**Action:** When creating retro-styled or custom interactive elements, always ensure a `a:focus-visible, button:focus-visible` style is defined (e.g., using a dashed outline matching the theme color) alongside any `:hover` effects to maintain keyboard accessibility.
