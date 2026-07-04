import { chromium } from './node_modules/playwright/index.mjs';
const BASE = 'http://localhost:3000';
const OUT  = 'C:/Users/Peggy18/Documents/Marco/Progetti/ProgettoLibreria';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'marcolarocca.p@gmail.com');
  await page.fill('input[type="password"]', 'TestVibrazioni2024!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(libreria|dashboard)/, { timeout: 15000 });

  await page.goto(`${BASE}/libri`);
  await page.waitForTimeout(2000);

  const addBtn = page.locator('button').filter({ hasText: /Aggiungi/i }).first();
  await addBtn.click();
  await page.waitForTimeout(500);

  const inp = page.locator('input').first();
  await inp.fill('Sapiens');
  console.log('Waiting 6s for API results...');
  await page.waitForTimeout(6000);
  
  // Full dialog HTML to understand structure
  const dialogHTML = await page.locator('[role="dialog"]').innerHTML().catch(() => '');
  console.log('Dialog HTML snippet:', dialogHTML.slice(0, 1500));
  
  await page.screenshot({ path: `${OUT}/pw-search-6s.png` });
  console.log('Screenshot: search after 6s');

  // Try all elements with any text that looks like a book title
  const allClickable = page.locator('[role="dialog"] button, [role="dialog"] [class*="cursor"]');
  const count = await allClickable.count();
  console.log('Clickable items in dialog:', count);
  for (let i = 0; i < Math.min(count, 8); i++) {
    const txt = (await allClickable.nth(i).textContent() || '').trim().slice(0, 50);
    console.log(`  [${i}]`, txt);
  }

  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
