/**
 * Verifica /libreria → BookDetail panel → "Scheda completa" link
 */
const { chromium } = require("playwright");
const https = require("https");

const SUPABASE_URL     = "https://qshumouizyffkjquzcmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaHVtb3VpenlmZmtqcXV6Y212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMxMjc4OCwiZXhwIjoyMDk2ODg4Nzg4fQ.tw4FGRZMJigB2a-PdkaRE0zDWC0tSffeV00wi8Nuz6A";
const EMAIL            = "marcolarocca.p@gmail.com";
const BASE_URL         = "http://localhost:3000";
const SCREENSHOTS_DIR  = "C:\\Users\\Peggy18\\Documents\\Marco\\Progetti\\ProgettoLibreria\\scripts";

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), ...headers }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on("error", reject); req.write(data); req.end();
  });
}

async function getMagicLink() {
  const res = await post(`${SUPABASE_URL}/auth/v1/admin/generate_link`,
    { type: "magiclink", email: EMAIL },
    { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }
  );
  return res.body.action_link;
}

async function main() {
  console.log("Getting magic link...");
  const magicLink = await getMagicLink();

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // Auth via magic link
  await page.goto(magicLink, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(5000);

  let cookies = await ctx.cookies();
  if (!cookies.find(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))) {
    const url = new URL(page.url());
    const params = new URLSearchParams(url.hash.slice(1));
    const accessToken = params.get("access_token");
    if (!accessToken) throw new Error("No access token");
    const jwt = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());
    await ctx.addCookies([{
      name: "sb-qshumouizyffkjquzcmv-auth-token",
      value: JSON.stringify({
        access_token: accessToken, token_type: "bearer",
        expires_in: parseInt(params.get("expires_in") ?? "3600"),
        expires_at: parseInt(params.get("expires_at") ?? "0"),
        refresh_token: params.get("refresh_token"),
        user: { id: jwt.sub, aud: "authenticated", role: "authenticated", email: jwt.email,
          app_metadata: { provider: "email" }, user_metadata: {}, created_at: new Date().toISOString() }
      }),
      domain: "localhost", path: "/", sameSite: "Lax", httpOnly: false, secure: false,
    }]);
    console.log("✓ Session injected");
  }

  // Navigate to /libreria
  await page.goto(`${BASE_URL}/libreria`, { waitUntil: "load" });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}\\libreria_01_grid.png` });
  console.log("✓ Screenshot: libreria_01_grid.png");

  // Click first book cover
  const firstCover = page.locator("[data-book-id], .cursor-pointer").first();
  const coverCount = await firstCover.count();
  console.log(`  Clickable covers: ${coverCount}`);

  // Try clicking the first image or cover element
  const covers = page.locator("img[alt]").first();
  if (await covers.count() > 0) {
    await covers.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}\\libreria_02_panel.png` });
    console.log("✓ Screenshot: libreria_02_panel.png (after click — should show BookDetail panel)");

    // Check for "Scheda completa" button
    const schedaBtn = page.locator("text=Scheda completa");
    const hasScheda = await schedaBtn.count() > 0;
    console.log(`  "Scheda completa" button: ${hasScheda ? "✓" : "✗"}`);

    if (hasScheda) {
      await schedaBtn.first().click();
      await page.waitForTimeout(3000);
      console.log(`  Navigated to: ${page.url()}`);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}\\libreria_03_detail.png` });
      console.log("✓ Screenshot: libreria_03_detail.png");
      const h1 = await page.locator("h1").first().textContent({ timeout: 3000 }).catch(() => "NOT FOUND");
      console.log(`  Detail page h1: "${h1?.trim()}"`);
    }
  }

  await browser.close();
  console.log("\n✓ Done");
}

main().catch(e => { console.error("✗ Error:", e.message); process.exit(1); });
