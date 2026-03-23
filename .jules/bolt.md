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

## 2024-05-21 - Batching DOM Updates with requestAnimationFrame in radio_scanner_utils

**Learning:** Using `setInterval` with a low delay (e.g., 30ms) for high-frequency DOM manipulation like typing effects causes main-thread blocking and layout thrashing. It forces the browser to evaluate layouts and repaint unnecessarily often.
**Action:** Replace `setInterval` and `setTimeout` loops with `requestAnimationFrame`. Calculate the elapsed time (`deltaTime`) since the last frame and use it to batch multiple logical updates (e.g., advancing multiple characters) into a single DOM update per frame. This aligns the updates with the browser's refresh rate, reducing CPU overhead and preventing layout thrashing.

## 2024-05-22 - Batching DOM Updates with requestAnimationFrame in MLTK Boot Sequence

**Learning:** Using `setInterval` with a low delay (e.g., 50ms) for high-frequency DOM manipulation and layout reads (like `scrollTop` and `scrollHeight`) causes main-thread blocking and layout thrashing. It forces the browser to evaluate layouts and repaint unnecessarily often.
**Action:** Replace `setInterval` and `setTimeout` loops with `requestAnimationFrame`. Calculate the elapsed time (`deltaTime`) since the last frame and use it to batch multiple logical updates (e.g., adding multiple log lines) into a single DOM update per frame using a `DocumentFragment`. This aligns the updates with the browser's refresh rate, reducing CPU overhead and preventing layout thrashing.

## 2026-03-23 - Cache DOM Queries in Frequently Executed Functions

**Learning:** Repeatedly querying the DOM with `document.getElementById` or `document.querySelector` inside frequently triggered event handlers (like `input` or `click`) or core validation functions (like `verifyCode`) adds unnecessary overhead by forcing the browser to traverse the DOM tree multiple times.
**Action:** Query DOM elements once and store them in a persistent cache object. Use a helper function (e.g., `getDomCache`) to initialize the cache only when needed, and reference the cached elements thereafter to improve performance and reduce CPU usage.
