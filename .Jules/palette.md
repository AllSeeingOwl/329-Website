# Palette's Journal
## 2026-03-13 - Added Aria-Labels for Forms
**Learning:** Adding aria-labels to unlabelled forms inside static HTML files (stored as .txt for ARG reasons) does not affect existing automated tests but vastly improves screen reader accessibility.
**Action:** When finding form inputs without labels or placeholers, add an `aria-label` attribute explaining the purpose of the input.
