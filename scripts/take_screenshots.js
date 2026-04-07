const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('@playwright/test');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://localhost:3000';

function getAllHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      // Get the relative path starting from public/ to build the URL correctly
      const relativePath = path.relative(PUBLIC_DIR, filePath);
      fileList.push(relativePath.replace(/\\/g, '/')); // normalize to forward slashes for URLs
    }
  }
  return fileList;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = getAllHtmlFiles(PUBLIC_DIR);
  console.log(`Found ${files.length} HTML files to process.`);

  const browser = await chromium.launch();

  const desktopContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const mobileDevice = devices['iPhone 12'];
  const mobileContext = await browser.newContext({
    ...mobileDevice
  });

  const desktopPage = await desktopContext.newPage();
  const mobilePage = await mobileContext.newPage();

  for (const file of files) {
    console.log(`Processing ${file}...`);
    // ensure subdirectories exist in screenshots output
    const fileOutputDir = path.join(OUTPUT_DIR, path.dirname(file));
    if (!fs.existsSync(fileOutputDir)) {
      fs.mkdirSync(fileOutputDir, { recursive: true });
    }

    const url = `${BASE_URL}/${file}`;
    const baseName = path.basename(file);

    // Capture Desktop
    try {
      await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await desktopPage.screenshot({
        path: path.join(fileOutputDir, `${baseName}-desktop.png`),
        fullPage: true
      });
      console.log(`  Saved desktop screenshot for ${file}`);
    } catch (err) {
      console.error(`  Failed desktop screenshot for ${file}: ${err.message}`);
    }

    // Capture Mobile
    try {
      await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await mobilePage.screenshot({
        path: path.join(fileOutputDir, `${baseName}-mobile.png`),
        fullPage: true
      });
      console.log(`  Saved mobile screenshot for ${file}`);
    } catch (err) {
      console.error(`  Failed mobile screenshot for ${file}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Finished capturing all screenshots.');
}

main().catch(err => {
  console.error('Error running screenshot script:', err);
  process.exit(1);
});
