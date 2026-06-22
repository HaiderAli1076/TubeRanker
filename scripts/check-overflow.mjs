import { chromium } from 'playwright';

const url = process.env.CHECK_URL || 'http://localhost:3000/dashboard';
const widths = [320, 375, 390, 414, 768, 1024, 1440];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const width of widths) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  const overflow = metrics.docScrollWidth - metrics.docClientWidth;
  console.log(
    `width=${width} -> scrollWidth=${metrics.docScrollWidth} ` +
    `clientWidth=${metrics.docClientWidth} ` +
    `OVERFLOW=${overflow}px ${overflow > 0 ? '!!! FAIL' : 'OK'}`
  );
}

await browser.close();
