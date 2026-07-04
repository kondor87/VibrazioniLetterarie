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

  // /libri: click book → BookEditPanel
  await page.goto(`${BASE}/libri`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/pw-v2-libri.png` });

  // Click first book in list
  const firstRow = page.locator('div[class*="cursor-pointer"][class*="grid"]').first();
  await firstRow.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/pw-v2-panel.png` });
  
  const salva = await page.locator('button').filter({ hasText: /^Salva$/ }).count();
  const statuses = await page.locator('button').filter({ hasText: /^Letto$|^In corso$|^Da leggere$|^Abbandonato$/ }).count();
  const stars = await page.locator('button svg.lucide-star').count();
  console.log(`Panel: Salva=${salva}, StatusPills=${statuses}, Stars=${stars}`);

  // Close panel with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Open AddBookDialog
  const addBtn = page.locator('button').filter({ hasText: /Aggiungi/i }).first();
  await addBtn.click();
  await page.waitForTimeout(400);

  // Use pressSequentially to trigger React onChange
  const inp = page.locator('[role="dialog"] input').first();
  await inp.click();
  await inp.pressSequentially('Sapiens', { delay: 80 });
  console.log('Typed Sapiens, waiting for results...');
  await page.waitForTimeout(3500);

  // Check if dropdown appeared
  const dropdownItems = page.locator('[role="dialog"] ul li button');
  const drCount = await dropdownItems.count();
  console.log('Dropdown items:', drCount);
  
  await page.screenshot({ path: `${OUT}/pw-v2-search.png` });

  if (drCount > 0) {
    const firstTitle = await dropdownItems.first().textContent();
    console.log('First result:', firstTitle?.slice(0, 50));
    // Use mousedown to select (matching onMouseDown handler)
    await dropdownItems.first().dispatchEvent('mousedown');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/pw-v2-editions.png` });

    const qa = await page.locator('text=Aggiungi subito').count();
    const daLeggere = await page.locator('[role="dialog"] button').filter({ hasText: /^Da leggere$/ }).count();
    const personalizza = await page.locator('text=Personalizza').count();
    console.log(`Editions: quickadd="${qa}", DaLeggere="${daLeggere}", Personalizza="${personalizza}"`);
  }

  // Test manual entry
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await addBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/pw-v2-dialog-step1.png` });

  const manualBtn = page.locator('button').filter({ hasText: /manualmente/i }).first();
  await manualBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/pw-v2-manual.png` });
  
  const titleInput = await page.locator('[role="dialog"] input').count();
  const continuaBtn = await page.locator('[role="dialog"] button').filter({ hasText: /^Continua$/ }).count();
  console.log(`Manual form: inputs=${titleInput}, Continua=${continuaBtn}`);

  await browser.close();
  console.log('DONE');
})().catch(e => console.error('ERROR:', e.message));
