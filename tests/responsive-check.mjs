import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const widths = [320,375,414,768,1024,1280,1536];
const screenshotDir = "screenshots";

if (!existsSync(screenshotDir)) mkdirSync(screenshotDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(
    command,
    args,
    { stdio: "inherit", shell: process.platform === "win32" }
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Running npm install...");
run(process.platform === "win32" ? "npm.cmd" : "npm", ["install"]);

console.log("Running npm run build...");
run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);

const server = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vite", "preview", "--port", "4173", "--host", "127.0.0.1"],
  { stdio: "inherit", shell: process.platform === "win32" }
);

const stopServer = () => {
  if (!server.killed) server.kill("SIGTERM");
};
process.on("exit", stopServer);

await new Promise((resolve, reject) => {
  const start = Date.now();
  const check = () => {
    fetch("http://127.0.0.1:4173")
      .then((response) => {
        if (response.ok) resolve();
        else setTimeout(check, 250);
      })
      .catch(() => {
        if (Date.now() - start > 30000) {
          reject(new Error("Vite preview did not start within 30 seconds."));
        } else {
          setTimeout(check, 250);
        }
      });
  };
  check();
});

const runnerPath = 'tests/.responsive-runner.cjs';
const runner = [
  "const { chromium } = require('playwright');",
  "const widths = " + JSON.stringify([320,375,414,768,1024,1280,1536]) + ";",
  "(async () => {",
  "  const browser = await chromium.launch({ headless: true });",
  "  const results = [];",
  "  const page = await browser.newPage();",
  "  const consoleErrors = [];",
  "  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });",
  "  page.on('pageerror', (error) => consoleErrors.push(String(error)));",
  "  for (const width of widths) {",
  "    consoleErrors.length = 0;",
  "    await page.setViewportSize({ width, height: 900 });",
  "    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });",
  "    const checks = await page.evaluate((viewportWidth) => {",
  "      const countTracks = (value) => !value || value === 'none' ? 1 : value.split(' ').filter(Boolean).length;",
  "      const overflows = [...document.querySelectorAll('main *, header *')]",
  "        .filter((element) => element.getAttribute('data-decorative') !== 'true')",
  "        .filter((element) => element.getAttribute('aria-hidden') !== 'true')",
  "        .map((element) => ({ element, rect: element.getBoundingClientRect() }))",
  "        .filter(({ rect }) => rect.width > 0 && rect.right > viewportWidth + 1);",
  "      const gridSingle = (selector) => {",
  "        const element = document.querySelector(selector);",
  "        if (!element) return true;",
  "        return countTracks(getComputedStyle(element).gridTemplateColumns) <= 1;",
  "      };",
  "      const heroH1 = document.querySelector('.hero h1')?.getBoundingClientRect();",
  "      const menu = document.querySelector('.header-menu');",
  "      const navLinks = [...document.querySelectorAll('.site-header nav a')];",
  "      const email = document.querySelector('.contact-email');",
  "      const emailRect = email?.getBoundingClientRect();",
  "      const emailParentRect = email?.parentElement?.getBoundingClientRect();",
  "      return {",
  "        scrollWidth: document.documentElement.scrollWidth,",
  "        overflowCount: overflows.length,",
  "        heroInside: !heroH1 || heroH1.right <= viewportWidth + 1,",
  "        mobileGridsSingle: viewportWidth > 980 || (gridSingle('.hero__grid') && gridSingle('.section__intro') && gridSingle('.about__grid') && gridSingle('.project-card.is-open .project-card__content')),",
  "        menuVisible: viewportWidth > 980 || (menu && getComputedStyle(menu).display !== 'none' && menu.getBoundingClientRect().height >= 44),",
  "        navVisible: viewportWidth < 1024 || navLinks.some((link) => getComputedStyle(link).display !== 'none' && link.getBoundingClientRect().width > 0),",
  "        emailInside: !emailRect || !emailParentRect || (emailRect.left >= emailParentRect.left - 1 && emailRect.right <= emailParentRect.right + 1),",
  "      };",
  "    }, width);",
  "    const before = await page.locator('.project-card').count();",
  "    await page.getByRole('button', { name: 'AI / ML', exact: true }).click();",
  "    const filtered = await page.locator('.project-card').count();",
  "    await page.getByRole('button', { name: 'All', exact: true }).click();",
  "    const projectButton = page.locator('.project-card__toggle').first();",
  "    const beforeOpen = await projectButton.getAttribute('aria-expanded');",
  "    await projectButton.click();",
  "    const afterOpen = await projectButton.getAttribute('aria-expanded');",
  "    await projectButton.click();",
  "    const afterClose = await projectButton.getAttribute('aria-expanded');",
  "    let menuOpens = true;",
  "    if (width <= 980) {",
  "      await page.getByRole('button', { name: 'Open menu' }).click();",
  "      menuOpens = await page.getByRole('dialog').isVisible();",
  "      await page.keyboard.press('Escape');",
  "    }",
  "    const pass = checks.scrollWidth <= width && checks.overflowCount === 0 && checks.heroInside && checks.mobileGridsSingle && checks.menuVisible && checks.navVisible && checks.emailInside && consoleErrors.length === 0 && filtered < before && beforeOpen !== afterOpen && afterClose === beforeOpen && menuOpens;",
  "    await page.screenshot({ path: 'screenshots/' + width + '.png', fullPage: true });",
  "    results.push({ width, pass, overflow: checks.scrollWidth > width || checks.overflowCount > 0, grids: checks.mobileGridsSingle, hero: checks.heroInside, menu: checks.menuVisible, nav: checks.navVisible, filter: filtered < before, projectToggle: beforeOpen !== afterOpen && afterClose === beforeOpen, email: checks.emailInside, console: consoleErrors.length === 0, errors: consoleErrors.slice(0, 2) });",
  "  }",
  "  console.table(results);",
  "  await browser.close();",
  "  if (results.some((item) => !item.pass)) process.exit(1);",
  "})();"
].join('\\n');

writeFileSync(runnerPath, runner, 'utf8');
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', '-p', 'playwright', 'node', runnerPath]);
rmSync(runnerPath, { force: true });
