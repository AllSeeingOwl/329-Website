## 2024-05-24 - Inline form success messaging

**Learning:** Replacing native browser `alert()` popups with inline HTML success messages greatly improves UX, but developers often forget to make these new DOM elements accessible to screen readers. If a new `div` just appears on screen, a visually impaired user won't know the form submission succeeded.
**Action:** Always add `role="alert"` and `aria-live="polite"` (or `assertive`) to dynamically revealed success/error messages so screen readers announce them immediately when their `display` property changes.

## 2024-05-25 - Form Placeholder Guidance

**Learning:** Adding context-aware placeholders (e.g., "e.g. Missing Zine Pages" instead of just "Subject") significantly reduces cognitive load and improves form completion confidence, especially for abstract fields like "Subject".
**Action:** When adding placeholders, prioritize showing an example of expected input rather than just repeating the field label.
