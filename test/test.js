/**
 * Portfolio Architecture & Quality Assurance Suite
 * Validates security, styling integrity, and color palette components.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");

function findBrowser() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe"
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const cb = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) cb.reject(new Error(data.error.message));
          else cb.resolve(data.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception.description || "Eval error");
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    try { this.ws.close(); } catch (e) {}
  }
}

async function getWsUrl(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const tabs = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, res => {
          let body = "";
          res.on("data", chunk => body += chunk);
          res.on("end", () => resolve(JSON.parse(body)));
        }).on("error", reject);
      });
      const pageTab = tabs.find(t => t.type === "page" && t.webSocketDebuggerUrl);
      if (pageTab) return pageTab.webSocketDebuggerUrl;
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error("Timed out connecting to browser debugging port");
}

async function runStaticTests() {
  console.log("[1/3] Static code & style integrity...");

  const filesToCheck = [
    "index.html", "admin.html", "certificate.html",
    "css/style.css", "css/admin.css",
    "js/data.js", "js/main.js", "js/admin.js", "js/scene.js", "js/palette.js"
  ];

  for (const rel of filesToCheck) {
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");

    // Check no em-dash or en-dash
    if (/[\u2014\u2013]/.test(content)) {
      throw new Error(`Integrity check failed: found em-dash/en-dash in ${rel}`);
    }

    // Check no dashed border in CSS files
    if (rel.endsWith(".css") && content.includes("dashed")) {
      throw new Error(`Integrity check failed: found dashed border in ${rel}`);
    }
  }

  // Verify Hero Box overlay colors in data.js
  const dataJs = fs.readFileSync(path.join(ROOT_DIR, "js/data.js"), "utf8");
  if (!dataJs.includes('heroOverlayColor1: "#0F86A1"') || !dataJs.includes('heroOverlayColor2: "#EBC7B5"')) {
    throw new Error("Integrity check failed: Hero overlay defaults are not Ocean Teal & Amber Peach in data.js");
  }

  // Verify style.css hero overlay backdrop & blur orb suppression
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, "css/style.css"), "utf8");
  if (!styleCss.includes(".hero.has-hero-media .hero-bg-art .hero-blur-orb")) {
    throw new Error("Integrity check failed: hero-blur-orb suppression missing in style.css");
  }

  // Verify admin.css palette component styles
  const adminCss = fs.readFileSync(path.join(ROOT_DIR, "css/admin.css"), "utf8");
  if (!adminCss.includes(".palette-swatch-card") || !adminCss.includes(".palette-swatch-box") || !adminCss.includes(".palette-hex-code")) {
    throw new Error("Integrity check failed: palette component styles missing in admin.css");
  }

  console.log("  ✓ Zero em-dashes, zero dashed borders, and correct design tokens verified.");
}

async function runBrowserTests() {
  const browserPath = findBrowser();
  if (!browserPath) {
    console.log("[2/3] Browser not found, skipping headless integration tests.");
    return;
  }

  console.log("[2/3] Headless browser integration tests...");
  const port = 9444;
  const tempProfile = path.join(ROOT_DIR, ".test-profile-tmp");

  const proc = spawn(browserPath, [
    `--remote-debugging-port=${port}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${tempProfile}`
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    // 1. Test Admin Dashboard Color Palette Component
    await client.send("Page.navigate", { url: "http://127.0.0.1:4173/admin.html" });
    await new Promise(r => setTimeout(r, 1200));

    const loginRes = await client.eval(`
      (async () => {
        // Authenticate into fresh dashboard
        const passInp = document.getElementById("authPass");
        const form = document.getElementById("authForm");
        if (passInp && form) {
          passInp.value = "admin123";
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
        await new Promise(res => setTimeout(res, 600));
        return {
          loggedIn: window.bpData ? window.bpData.isLoggedIn() : false
        };
      })()
    `);
    console.log("  Dashboard login:", loginRes);
    await new Promise(r => setTimeout(r, 600));

    const paletteCheck = await client.eval(`
      (() => {
        // Check Theme tab palette cards
        const themeBtn = document.querySelector('.tab-btn[data-tab="theme"]');
        if (themeBtn) themeBtn.click();
        const cards = document.querySelectorAll(".palette-swatch-card");
        const inputs = document.querySelectorAll(".palette-native-input");
        const hexCodes = document.querySelectorAll(".palette-hex-code");
        return {
          cardCount: cards.length,
          inputCount: inputs.length,
          hexCount: hexCodes.length,
          firstHex: hexCodes[0] ? hexCodes[0].textContent : null
        };
      })()
    `);

    console.log("  Palette components detected:", paletteCheck);
    if (paletteCheck.cardCount < 3) {
      throw new Error("Expected at least 3 color palette components in Theme section, got " + paletteCheck.cardCount);
    }

    // 2. Test Public Site Hero Box Overlay Variables
    await client.send("Page.navigate", { url: "http://127.0.0.1:4173/index.html" });
    await new Promise(r => setTimeout(r, 2200));

    const publicHeroCheck = await client.eval(`
      (() => {
        const hero = document.getElementById("hero");
        if (!hero) return { error: "Hero element missing" };
        const s = window.getComputedStyle(hero);
        const o1 = hero.style.getPropertyValue("--hero-overlay-1") || s.getPropertyValue("--hero-overlay-1");
        const o2 = hero.style.getPropertyValue("--hero-overlay-2") || s.getPropertyValue("--hero-overlay-2");
        const zIndex = s.zIndex;
        return {
          o1,
          o2,
          zIndex,
          hasMediaBackdrop: !!document.getElementById("heroMediaBackdrop")
        };
      })()
    `);

    console.log("  Public hero check:", publicHeroCheck);
    if (!publicHeroCheck.hasMediaBackdrop) {
      throw new Error("Hero media backdrop missing on public site");
    }

    client.close();
    console.log("  ✓ Color palette components & public hero rendering verified.");
  } finally {
    try { proc.kill("SIGKILL"); } catch (e) {}
    try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch (e) {}
  }
}

async function main() {
  console.log("=== PORTFOLIO QUALITY ASSURANCE SUITE ===\n");
  try {
    await runStaticTests();
    await runBrowserTests();
    console.log("\n[3/3] All checks passed successfully.");
  } catch (err) {
    console.error("\n❌ Test Suite Failed:", err);
    process.exit(1);
  }
}

main();
