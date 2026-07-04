import { chromium } from './node_modules/playwright/index.mjs';

const BASE  = 'http://localhost:3000';
const EMAIL = 'marcolarocca.p@gmail.com';
const PASS  = 'TestVibrazioni2024!';
const OUT   = 'C:/Users/Peggy18/Documents/Marco/Progetti/ProgettoLibreria';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(libreria|dashboard)/, { timeout: 15000 });
  console.log('Logged in at:', page.url());

  // /libri page
  await page.goto(`${BASE}/libri`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/pw-libri-loaded.png` });
  console.log('Screenshot: libri loaded');

  // Find clickable book rows (list view)
  // The book rows have class including 'cursor-pointer' and are inside 'space-y-1'
  const listRows = page.locator('div').filter({ has: page.locator('p.font-display') }).filter({ hasClass: /cursor-pointer/ });
  let rowCount = await listRows.count();
  console.log('List rows with font-display:', rowCount);

  // Alternative: any motion div with cursor-pointer that has a title
  const motionRows = page.locator('div[class*="cursor-pointer"][class*="grid"]');
  const mCount = await motionRows.count();
  console.log('Grid+cursor rows:', mCount);

  if (mCount > 0) {
    await motionRows.first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/pw-libri-panel.png` });
    console.log('Screenshot: BookEditPanel');
    
    const panelVisible = await page.locator('[role="dialog"]').count();
    const salvaBtn = await page.locator('button').filter({ hasText: /Salva/ }).count();
    const lettoPill = await page.locator('button').filter({ hasText: /^Letto$/ }).count();
    console.log(`Panel dialog: ${panelVisible}, Salva: ${salvaBtn}, Letto pill: ${lettoPill}`);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // AddBookDialog - find the add button in TopBar
  // TopBar renders a "+ Nuovo libro" style button
  const allBtns = await page.locator('button').all();
  let addBtn = null;
  for (const btn of allBtns) {
    const txt = (await btn.textContent() || '').trim();
    const title = (await btn.getAttribute('title') || '').trim();
    if (/nuovo|aggiungi|add/i.test(txt) || /nuovo|aggiungi|add/i.test(title)) {
      console.log('Found add btn:', txt || title);
      addBtn = btn;
      break;
    }
  }

  if (!addBtn) {
    // TopBar likely has an icon-only button - try the first button in the top area
    console.log('No text match — scanning all buttons...');
    for (const btn of allBtns.slice(0, 10)) {
      const cls = (await btn.getAttribute('class') || '');
      const txt = (await btn.textContent() || '').trim();
      console.log(' btn:', txt.slice(0,20), '|', cls.slice(0,40));
    }
  }

  if (addBtn) {
    await addBtn.click();
    await page.waitForTimeout(600);
    const dialogOpen = await page.locator('[role="dialog"]').count();
    console.log('Dialog open:', dialogOpen);
    await page.screenshot({ path: `${OUT}/pw-dialog-search.png` });
    console.log('Screenshot: dialog search step');

    if (dialogOpen) {
      // Test manual entry path
      const manualBtn = page.locator('button').filter({ hasText: /manualmente/i });
      const mCount2 = await manualBtn.count();
      console.log('Manual button:', mCount2);
      if (mCount2 > 0) {
        await manualBtn.first().click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/pw-dialog-manual.png` });
        console.log('Screenshot: manual entry form');
        // Go back
        const backBtn = page.locator('button[aria-label*="passo"]');
        if (await backBtn.count() > 0) await backBtn.click();
        await page.waitForTimeout(300);
      }

      // Search
      const inp = page.locator('input').first();
      await inp.fill('Sapiens');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/pw-dialog-results.png` });
      console.log('Screenshot: search results');

      // Click first result
      const firstResult = page.locator('li, [class*="result"], button[class*="rounded"]').filter({ hasText: /Sapiens/i }).first();
      const rCnt = await firstResult.count();
      console.log('Sapiens results found:', rCnt);
      if (rCnt > 0) {
        await firstResult.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${OUT}/pw-dialog-editions.png` });
        console.log('Screenshot: editions+quickadd');
        const qa = await page.locator('text=Aggiungi subito').count();
        const dl = await page.locator('button').filter({ hasText: /^Da leggere$/ }).count();
        console.log('Quick-add bar:', qa, '| Da leggere btns:', dl);
      }
    }
  }

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
