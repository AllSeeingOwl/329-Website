## 2024-05-18 - Missing Disabled States on Form Buttons

**Learning:** Form submit buttons across the project are frequently disabled via JS during submission (`btn.disabled = true`), but lack a corresponding visual CSS `:disabled` state, leading to poor visual feedback for users.
**Action:** Always check for and add a `:disabled` CSS pseudo-class styling block (e.g. `cursor: not-allowed; background-color: #ccc;`) when a button's `disabled` attribute is toggled dynamically.
