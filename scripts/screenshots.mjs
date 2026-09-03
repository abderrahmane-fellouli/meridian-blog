/* Step 10 visual comparison screenshots: production app vs prototype. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "shots");
mkdirSync(OUT, { recursive: true });

const PROD = "http://localhost:3100";
const PROT = "http://localhost:4173";
const SLUG = "brutalist-interfaces-and-the-beauty-of-the-unpolished";
const EDITOR_ID = "f5d66fbc-9fcb-47be-adeb-47ba577acedb";

const envs = {};
for (const line of readFileSync(resolve(HERE, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0) envs[line.slice(0, i)] = line.slice(i + 1);
}

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];
const themes = ["light", "dark"];
const mode = process.argv[2] ?? "prod";

async function prodShots(browser) {
  const base = join(OUT, "prod");
  const ctx = await browser.newContext();
  let sessionCookie = null;
  {
    const page = await ctx.newPage();
    const res = await page.request.post(`${PROD}/api/auth/sign-in/email`, {
      data: { email: envs.OWNER_EMAIL, password: envs.OWNER_BOOTSTRAP_PASSWORD },
    });
    const setc = res.headers()["set-cookie"] ?? "";
    const m = setc.match(/better-auth\.session_token=([^;]+)/);
    if (res.status() === 200 && m) sessionCookie = m[1];
    await page.close();
    console.log("prod sign-in:", res.status(), sessionCookie ? "ok" : "NO COOKIE");
  }
  if (sessionCookie)
    await ctx.addCookies([
      { name: "better-auth.session_token", value: sessionCookie, domain: "localhost", path: "/" },
    ]);

  const routes = [
    ["home", "/"],
    ["blog", "/blog"],
    ["article", `/blog/${SLUG}`],
    ["dashboard", "/admin/dashboard"],
    ["posts", "/admin/posts"],
    ["editor", `/admin/posts/${EDITOR_ID}`],
    ["settings", "/admin/settings"],
  ];

  const page = await ctx.newPage();
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const theme of themes) {
      await ctx.addCookies([{ name: "theme", value: theme, domain: "localhost", path: "/" }]);
      for (const [name, path] of routes) {
        const res = await page.goto(`${PROD}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(name === "editor" ? 2500 : 700);
        const file = join(base, `${name}-${vp.name}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: false });
        console.log(`  prod ${name}-${vp.name}-${theme}.png ${res?.status()}`);
      }
    }
  }
  await ctx.close();
}

async function clickText(page, text) {
  await page.waitForFunction(
    (t) =>
      [...document.querySelectorAll("button")].some((b) => b.offsetParent !== null && b.textContent.trim() === t),
    text,
    { timeout: 10000 }
  );
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find(
      (x) => x.offsetParent !== null && x.textContent.trim() === t
    );
    if (b) b.click();
  }, text);
  await page.waitForTimeout(600);
}

async function protoShots(browser) {
  const base = join(OUT, "proto");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const theme of themes) {
      await page.addInitScript(
        (t) => { try { localStorage.setItem("meridian-theme", t); } catch {} },
        theme
      ).catch(() => {});
      await page.goto(PROT, { waitUntil: "networkidle" });
      await page.evaluate((t) => { localStorage.setItem("meridian-theme", t); document.documentElement.setAttribute("data-theme", t); }, theme);
      await page.goto(PROT, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const shot = async (name) => {
        await page.screenshot({ path: join(base, `${name}-${vp.name}-${theme}.png`), fullPage: false });
        console.log(`  proto ${name}-${vp.name}-${theme}.png`);
      };
      await shot("home");

      if (vp.name === "mobile") {
        await page.getByRole("button", { name: "Toggle menu" }).click();
        await clickText(page, "Blog");
      } else {
        await clickText(page, "Blog");
      }
      await shot("blog");

      await page.locator("article").first().click();
      await page.waitForTimeout(800);
      await shot("article");

      if (vp.name === "mobile") {
        await page.getByRole("button", { name: "Toggle menu" }).click();
        await clickText(page, "Admin");
      } else {
        await clickText(page, "Admin");
      }
      await shot("dashboard");

      if (vp.name === "mobile") {
        await page.locator("div.lg\\:hidden button").nth(1).click();
        await clickText(page, "Posts");
      } else {
        await clickText(page, "Posts");
      }
      await shot("posts");

      if (vp.name === "mobile") {
        await page.locator("div.lg\\:hidden button").nth(1).click();
        await clickText(page, "New Post");
      } else {
        await clickText(page, "New Post");
      }
      await page.waitForTimeout(800);
      await shot("editor");
    }
  }
  await ctx.close();
}

const browser = await chromium.launch({ args: ["--disable-gpu"] });
try {
  if (mode === "prod") {
    console.log("PROD screenshots");
    await prodShots(browser);
  } else if (mode === "proto") {
    console.log("PROTO screenshots");
    await protoShots(browser);
  } else {
    console.log("PROD screenshots");
    await prodShots(browser);
    console.log("PROTO screenshots");
    await protoShots(browser);
  }
} finally {
  await browser.close();
}
console.log("done.");