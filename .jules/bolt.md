## 2024-05-18 - Uint32Array vs Uint8Array for Random Selection

**Learning:** Using `Array.from().join()` for a large amount of array processing is very slow in JavaScript compared to standard `for` loops and string concatenation. Furthermore, `Uint8Array` uses less memory and is generally faster to populate than `Uint32Array` when the maximum modulo value is small (like picking a char from a 50 char string).
**Action:** Replace `Array.from(Uint32Array, ...).join('')` with a `Uint8Array` + `for` loop + string concatenation for hot paths involving random character generation.

## 2024-05-16 - Optimize DOM traversal in msdos_typing_effect

**Learning:** Frequent array creation `['A', 'B'].includes()` and `Array.from()` conversions inside deep recursive DOM traversal functions like `walkDom` add huge hidden overheads in both memory allocation and execution time.
**Action:** Lift static array definitions out of recursive functions as `Set` objects for O(1) lookups, and prefer standard `for` or `while` loops over `NodeList` instead of `Array.from(node.childNodes).forEach()` for maximum performance.

## 2024-05-18 - Optimize DOM traversal with while loops

**Learning:** When performing recursive DOM traversal (like cleaning HTML before rendering), using `NodeList.forEach()` is less performant and allocates more memory compared to using a `while` loop with `nextSibling`. `childNodes` must convert or iterate in a more expensive manner.
**Action:** Replace `node.childNodes.forEach` with a standard `while(child)` loop using `child = node.firstChild` and `child = child.nextSibling` to speed up DOM parsers and reduce GC pressure.

## 2024-05-19 - Replace scroll event with IntersectionObserver

**Learning:** Binding a `scroll` event listener and constantly calculating `getBoundingClientRect()` within a `requestAnimationFrame` forces the main thread to constantly calculate element visibility. This causes unnecessary layout thrashing and reduces frame rates, especially for simple appearance animations on trigger points.
**Action:** Replace `scroll` event listeners and `getBoundingClientRect` logic with an `IntersectionObserver`. Set the `rootMargin` property appropriately (e.g., `-50% 0px 0px 0px`) to trigger callbacks only when the target threshold is actually crossed, eliminating scroll overhead.

## 2024-05-20 - Batching DOM Updates with requestAnimationFrame

**Learning:** Using `setTimeout` loops with very low delays (e.g., 2ms) to perform sequential DOM manipulation (like a typing effect) causes massive CPU overhead and layout thrashing, as the browser attempts to execute hundreds of redundant renders per second.
**Action:** Replace high-frequency `setTimeout` loops with `requestAnimationFrame`. Calculate the elapsed time (`deltaTime`) since the last frame, and batch the logical progression (e.g., advancing multiple characters) into a single, frame-aligned DOM update.
