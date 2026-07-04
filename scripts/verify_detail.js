/**
 * Verifica /libri e /libri/[id] detail page
 * Usage: node scripts/verify_detail.js
 */

const { chromium } = require("playwright");
const https = require("https");

const SUPABASE_URL     = "https://qshumouizyffkjquzcmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaHVtb3VpenlmZmtqcXV6Y212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMxMjc4OCwiZXhwIjoyMDk2ODg4Nzg4fQ.tw4FGRZMJigB2a-PdkaRE0zDWC0tSffeV00wi8Nuz6A";
const EMAIL            = "marcolarocca.p@gmail.com";
const BASE_URL         = "http://localhost:3000";
const COOKIE_NAME      = "sb-qshumouizyffkjquzcmv-auth-token";
const SCREENSHOTS_DIR  = "C:\\Users\\Peggy18\\Documents\\Marco\\Progetti\\ProgettoLibreria\\scripts";

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    }).on("error", reject);
  });
}

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        ...headers,
      }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on("error", reject);
    req.write(data); req.end();
  });
}

async function getMagicLink() {
  const res = await post(
    `${SUPABASE_URL}/auth/v1/admin/generate_link`,
    { type: "magiclink", email: EMAIL },
    { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }
  );
  if (res.status !== 200) throw new Error(`generate_link failed: ${JSON.stringify(res.body)}`);
  return res.body.action_link;
}

async function getUserBookId() {
  // Get a real user_books ID so we can navigate to the detail page
  const res = await httpsGet(
    `${SUPABASE_URL}/rest/v1/user_books?select=id&limit=1`,
    { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }
  );
  if (!res.body || !res.body[0]) throw new Error("No user_books found");
  return res.body[0].id;
}

async function main() {
  console.log("Generating magic link + fetching book ID...");
  const [magicLink, bookId] = await Promise.all([getMagicLink(), getUserBookId()]);
  console.log(`Book ID for detail test: ${bookId}`);
  console.log("Got magic link");

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // Follow magic link — wait for Supabase client-side JS to process hash and set cookie
  console.log("Following magic link...");
  await page.goto(magicLink, { waitUntil: "load", timeout: 20000 });
  // Wait for Supabase client to detect the hash tokens and set the session cookie
  await page.waitForTimeout(6000);

  let cookies = await ctx.cookies();
  let authCookie = cookies.find(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!authCookie) {
    // Parse hash manually and inject session cookie (Supabase SSR format)
    const url = new URL(page.url());
    const hash = url.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresAt = params.get("expires_at");
    const expiresIn = params.get("expires_in");

    if (!accessToken) throw new Error(`No access token. URL: ${page.url()}`);
    console.log("Injecting session cookie manually...");

    const jwtParts = accessToken.split(".");
    const jwtPayload = JSON.parse(Buffer.from(jwtParts[1], "base64url").toString());

    // @supabase/ssr stores the full session object as JSON
    const sessionObj = {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: parseInt(expiresIn ?? "3600"),
      expires_at: parseInt(expiresAt ?? "0"),
      refresh_token: refreshToken,
      user: {
        id: jwtPayload.sub,
        aud: "authenticated",
        role: "authenticated",
        email: jwtPayload.email,
        email_confirmed_at: new Date().toISOString(),
        phone: "",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { email_verified: true },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_anonymous: false,
      }
    };

    await ctx.addCookies([{
      name: "sb-qshumouizyffkjquzcmv-auth-token",
      value: JSON.stringify(sessionObj),
      domain: "localhost", path: "/", sameSite: "Lax",
      httpOnly: false, secure: false,
    }]);
    console.log("✓ Session cookie injected");
  } else {
    console.log("✓ Auth cookie auto-set by Supabase client:", authCookie.name);
  }

  // Navigate to /libri and wait for auth + data to load
  await page.goto(`${BASE_URL}/libri`, { waitUntil: "load" });
  await page.waitForTimeout(5000); // wait for useAuth + useLibrary to complete

  // ── Test 1: /libri list view ──────────────────────────────────────────────
  console.log("\n[1] Testing /libri list view...");
  await page.screenshot({ path: `${SCREENSHOTS_DIR}\\01_libri_list.png`, fullPage: false });
  console.log("✓ Screenshot: 01_libri_list.png");

  // Listen for JS errors
  page.on("pageerror", err => console.log("  ⚠ PAGE ERROR:", err.message));
  page.on("console", msg => {
    if (msg.type() === "error") console.log("  ⚠ CONSOLE ERR:", msg.text());
  });

  // Test row click (soft test — just verify it works in the browser)
  const rows = page.locator("div.divide-y").first().locator("> div");
  const rowCount = await rows.count();
  console.log(`  Book rows visible: ${rowCount}`);
  if (rowCount > 0) {
    const firstRow = rows.first();
    const title = await firstRow.locator("p").first().textContent({ timeout: 3000 }).catch(() => "?");
    console.log(`  First row title: "${title?.trim()}"`);

    // Log what happens on click via evaluate
    await page.evaluate(() => {
      const div = document.querySelector(".divide-y > div");
      if (div) {
        console.log("Found row div, attaching nav listener");
        window.addEventListener("popstate", () => console.log("POPSTATE!"));
      }
    });

    await firstRow.click();
    await page.waitForTimeout(5000);
    const urlAfter = page.url();
    console.log(`  URL after click: ${urlAfter}`);
    if (urlAfter.includes("/libri/")) {
      console.log("  ✓ Row click navigated to detail page");
    } else {
      console.log("  ⚠ Row click didn't navigate — using direct URL for detail test");
    }
  }

  // Navigate directly to detail page
  await page.goto(`${BASE_URL}/libri/${bookId}`, { waitUntil: "load" });
  await page.waitForTimeout(6000);

  // Navigate directly to detail page with known UUID
  await page.goto(`${BASE_URL}/libri/${bookId}`, { waitUntil: "load" });

  // ── Test 2: /libri/[id] detail page ──────────────────────────────────────
  console.log("\n[2] Testing /libri/[id] detail page...");
  console.log(`  URL: ${page.url()}`);

  // Wait for auth + data (useAuth async, then useLibrary query)
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}\\02_libro_detail.png`, fullPage: false });
  console.log("✓ Screenshot: 02_libro_detail.png");

  // Check key elements — avoid script tags
  const h1 = await page.locator("h1").first().textContent({ timeout: 3000 }).catch(() => null);
  const hasBackBtn = (await page.locator("button:has-text('I miei libri')").count()) > 0;
  const pageTitle = await page.title();
  const visibleText = await page.evaluate(() => {
    // Get only visible text, excluding script/style content
    const walker = document.createTreeWalker(
      document.body, NodeFilter.SHOW_TEXT,
      { acceptNode: n => {
        const p = n.parentElement;
        if (!p || p.tagName === "SCRIPT" || p.tagName === "STYLE") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }}
    );
    let text = ""; let node;
    while ((node = walker.nextNode())) text += node.textContent + " ";
    return text.replace(/\s+/g, " ").trim().slice(0, 200);
  });
  console.log(`  Page title: "${pageTitle}"`);
  console.log(`  Visible text: "${visibleText.slice(0, 150)}"`);

  if (h1) {
    console.log(`  ✓ Title h1: "${h1.trim()}"`);
  } else if (visibleText.includes("non trovato")) {
    console.log(`  ✗ "Libro non trovato" shown`);
  } else {
    console.log(`  ? No h1 — might still be loading`);
  }
  console.log(`  Back button: ${hasBackBtn ? "✓" : "✗"}`);

  // Scroll down to see description, metadata
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}\\03_libro_detail_scrolled.png`, fullPage: false });
  console.log("✓ Screenshot: 03_libro_detail_scrolled.png");

  // Test back navigation
  if (hasBackBtn) {
    await page.locator("button:has-text('I miei libri')").first().click();
    await page.waitForTimeout(2000);
    console.log(`  Back nav → ${page.url()}`);
  }

  // ── Test 3: grid view → detail ────────────────────────────────────────────
  console.log("\n[3] Testing grid view click → detail...");
  const gridBtn = page.locator("button").filter({ has: page.locator("svg") }).nth(1);
  // Toggle to grid (the second view toggle button)
  const viewToggle = page.locator(".flex.items-center.gap-1.bg-surface-2 button");
  await viewToggle.last().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}\\04_libri_grid.png`, fullPage: false });
  console.log("✓ Screenshot: 04_libri_grid.png");

  await browser.close();
  console.log("\n✓ All tests complete!");
}

main().catch(e => { console.error("✗ Error:", e.message); process.exit(1); });
