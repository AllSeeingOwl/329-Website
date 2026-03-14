const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><p id="test"></p>`);
const output = dom.window.document.getElementById('test');

const decryptedMessage =
  "TRANSMISSION SECURED: What's up, groovy cats? Ollie here. If you're hearing this, you cracked the Dvorak disclaimer. The MLTK has eyes on the main routes. We are moving the operation. Meet us at the abandoned developer room under the Mini Rail. Bring bolt cutters. Stay wild.";

function runBenchmark(name, fn) {
  const start = performance.now();
  for (let i = 0; i < 5000; i++) {
    fn();
  }
  const end = performance.now();
  console.log(`${name}: ${end - start} ms`);
}

function testOriginal() {
  output.textContent = '';
  for (let i = 0; i < decryptedMessage.length; i++) {
    output.textContent += decryptedMessage.charAt(i);
  }
}

function testOptimizedLocalVar() {
  output.textContent = '';
  let currentText = '';
  for (let i = 0; i < decryptedMessage.length; i++) {
    currentText += decryptedMessage.charAt(i);
    output.textContent = currentText;
  }
}

function testOptimizedSubstring() {
  output.textContent = '';
  for (let i = 0; i < decryptedMessage.length; i++) {
    output.textContent = decryptedMessage.substring(0, i + 1);
  }
}

runBenchmark('Original (textContent +=)', testOriginal);
runBenchmark('Optimized (local string)', testOptimizedLocalVar);
runBenchmark('Optimized (substring)', testOptimizedSubstring);
