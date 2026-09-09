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

  async function capturePageSet(themePrefix) {
    console.log(`\n=== CAPTURING ${themePrefix.toUpperCase()} SUITE ===`);

    // 1. Mission Control
    console.log(`[${themePrefix}] Mission Control...`);
    await page.goto('http://127.0.0.1:5173?page=MISSION_CONTROL', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_mission_control.png`) });

    // 2. Live Simulation (3D)
    console.log(`[${themePrefix}] Live Simulation (3D)...`);
    await page.goto('http://127.0.0.1:5173?page=LIVE_SIMULATION', { waitUntil: 'networkidle0' });
    await sleep(800);
    await clickButton('3D Three.js');
    await sleep(1200);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_live_sim_3d.png`) });

    // 3. Live Simulation (2D Canvas)
    console.log(`[${themePrefix}] Live Simulation (2D)...`);
    await clickButton('2D Canvas');
    await sleep(800);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_live_sim_2d.png`) });

    // 4. Config Modal
    console.log(`[${themePrefix}] Simulation Config Modal...`);
    await clickButton('CONFIGURE');
    await sleep(800);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_config_modal.png`) });
    await clickButton('APPLY SETTINGS');
    await sleep(500);

    // 5. Environmental Analysis
    console.log(`[${themePrefix}] Environmental Analysis...`);
    await page.goto('http://127.0.0.1:5173?page=ENVIRONMENT_ANALYSIS', { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_environment.png`) });

    // 6. Risk & Prediction
    console.log(`[${themePrefix}] Risk & Prediction...`);
    await page.goto('http://127.0.0.1:5173?page=RISK_PREDICTION', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_risk_prediction.png`) });

    // 7. Path Planner
    console.log(`[${themePrefix}] Path Planner...`);
    await page.goto('http://127.0.0.1:5173?page=PATH_PLANNER', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_path_planner.png`) });

    // 8. Scenario Lab
    console.log(`[${themePrefix}] Scenario Lab...`);
    await page.goto('http://127.0.0.1:5173?page=SCENARIO_LAB', { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_scenario_lab.png`) });

    // 9. Analytics & Benchmark
    console.log(`[${themePrefix}] Analytics & Benchmark...`);
    await page.goto('http://127.0.0.1:5173?page=ANALYTICS_BENCHMARK', { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_benchmark.png`) });

    // 10. System Architecture
    console.log(`[${themePrefix}] System Architecture...`);
    await page.goto('http://127.0.0.1:5173?page=SYSTEM_ARCHITECTURE', { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(artifactDir, `${themePrefix}_architecture.png`) });
  }

  // Phase 1: Capture Dark Theme (Ensure data-theme="dark")
  console.log('Navigating to app in Dark Mode...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('adapt_india_theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await sleep(600);
  await capturePageSet('theme_dark');

  // Phase 2: Toggle to Bright Theme via UI toggle button
  console.log('\nToggling theme to BRIGHT THEME via UI toggle button...');
  const toggleBtn = await page.$('#theme-toggle-btn');
  if (toggleBtn) {
    await toggleBtn.click();
    await sleep(800);
  } else {
    // Fallback direct invocation
    await page.evaluate(() => {
      localStorage.setItem('adapt_india_theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    await sleep(800);
  }

  const currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log(`Verified current document data-theme: ${currentTheme}`);

  // Phase 3: Capture Bright Theme
  await capturePageSet('theme_bright');

  console.log('\nAll Dual-Theme screenshots successfully captured!');
  await browser.close();
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
