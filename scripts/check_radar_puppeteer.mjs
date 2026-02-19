#!/usr/bin/env node
import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const url = 'http://localhost:3000/qa-dashboard';
  const outScreenshot = 'tmp_radar.png';
  const outHtml = 'tmp_radar_page.html';

  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE_LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE_ERROR:', err.toString()));

    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Click the tab button that contains 'Quality Radar'
    const [tab] = await page.$x("//button[contains(., 'Quality Radar')]");
    if (!tab) {
      console.error('Tab button not found');
      await page.screenshot({ path: outScreenshot });
      process.exit(2);
    }
    await tab.click();

    // Wait for header text 'Roadmap de Madurez' or the radar svg to appear
    try {
      await page.waitForXPath("//h3[contains(., 'Roadmap de Madurez')]", { timeout: 7000 });
    } catch (e) {
      // fallback: wait for an svg inside the radar container
      await page.waitForSelector('svg', { timeout: 7000 });
    }

    // Give Recharts a moment to render
    await page.waitForTimeout(500);

    // Save page HTML for debugging
    const html = await page.content();
    fs.writeFileSync(outHtml, html, 'utf8');

    // Save screenshot
    await page.screenshot({ path: outScreenshot, fullPage: false });

    console.log(JSON.stringify({ ok: true, screenshot: outScreenshot, html: outHtml }));
    await browser.close();
    process.exit(0);
  } catch (err) {
    if (browser) try { await browser.close(); } catch(e){}
    console.error('ERROR:', err && err.message);
    process.exit(1);
  }
})();
