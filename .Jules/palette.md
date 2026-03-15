# Palette's Journal

## 2026-03-13 - Added Aria-Labels for Forms

**Learning:** Adding aria-labels to unlabelled forms inside static HTML files (stored as .txt for ARG reasons) does not affect existing automated tests but vastly improves screen reader accessibility.
**Action:** When finding form inputs without labels or placeholers, add an `aria-label` attribute explaining the purpose of the input.

## 2026-03-15 - Added Visual Required Indicators
**Learning:** When using the HTML5 'required' attribute, screen readers automatically announce it. However, sighted users still need a visual indicator. Adding a red asterisk with 'aria-hidden="true"' is a simple, accessible pattern to provide this visual cue without double-announcing for screen reader users.
**Action:** Always pair HTML5 'required' attributes with an aria-hidden visual indicator (like an asterisk) to serve both sighted and non-sighted users efficiently.
