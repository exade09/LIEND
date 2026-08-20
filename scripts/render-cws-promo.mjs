import { createServer } from "node:http";
import { readFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(REPO, "tmp/cws-promo");
const OUT = join(REPO, "public/assets/store/cws");
const { chromium } = createRequire(join(ROOT, "package.json"))("playwright");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function serve(dir) {
  return new Promise((ok) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent((req.url || "/").split("?")[0]);
      const file = join(dir, url === "/" ? "tile-01.html" : url.slice(1));
      try {
        const body = readFileSync(file);
        res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("missing");
      }
    });
    server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port }));
  });
}

async function shot(page, url, file, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: file, type: "png" });
}

async function captureLive(page) {
  const dest = join(ROOT, "shot-gate.png");
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("https://liend.vercel.app/", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForTimeout(2500);
    const stage = page.locator("#product-stage");
    if (await stage.count()) {
      await stage.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await stage.screenshot({ path: dest, type: "png" });
    } else {
      await page.screenshot({ path: dest, type: "png" });
    }
    return true;
  } catch (err) {
    console.warn("live landing capture failed", err.message);
    return false;
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  copyFileSync(join(REPO, "apps/extension/public/sidepanel.css"), join(ROOT, "sidepanel.css"));

  const { server, port } = await serve(ROOT);
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const liveOk = existsSync(join(ROOT, "shot-gate.png")) || (await captureLive(page));
  if (!liveOk) {
    console.warn("using borrow capture as gate fallback");
    await shot(page, `${origin}/capture-borrow.html`, join(ROOT, "shot-gate.png"), 1280, 800);
  }

  await shot(page, `${origin}/capture-borrow.html`, join(ROOT, "shot-borrow.png"), 1280, 800);
  await shot(page, `${origin}/capture-panel.html`, join(ROOT, "shot-panel.png"), 360, 640);

  await shot(page, `${origin}/tile-01.html`, join(OUT, "screenshot-01-logo-1280x800.png"), 1280, 800);
  await shot(page, `${origin}/tile-02.html`, join(OUT, "screenshot-02-access-1280x800.png"), 1280, 800);
  await shot(page, `${origin}/tile-03.html`, join(OUT, "screenshot-03-borrow-1280x800.png"), 1280, 800);
  await shot(page, `${origin}/tile-04.html`, join(OUT, "screenshot-04-faq-1280x800.png"), 1280, 800);

  await shot(page, `${origin}/tile-01.html`, join(OUT, "small-promo-440x280.png"), 440, 280);
  await shot(page, `${origin}/tile-02.html`, join(OUT, "marquee-1400x560.png"), 1400, 560);

  copyFileSync(join(OUT, "screenshot-02-access-1280x800.png"), join(OUT, "screenshot-app-1280x800.png"));
  copyFileSync(join(OUT, "screenshot-03-borrow-1280x800.png"), join(OUT, "screenshot-extension-1280x800.png"));

  await browser.close();
  server.close();
  console.log("wrote", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
