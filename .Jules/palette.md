## 2024-05-18 - Missing Disabled States on Form Buttons

**Learning:** Form submit buttons across the project are frequently disabled via JS during submission (`btn.disabled = true`), but lack a corresponding visual CSS `:disabled` state, leading to poor visual feedback for users.
**Action:** Always check for and add a `:disabled` CSS pseudo-class styling block (e.g. `cursor: not-allowed; background-color: #ccc;`) when a button's `disabled` attribute is toggled dynamically.
## 2026-04-23 - Replace :focus with :focus-visible for modal close button
**Learning:** Some custom UI elements (like modal close buttons) used `:focus` which causes an outline to appear when a mouse user clicks on them, resulting in unnecessary visual noise. Using `:focus-visible` is better because it only shows the focus indicator when navigating via keyboard (e.g., using Tab), preserving accessibility while improving the mouse user experience.
**Action:** When updating focus styles for interactive elements that are also frequently clicked by a mouse, prefer `:focus-visible` over `:focus`.
