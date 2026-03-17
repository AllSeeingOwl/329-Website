const { JSDOM } = require('jsdom');
const { performance } = require('perf_hooks');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="target"></div></body></html>`);
const document = dom.window.document;
const allowedTags = new Set(['p', 'strong', 'em']);

const largeHtml = Array(100).fill('<p>Some <strong>bold</strong> and <em>italic</em> text.</p>').join('');
const docHtml = new dom.window.DOMParser().parseFromString(largeHtml, 'text/html');

const buildSafeOriginal = (node, target) =>
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) target.appendChild(document.createTextNode(child.textContent));
    else if (child.nodeType === 1 && allowedTags.has(child.tagName.toLowerCase())) {
      const el = document.createElement(child.tagName);
      buildSafeOriginal(child, el);
      target.appendChild(el);
    }
  });

const buildSafeOptimized = (node, target) => {
  let child = node.firstChild;
  while (child) {
    if (child.nodeType === 3) target.appendChild(document.createTextNode(child.textContent));
    else if (child.nodeType === 1 && allowedTags.has(child.tagName.toLowerCase())) {
      const el = document.createElement(child.tagName);
      buildSafeOptimized(child, el);
      target.appendChild(el);
    }
    child = child.nextSibling;
  }
};

function runBenchmark(name, fn) {
  const target = document.getElementById('target');
  const start = performance.now();
  for (let i = 0; i < 500; i++) {
    target.innerHTML = '';
    fn(docHtml.body, target);
  }
  const end = performance.now();
  console.log(`${name}: ${end - start} ms`);
}

runBenchmark('Original (forEach)', buildSafeOriginal);
runBenchmark('Optimized (while)', buildSafeOptimized);
