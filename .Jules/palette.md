# Palette's Journal

## 2026-03-13 - Added Aria-Labels for Forms

**Learning:** Adding aria-labels to unlabelled forms inside static HTML files (stored as .txt for ARG reasons) does not affect existing automated tests but vastly improves screen reader accessibility.
**Action:** When finding form inputs without labels or placeholers, add an `aria-label` attribute explaining the purpose of the input.

## 2026-03-15 - Added Visual Required Indicators

**Learning:** When using the HTML5 'required' attribute, screen readers automatically announce it. However, sighted users still need a visual indicator. Adding a red asterisk with 'aria-hidden="true"' is a simple, accessible pattern to provide this visual cue without double-announcing for screen reader users.
**Action:** Always pair HTML5 'required' attributes with an aria-hidden visual indicator (like an asterisk) to serve both sighted and non-sighted users efficiently.

## 2026-03-24 - Replaced Native Alerts with Accessible Inline Messages

**Learning:** Replacing native `alert()` calls with inline success messages requires setting `role="alert"` and `aria-live="polite"` to ensure screen readers immediately announce the status change. Additionally, forms should properly manage state by setting `aria-busy="true"` on the form and `aria-disabled="true"` on the disabled submit button.
**Action:** Always replace `alert()` dialogues with accessible inline messaging that manages both the visual and screen reader state during async operations.

## 2026-03-29 - Explicit Aria-Disabled State for Async Buttons

**Learning:** When disabling a button during an async operation or animation (e.g., using `btn.disabled = true;`), relying solely on the native `disabled` attribute may not sufficiently or consistently notify screen readers of the state change while the element still has focus. Explicitly managing `aria-disabled="true"` provides a more robust accessibility cue.
**Action:** Always set `aria-disabled="true"` when setting a button's native `disabled` property to true during interactive states, and be sure to `removeAttribute('aria-disabled')` when re-enabling it.

## 2026-03-31 - Aria-Busy State for Asynchronous Forms

**Learning:** For forms that handle their submissions asynchronously (like simulating loading states with `setTimeout`), adding the `aria-busy="true"` attribute to the `<form>` element while the simulated delay occurs properly informs screen readers that a background process is active.
**Action:** When a form intercepts its submission to run custom asynchronous code, apply `form.setAttribute('aria-busy', 'true')` and remove it or set it to `'false'` upon completion.

## 2026-04-01 - Added Aria-Label for Passcode Input

**Learning:** Sighted users can easily infer the purpose of an input field based on adjacent visual prompts (like "ENTER PASSCODE:"), but screen readers may not intrinsically associate that text with the input.
**Action:** Always add an explicit `aria-label` to form inputs, particularly standalone ones like command prompts or passcodes, so that screen reader users are provided with clear context.

## 2026-04-03 - Descriptive Aria-Labels for Ambiguous Text Content

**Learning:** For elements with purely visual or ambiguous text representations (such as `[X] CLOSE` buttons), using explicit `aria-label` attributes provides much clearer context for screen reader users than the raw text content.
**Action:** When adding or auditing elements with text that may be interpreted awkwardly by a screen reader (e.g. "[X] CLOSE"), apply an `aria-label` (e.g., `aria-label="Close document viewer"`) to override the text.
