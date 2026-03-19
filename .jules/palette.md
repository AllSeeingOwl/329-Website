## 2024-11-20 - Thematic Focus States for Large Clickable Surface Blocks

**Learning:** Adding standard `:focus` states to large, stylized structural elements (like the portal cards in the ARG portal) can break their specific visual immersion or introduce unwanted outlines that do not match the theme. However, accessibility is crucial for these main navigation blocks.
**Action:** Always use `:focus-visible` combined with the existing `:hover` styles to trigger the thematic visual enhancements (e.g., custom border colors, thematic box-shadow glows) for keyboard users. This aligns the visual experience of keyboard navigation with pointer interaction without adding generic, unthemed outlines.

## 2024-11-20 - ARIA Live Regions for Dynamic Terminal Text Injections

**Learning:** Terminal-style interfaces (like the MLTK portals) heavily rely on dynamic text injection for chat responses, processing states, and errors. These visual updates are completely silent to screen readers by default.
**Action:** Always pair dynamic text injections with appropriate ARIA live regions: use `role="log"` for chat/terminal windows to announce appended text sequentially, `role="status" aria-live="polite"` for non-disruptive processing/loading indicators, and `role="alert"` for critical error messages (like "ACCESS DENIED"). For buttons that change text to indicate state (e.g., "LINK ESTABLISHED..."), add `aria-live="polite"` directly to the button.

## 2025-01-20 - Keyboard Accessibility for Custom Table Rows (File Directory Patterns)

**Learning:** When using structural HTML elements like `<tr>` for custom interactive components (such as clickable file rows in a simulated file explorer or archive directory), these elements are not natively focusable or actionable by keyboards or screen readers, creating a significant accessibility barrier.
**Action:** For custom interactive rows (e.g., `tr.file-row` triggering a click event), always add `tabindex="0"` to make them focusable, apply `role="button"` to inform screen readers of their interactive nature, and attach an `onkeydown` event handler to explicitly trigger the action on `Enter` or `Space` key presses.
