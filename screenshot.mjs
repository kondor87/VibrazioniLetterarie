import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// 1. Libreria
await page.goto('http://localhost:3002/libreria', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: path.join(__dirname, 'screenshot-libreria.png') });
console.log('1. libreria OK');

// 2. Click "AGGIUNGI LIBRO" — apre dialog
await page.click('button:has-text("AGGIUNGI LIBRO")');
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(__dirname, 'screenshot-dialog-search.png') });
console.log('2. dialog search OK');

// 3. Cerca un libro
await page.fill('input[placeholder*="Cerca"]', 'Sapiens');
await page.waitForTimeout(1800); // debounce + API
await page.screenshot({ path: path.join(__dirname, 'screenshot-dialog-results.png') });
console.log('3. dialog results OK');

await browser.close();
