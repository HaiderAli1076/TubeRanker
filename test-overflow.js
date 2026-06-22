const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Mock session API to prevent any client-side redirects if they exist
  await page.route('/api/auth/session', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString()
      })
    });
  });

  // Mock API routes that the dashboard might fetch
  await page.route('/api/user/credits', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ credits: 1000 })
    });
  });
  
  await page.goto('http://localhost:3000/test-overflow');
  // Wait for the main elements to load
  await page.waitForSelector('input[placeholder*="YouTube"]', { timeout: 10000 });

  const viewports = [320, 375, 390, 414, 768, 1024, 1440];
  
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 800 });
    // Give layout a moment to recalculate
    await page.waitForTimeout(500);
    
    const dimensions = await page.evaluate(() => {
      return {
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth
      };
    });
    
    const hasOverflow = dimensions.docScrollWidth > dimensions.docClientWidth;
    
    console.log(`Viewport Width: ${width}px`);
    console.log(`  - document.documentElement.scrollWidth: ${dimensions.docScrollWidth}`);
    console.log(`  - document.documentElement.clientWidth: ${dimensions.docClientWidth}`);
    console.log(`  - document.body.scrollWidth: ${dimensions.bodyScrollWidth}`);
    console.log(`  - window.innerWidth: ${dimensions.innerWidth}`);
    console.log(`  -> OVERFLOW: ${hasOverflow ? 'YES (FAILED)' : 'NO (PASSED)'}\n`);
  }

  await browser.close();
})();
