const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.route('/api/auth/session', r => r.fulfill({status: 200, body: '{}'}));
  await page.route('/api/user/credits', r => r.fulfill({status: 200, body: '{"credits":1000}'}));
  
  await page.goto('http://localhost:3000/dashboard');
  await page.setViewportSize({width: 320, height: 800});
  await page.waitForTimeout(2000);
  
  const badEls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(e => e.scrollWidth > 320 && e.tagName !== 'HTML' && e.tagName !== 'BODY')
      .map(e => ({
        tag: e.tagName, 
        className: typeof e.className === 'string' ? e.className : '', 
        width: e.scrollWidth, 
        text: (e.innerText || '').substring(0, 30).replace(/\n/g, ' ')
      }));
  });
  
  console.log(JSON.stringify(badEls, null, 2));
  
  await browser.close();
})();
