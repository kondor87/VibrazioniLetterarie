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

  // -- Test 1: Manual entry form --
  const addBtn = page.locator('button').filter({ hasText: /Aggiungi/i }).first();
  await addBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/pw-final-step1.png` });
  console.log('Screenshot: step 1 search');

  const manualBtn = page.locator('button').filter({ hasText: /manualmente/i }).first();
  await manualBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/pw-final-manual.png` });
  const inputs = await page.locator('[role="dialog"] input').count();
  const continua = await page.locator('[role="dialog"] button').filter({ hasText: /^Continua$/ }).count();
  console.log(`Manual form: inputs=${inputs}, Continua=${continua}`);

  // Close dialog by clicking backdrop  
  await page.locator('[aria-label="Chiudi"]').click();
  await page.waitForTimeout(300);

  // -- Test 2: Editions with quick-add bar --
  await addBtn.click();
  await page.waitForTimeout(400);
  const inp = page.locator('[role="dialog"] input').first();
  await inp.click();
  await inp.pressSequentially('Sapiens Harari', { delay: 60 });
  await page.waitForTimeout(3000);

  // Click first result  
  const results = page.locator('[role="dialog"] ul li button').first();
  const rCnt = await results.count();
  console.log('Results found:', rCnt);
  if (rCnt > 0) {
    await results.dispatchEvent('mousedown');
    console.log('Clicked first result, waiting 5s for editions...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/pw-final-editions.png` });
    
    const qa = await page.locator('text=Aggiungi subito').count();
    const dl = await page.locator('[role="dialog"] button').filter({ hasText: /^Da leggere$/ }).count();
    const editions2 = await page.locator('[role="dialog"] .grid button').count();
    console.log(`Editions: quickadd="${qa}", DaLeggere="${dl}", editionCards="${editions2}"`);
  }

  await browser.close();
  console.log('DONE');
})().catch(e => console.error('ERROR:', e.message));
