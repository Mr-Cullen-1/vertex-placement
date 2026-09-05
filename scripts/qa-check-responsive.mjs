/**
 * Manual browser QA helper — checks every important route for horizontal
 * overflow at a fixed set of viewport widths (see /docs/DESIGN_SYSTEM.md
 * "No horizontal scrolling"). NOT part of `npm test` — this project's
 * automated suite runs against Vitest's Node environment (no real
 * browser/layout engine), so real horizontal-overflow regressions can
 * only be caught this way, by hand, before/after a UI change.
 *
 * Setup (one-time, per machine):
 *   npm install --no-save playwright-core
 *   (uninstall afterwards: npm uninstall playwright-core --no-save —
 *   it is intentionally NOT a project dependency)
 *
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. Seed at least one of everything with REALISTIC LONG DATA (a long
 *      candidate name/email, a long test title, an international phone
 *      number, a long placement-band label like "Upper Intermediate") —
 *      short/lorem fixture data will not reproduce a real overflow.
 *   3. Set the environment variables below and run:
 *        QA_ADMIN_EMAIL=... QA_ADMIN_PASSWORD=... \
 *        QA_TEST_ID=... QA_CANDIDATE_ID=... QA_ASSIGNMENT_ID=... QA_ATTEMPT_ID=... \
 *        [QA_TOKEN=...] \
 *        node scripts/qa-check-responsive.mjs
 *
 * Exits non-zero if any route/width combination shows overflow.
 *
 * A passing numeric check is necessary but not sufficient — always also
 * look at the rendered page at a couple of the failing-est widths;
 * content can be clipped or unreadable without technically overflowing.
 */
import { chromium } from "playwright-core";

const CHROME_PATH =
  process.env.QA_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";
const WIDTHS = [1440, 1280, 1024, 900, 899, 768, 480, 375, 320];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/tests",
  process.env.QA_TEST_ID && `/admin/tests/${process.env.QA_TEST_ID}`,
  process.env.QA_TEST_ID && `/admin/tests/${process.env.QA_TEST_ID}/questions`,
  "/admin/candidates",
  process.env.QA_CANDIDATE_ID && `/admin/candidates/${process.env.QA_CANDIDATE_ID}`,
  "/admin/assignments",
  process.env.QA_ASSIGNMENT_ID && `/admin/assignments/${process.env.QA_ASSIGNMENT_ID}`,
  process.env.QA_ATTEMPT_ID && `/admin/results/${process.env.QA_ATTEMPT_ID}`,
].filter(Boolean);

async function checkOverflow(page, label) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector("main");
    return {
      docOverflow: doc.scrollWidth - doc.clientWidth,
      mainOverflow: main ? main.scrollWidth - main.clientWidth : null,
    };
  });
  const bad = result.docOverflow > 1 || (result.mainOverflow ?? 0) > 1;
  console.log(
    `${bad ? "OVERFLOW" : "ok      "} ${label.padEnd(60)} doc:${result.docOverflow} main:${result.mainOverflow}`
  );
  return bad;
}

const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
let anyOverflow = false;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  if (process.env.QA_ADMIN_EMAIL) {
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill(process.env.QA_ADMIN_EMAIL);
    await page.locator("#password").fill(process.env.QA_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${BASE_URL}/admin`);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ADMIN_ROUTES) {
        try {
          await page.goto(`${BASE_URL}${route}`, { waitUntil: "load", timeout: 45000 });
          anyOverflow = (await checkOverflow(page, `${width}px ${route}`)) || anyOverflow;
        } catch (e) {
          console.log(`ERROR    ${width}px ${route}: ${e.message.split("\n")[0]}`);
          anyOverflow = true;
        }
      }
    }
  }

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/try", "/admin/login"]) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load", timeout: 45000 });
      anyOverflow = (await checkOverflow(page, `${width}px ${route}`)) || anyOverflow;
    }
    if (process.env.QA_TOKEN) {
      await page.goto(`${BASE_URL}/placement/${process.env.QA_TOKEN}`, { waitUntil: "load", timeout: 45000 });
      anyOverflow = (await checkOverflow(page, `${width}px /placement/{token}`)) || anyOverflow;
    }
  }

  console.log(anyOverflow ? "\nFAIL: overflow detected somewhere above" : "\nPASS: no overflow at any checked route/width");
} finally {
  await browser.close();
}
process.exit(anyOverflow ? 1 : 0);
