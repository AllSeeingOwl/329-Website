## 2024-11-20 - Thematic Focus States for Large Clickable Surface Blocks

**Learning:** Adding standard `:focus` states to large, stylized structural elements (like the portal cards in the ARG portal) can break their specific visual immersion or introduce unwanted outlines that do not match the theme. However, accessibility is crucial for these main navigation blocks.
**Action:** Always use `:focus-visible` combined with the existing `:hover` styles to trigger the thematic visual enhancements (e.g., custom border colors, thematic box-shadow glows) for keyboard users. This aligns the visual experience of keyboard navigation with pointer interaction without adding generic, unthemed outlines.
