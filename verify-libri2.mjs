import { chromium } from './node_modules/playwright/index.mjs';

const BASE = 'http://localhost:3000';
const OUT  = 'C:/Users/Peggy18/Documents/Marco/Progetti/ProgettoLibreria';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'marcolarocca.p@gmail.com');
  await page.fill('input[type="password"]', 'TestVibrazioni2024!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(libreria|dashboard)/, { timeout: 15000 });

  // Test the editions + quick-add flow
  await page.goto(`${BASE}/libri`);
  await page.waitForTimeout(2000);

  // Open dialog
  const addBtn = page.locator('button').filter({ hasText: /Aggiungi/i }).first();
  await addBtn.click();
  await page.waitForTimeout(500);

  // Search
  const inp = page.locator('input').first();
  await inp.fill('Sapiens');
  await page.waitForTimeout(3000); // wait for Google Books API
  
  await page.screenshot({ path: `${OUT}/pw-search-results.png` });
  
  // What's inside the dialog?
  const dialogEl = page.locator('[role="dialog"]');
  const innerText = await dialogEl.innerText().catch(() => '');
  console.log('Dialog text (first 300):', innerText.slice(0, 300));

  // Find any clickable element with "Sapiens" text
  const sapItems = page.locator('button, [onclick], [role="button"], [class*="cursor"]').filter({ hasText: /Sapiens/i });
  const sapCount = await sapItems.count();
  console.log('Sapiens clickable items:', sapCount);
  
  if (sapCount > 0) {
    // Log what each one is
    for (let i = 0; i < Math.min(sapCount, 3); i++) {
      const tag = await sapItems.nth(i).evaluate(el => el.tagName);
      const cls = await sapItems.nth(i).getAttribute('class') || '';
      const txt = await sapItems.nth(i).textContent() || '';
      console.log(`  [${i}] ${tag} | ${txt.slice(0,40)} | ${cls.slice(0,50)}`);
    }
    await sapItems.first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/pw-editions-quickadd.png` });
    
    const qa = await page.locator('text=Aggiungi subito').count();
    const dl = await page.locator('button').filter({ hasText: /^Da leggere$/ }).count();
    const personalizza = await page.locator('text=Personalizza').count();
    console.log('"Aggiungi subito" text:', qa, '| "Da leggere" btn:', dl, '| "Personalizza":', personalizza);
  }

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
