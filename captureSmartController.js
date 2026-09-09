import puppeteer from 'puppeteer-core';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\vrnsr\\.gemini\\antigravity-ide\\brain\\82abaf3c-efda-4001-bf3a-8c027a869edf';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  console.log('Navigating to app...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function clickButtonWithText(text) {
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const content = await page.evaluate((el) => el.textContent, b);
      if (content && content.includes(text)) {
        await b.click();
        await sleep(500);
        return true;
      }
    }
    return false;
  }

  // Go to Live Simulation
  await clickButtonWithText('Live Simulation');
  await sleep(600);

  // Switch to Smart Controller
  console.log('Switching to Smart Controller...');
  await clickButtonWithText('Smart Controller / 5×3 Occupancy');
  await sleep(1000);

  // 1. Capture Overview with default Case A
  console.log('Capturing Smart Controller Overview...');
  await page.screenshot({ path: path.join(artifactDir, 'page_smart_controller_overview.png'), fullPage: true });

  // 2. Select Case B: Obstacle Ahead
  console.log('Selecting Case B: Obstacle Ahead...');
  await clickButtonWithText('Case B: Obstacle Ahead');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_smart_controller_case_b.png'), fullPage: true });

  // 3. Select Case G: Emergency Front Obstacle
  console.log('Selecting Case G: Emergency Stop...');
  await clickButtonWithText('Case G: Emergency Front Obstacle');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_smart_controller_case_g.png'), fullPage: true });

  // 4. Select Case F: Pothole
  console.log('Selecting Case F: Pothole...');
  await clickButtonWithText('Case F: Pothole');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_smart_controller_case_f.png'), fullPage: true });

  console.log('Done capturing Smart Controller screenshots!');
  await browser.close();
}

run().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
