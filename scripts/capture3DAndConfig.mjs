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
        await sleep(500);
        return true;
      }
    }
    return false;
  }

  // 1. Live 3D Simulation Mode (Default or 3D)
  console.log('Capturing Live 3D Simulation View...');
  await clickButton('3D Three.js');
  await sleep(1200);
  await page.screenshot({ path: path.join(artifactDir, 'page_3d_simulation_chase.png') });

  // 2. Open Simulation Configurator Modal
  console.log('Opening Simulation Configurator Modal...');
  await clickButton('CONFIGURE');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_config_modal.png') });

  // 3. Apply 12m Road Width and Custom Traffic
  console.log('Applying 12m Road Width...');
  // Click 12m button inside modal
  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const txt = await page.evaluate(el => el.textContent, b);
    if (txt && txt.includes('12m')) {
      await b.click();
      await sleep(300);
      break;
    }
  }
  // Click APPLY REAL-TIME
  await clickButton('APPLY REAL-TIME');
  await sleep(1000);
  await page.screenshot({ path: path.join(artifactDir, 'page_3d_12m_road.png') });

  // 4. Switch to Top-Down 3D camera
  console.log('Switching to 3D Top-Down Camera...');
  await clickButton('Top-Down');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_3d_topdown.png') });

  // 5. Switch to 2D Canvas Mode
  console.log('Switching to 2D Canvas Mode...');
  await clickButton('2D Canvas');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_2d_canvas.png') });

  // 6. Switch to Manual Driving Mode
  console.log('Switching to Manual Mode...');
  await clickButton('MANUAL');
  await sleep(600);
  await page.screenshot({ path: path.join(artifactDir, 'page_manual_mode.png') });

  console.log('All screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
