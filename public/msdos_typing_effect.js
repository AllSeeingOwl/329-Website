/**
 * Corporate Intranet MS-DOS Typing Effect
 * Used on MLTK corporate intranet pages to simulate text being typed out
 */
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .ms-dos-cursor {
      display: inline-block;
      width: 10px;
      height: 1.2em;
      background-color: #00ff00;
      animation: blink 1s step-end infinite;
      vertical-align: bottom;
      margin-left: 2px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);

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

  function type() {
    if (nodeIndex >= allTextNodes.length) {
      // Done typing, leave the cursor where it is
      return;
    }

    const current = allTextNodes[nodeIndex];

    if (charIndex === 0) {
      current.node.parentNode.insertBefore(cursor, current.node.nextSibling);
    }

    current.node.textContent = current.text.substring(0, charIndex + 1);
    charIndex++;

    if (charIndex >= current.text.length) {
      nodeIndex++;
      charIndex = 0;
    }

    // Faster speed so users don't have to wait forever for whole pages
    setTimeout(type, 2);
  }

  type();
});
