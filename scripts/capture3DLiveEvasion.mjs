import puppeteer from 'puppeteer-core';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\vrnsr\\.gemini\\antigravity-ide\\brain\\82abaf3c-efda-4001-bf3a-8c027a869edf';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  console.log('Navigating to live app...');
  await page.goto('http://127.0.0.1:5173?page=LIVE_SIMULATION', { waitUntil: 'networkidle0' });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function clickButton(text) {
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const content = await page.evaluate((el) => el.textContent, b);
      if (content && content.includes(text)) {
        await b.click();
        await sleep(400);
        return true;
      }
    }
    return false;
  }

  // Ensure 3D mode is selected
  await clickButton('3D Three.js');
  await sleep(600);

  // Launch Hero Demo
  console.log('Launching Hero Demo in 3D mode...');
  await clickButton('HERO DEMO');

  // Wait 3.5 seconds for evasion maneuver
  console.log('Allowing vehicle to advance, detect crossing animal, and evade in 3D...');
  await sleep(3600);

  // Capture 3D evasion
  await page.screenshot({ path: path.join(artifactDir, 'page_3d_live_evasion.png') });
  console.log('Captured page_3d_live_evasion.png!');

  // Switch to 3D Top-Down camera during run
  await clickButton('Top-Down');
  await sleep(600);
  await page.screenshot({ path: path.join(artifactDir, 'page_3d_topdown_active.png') });
  console.log('Captured page_3d_topdown_active.png!');

  await browser.close();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
