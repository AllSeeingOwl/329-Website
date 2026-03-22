/**
 * Corporate Intranet MS-DOS Typing Effect
 * Used on MLTK corporate intranet pages to simulate text being typed out
 */
document.addEventListener('DOMContentLoaded', () => {
  const allTextNodes = [];

  // ⚡ Bolt: Cache ignored tags in a Set for O(1) lookups instead of recreating an array
  // and performing O(n) includes() checks on every recursive call.
  const IGNORED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'INPUT',
    'TEXTAREA',
    'SELECT',
    'OPTION',
  ]);

  function walkDom(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim() !== '') {
        allTextNodes.push({
          node: node,
          text: node.textContent,
        });
        node.textContent = '';
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (IGNORED_TAGS.has(node.nodeName)) return;

      // ⚡ Bolt: Optimize child traversal by iterating with nextSibling instead of
      // generating an intermediate Array via Array.from(node.childNodes).forEach().
      // Reduces memory allocation and speeds up deep DOM traversals significantly.
      let child = node.firstChild;
      while (child) {
        const next = child.nextSibling;
        walkDom(child);
        child = next;
      }
    }
  }

  walkDom(document.body);

  const cursor = document.createElement('span');
  cursor.className = 'ms-dos-cursor';

  let nodeIndex = 0;
  let charIndex = 0;
  let lastTime = null;

  function type(currentTime) {
    if (nodeIndex >= allTextNodes.length) {
      // Done typing, leave the cursor where it is
      return;
    }

    if (!lastTime) lastTime = currentTime;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // ⚡ Bolt: Batch DOM text updates per frame based on elapsed time to prevent main
    // thread blocking from high-frequency setTimeout calls. 1 char every 2ms.
    let charsRemaining = Math.max(1, Math.floor(deltaTime / 2));

    while (charsRemaining > 0 && nodeIndex < allTextNodes.length) {
      const current = allTextNodes[nodeIndex];

      if (charIndex === 0) {
        current.node.parentNode.insertBefore(cursor, current.node.nextSibling);
      }

      const charsToTypeInThisNode = Math.min(charsRemaining, current.text.length - charIndex);
      charIndex += charsToTypeInThisNode;
      charsRemaining -= charsToTypeInThisNode;

      current.node.textContent = current.text.substring(0, charIndex);

      if (charIndex >= current.text.length) {
        nodeIndex++;
        charIndex = 0;
      }
    }

    requestAnimationFrame(type);
  }

  requestAnimationFrame(type);
});
