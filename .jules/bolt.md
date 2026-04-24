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

## 2026-03-24 - Debounce Resize Events with requestAnimationFrame

**Learning:** Binding a `resize` event listener that reads layout properties like `scrollHeight` or `clientHeight` forces a synchronous reflow. Because `resize` events can fire dozens of times per second, executing this without a debounce causes layout thrashing and severe main-thread blocking.
**Action:** Use `requestAnimationFrame` to debounce the `resize` event, ensuring that layout calculations and DOM updates are batched and executed at most once per frame.

## 2024-05-25 - Prevent Uint8Array re-allocation in high-frequency event listeners

**Learning:** Allocating typed arrays (like `new Uint8Array(length)`) inside a function called by high-frequency events (like a range slider's `input` event) causes significant garbage collection pressure and main-thread blocking, leading to severe layout jank during user interactions.
**Action:** Extract typed array allocations outside the hot path to a module-scoped, reasonably sized constant variable (e.g., `const sharedStaticBuffer = new Uint8Array(256);`), and reuse it via `.subarray(0, length)` within the function to prevent continuous memory allocations and GC sweeps.

## 2026-03-25 - Prevent Layout Thrashing with textContent vs innerText

**Learning:** Updating text in the DOM using `innerText` triggers a synchronous layout recalculation (reflow) because it is aware of CSS styling and text transformations. During high-frequency updates, such as slider inputs or countdown timers, this causes unnecessary main-thread blocking and layout thrashing.
**Action:** Replace `innerText` with `textContent` for simple string assignments. `textContent` directly sets the text value of the node, bypassing the layout engine and significantly improving performance during repetitive DOM updates.

## 2026-03-25 - Prevent String Allocation in Recursive DOM Traversals

**Learning:** Repeatedly calling `String.prototype.toLowerCase()` (e.g., `child.tagName.toLowerCase()`) inside deep, recursive DOM traversal loops creates significant garbage collection pressure by allocating a new string for every single element node processed.
**Action:** Use the native uppercase `node.nodeName` property directly against a `Set` initialized with uppercase strings (e.g., `new Set(['P', 'STRONG', 'EM'])`). This provides a fast, O(1) lookup with zero intermediate string allocation overhead.

## 2026-03-25 - Cache DOM Queries in Frequently Executed Functions

**Learning:** Repeatedly querying the DOM with `document.getElementById` inside frequently triggered event handlers (like form submissions or input events) adds unnecessary overhead by forcing the browser to traverse the DOM tree multiple times.
**Action:** Use a lazy-initialization pattern (e.g., a `getDomCache()` function) to query DOM elements once on the first execution, storing them in a module-scoped variable for rapid, O(1) reuse in all subsequent executions.

## 2026-03-25 - Cache DOM Queries in High-Frequency Layout Handlers

**Learning:** Repeatedly querying the DOM with `document.getElementById` inside a high-frequency layout handler, such as a `resize` event or during `requestAnimationFrame`, forces the browser to traverse the DOM tree multiple times per frame. Even though `document.getElementById` is typically O(1), doing this during layout thrashing can degrade frame rates.
**Action:** Cache the dynamically resolved DOM nodes directly on the element object (e.g., `btn._contentNode = document.getElementById(...)`) or in a closure variable. This ensures that the node is fetched only once and reused during subsequent fast-firing layout frames, saving execution time.

## 2026-03-25 - Prevent Array Allocation in Event Listeners

**Learning:** Using `Array.from(nodeList)` inside a high-frequency event listener (like `keydown`) creates an O(N) array allocation on every event. This causes unnecessary garbage collection pressure.
**Action:** Use `Array.prototype.indexOf.call(nodeList, element)` to find an item's index in a `NodeList` directly, avoiding the intermediate array allocation entirely.

## 2026-04-22 - Cache DOM Queries in Form Submissions

**Learning:** Repeatedly querying the DOM with `document.getElementById` inside event handlers (like form submissions) adds unnecessary overhead by forcing the browser to traverse the DOM tree multiple times.
**Action:** Use a lazy-initialization pattern (e.g., a `getDomCache()` function) to query DOM elements once on the first execution, storing them in a module-scoped variable for rapid, O(1) reuse in all subsequent executions. (Applied to `studio-contact-us.html`)

## 2024-05-26 - Cache DOM Queries in Inline Event Handlers

**Learning:** Inline event handlers (like `onclick` or `onsubmit`) that repeatedly call `document.getElementById` or `this.querySelector` on every interaction cause unnecessary DOM traversal overhead.
**Action:** Use a lazy-initialization pattern directly on the element object (e.g., `this._nav = this._nav || document.getElementById("main-nav")`) to cache the resolved DOM node. This ensures the query is only performed once and reused on subsequent interactions, improving performance.
