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
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to app...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Helper to click nav by text
  async function clickNav(text) {
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const content = await page.evaluate((el) => el.textContent, b);
      if (content && content.includes(text)) {
        await b.click();
        await sleep(600);
        return true;
      }
    }
    return false;
  }

  // 1. Mission Control
  console.log('Capturing Mission Control...');
  await clickNav('Mission Control');
  await sleep(1000);
  await page.screenshot({ path: path.join(artifactDir, 'page_1_mission_control.png') });

  // 2. Live Simulation with Hero Demo
  console.log('Capturing Live Simulation & Hero Demo...');
  await clickNav('Live Simulation');
  await sleep(600);
  // Launch Hero Demo
  await clickNav('HERO DEMO');
  console.log('Running hero demo simulation...');
  await sleep(3500); // Let vehicle advance, detect animal hazard, and avoid
  await page.screenshot({ path: path.join(artifactDir, 'page_2_live_simulation_evasion.png') });

  // 3. Presentation Mode
  console.log('Capturing Presentation Mode...');
  await clickNav('Presentation');
  await sleep(600);
  await page.screenshot({ path: path.join(artifactDir, 'page_3_presentation_mode.png') });
  // Exit presentation mode
  await clickNav('Exit');
  await sleep(500);

  // 4. Environment
  console.log('Capturing Environment...');
  await clickNav('Environment');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_4_environment.png') });

  // 5. Risk & Prediction
  console.log('Capturing Risk & Prediction...');
  await clickNav('Risk & Prediction');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_5_risk_prediction.png') });

  // 6. Path Planner
  console.log('Capturing Path Planner...');
  await clickNav('Path Planner');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_6_path_planner.png') });

  // 7. Scenario Lab
  console.log('Capturing Scenario Lab...');
  await clickNav('Scenario Lab');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_7_scenario_lab.png') });

  // 8. Architecture & MathWorks
  console.log('Capturing Architecture & MathWorks...');
  await clickNav('Architecture & MathWorks');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_8_architecture.png') });

  // 9. Benchmark & Analytics
  console.log('Capturing Benchmark & Analytics...');
  await clickNav('Benchmark & Analytics');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'page_9_analytics_benchmark.png') });

  console.log('All screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
