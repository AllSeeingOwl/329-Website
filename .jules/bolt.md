## 2024-05-18 - Uint32Array vs Uint8Array for Random Selection

**Learning:** Using `Array.from().join()` for a large amount of array processing is very slow in JavaScript compared to standard `for` loops and string concatenation. Furthermore, `Uint8Array` uses less memory and is generally faster to populate than `Uint32Array` when the maximum modulo value is small (like picking a char from a 50 char string).
**Action:** Replace `Array.from(Uint32Array, ...).join('')` with a `Uint8Array` + `for` loop + string concatenation for hot paths involving random character generation.

## 2024-05-16 - Optimize DOM traversal in msdos_typing_effect

**Learning:** Frequent array creation `['A', 'B'].includes()` and `Array.from()` conversions inside deep recursive DOM traversal functions like `walkDom` add huge hidden overheads in both memory allocation and execution time.
**Action:** Lift static array definitions out of recursive functions as `Set` objects for O(1) lookups, and prefer standard `for` or `while` loops over `NodeList` instead of `Array.from(node.childNodes).forEach()` for maximum performance.
