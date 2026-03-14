const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="transmission-output"></div>
      </body>
    </html>
  `);

  const results = await page.evaluate(async () => {
    const output = document.getElementById('transmission-output');
    const decryptedMessage =
      "TRANSMISSION SECURED: What's up, groovy cats? Ollie here. If you're hearing this, you cracked the Dvorak disclaimer. The MLTK has eyes on the main routes. We are moving the operation. Meet us at the abandoned developer room under the Mini Rail. Bring bolt cutters. Stay wild.";

    // Simulate Original
    const startOriginal = performance.now();
    for (let j = 0; j < 1000; j++) {
      output.textContent = '';
      for (let i = 0; i < decryptedMessage.length; i++) {
        output.textContent += decryptedMessage.charAt(i);
        // Force layout/style recalc if needed
        output.offsetHeight;
      }
    }
    const endOriginal = performance.now();

    // Simulate Optimized
    const startOptimized = performance.now();
    for (let j = 0; j < 1000; j++) {
      output.textContent = '';
      for (let i = 0; i < decryptedMessage.length; i++) {
        output.textContent = decryptedMessage.substring(0, i + 1);
        output.offsetHeight;
      }
    }
    const endOptimized = performance.now();

    return {
      original: endOriginal - startOriginal,
      optimized: endOptimized - startOptimized,
    };
  });

  console.log('Playwright Performance Results:');
  console.log(`Original (textContent +=): ${results.original.toFixed(2)} ms`);
  console.log(`Optimized (substring): ${results.optimized.toFixed(2)} ms`);
  console.log(
    `Improvement: ${(((results.original - results.optimized) / results.original) * 100).toFixed(2)}%`
  );

  await browser.close();
})();
