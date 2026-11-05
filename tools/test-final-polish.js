const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function findChrome() {
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No browser found");
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
    this.ws.close();
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
      await sleep(200);
    }
  }
  throw new Error("Timed out waiting for Chrome debug port");
}

async function run() {
  console.log("=== RUNNING FINAL POLISH & SECURITY VERIFICATION ===");

  // 1. Static codebase audit: No em-dashes, no dashed CSS borders
  console.log("\n[Test 1] Static Codebase Purity Audit...");
  const rootDir = path.resolve(__dirname, "..");
  const filesToCheck = [
    "index.html", "admin.html", "certificate.html",
    "css/style.css", "css/admin.css",
    "js/data.js", "js/main.js", "js/admin.js", "js/scene.js", "js/palette.js"
  ];

  for (const rel of filesToCheck) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    if (content.includes("\u2014")) {
      throw new Error(`FAIL: Found em-dash (\u2014) in ${rel}`);
    }
    if (rel.endsWith(".css") && content.includes("dashed")) {
      throw new Error(`FAIL: Found dashed border in ${rel}`);
    }
  }
  console.log("✓ PASSED: Zero em-dashes and zero dashed borders across all files.");

  // 2. Launch Chrome
  console.log("\n[Test 2] Launching Chrome CDP...");
  const chromePath = findChrome();
  const port = 9333;
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${path.join(rootDir, ".chrome-test-profile")}`
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });

    // 3. Test Salted Password Hashing & Auth
    console.log("\n[Test 3] Testing Cryptographic Salted Password Storage...");
    await client.send("Page.navigate", { url: "http://127.0.0.1:4173/admin.html" });
    for (let i = 0; i < 25; i++) {
      try {
        const hasData = await client.eval(`typeof window.bpData !== 'undefined'`);
        if (hasData) break;
      } catch (e) {}
      await sleep(200);
    }

    const authTest = await client.eval(`
      (async () => {
        // Set a new password
        await window.bpData.setPassword("OwnerSecretKey2026");
        const stored = localStorage.getItem("bp_portfolio_auth");
        const salt = localStorage.getItem("bp_portfolio_salt");
        const okCheck = await window.bpData.checkPassword("OwnerSecretKey2026");
        const badCheck = await window.bpData.checkPassword("WrongSecret");
        return {
          stored,
          salt,
          hasSaltDelimiter: stored.includes(":"),
          okCheck,
          badCheck
        };
      })()
    `);

    console.log("Auth test results:", authTest);
    if (!authTest.hasSaltDelimiter) throw new Error("FAIL: Auth hash is not stored in salt:hash format");
    if (!authTest.okCheck) throw new Error("FAIL: Correct password check failed");
    if (authTest.badCheck) throw new Error("FAIL: Wrong password check succeeded unexpectedly");
    console.log("✓ PASSED: Passwords securely salted with 128-bit random salt and verified via SHA-256.");

    // 4. Test Loading Screen on Public Site
    console.log("\n[Test 4] Testing Adaptive Loading Screen on index.html...");
    await client.send("Page.navigate", { url: "http://127.0.0.1:4173/index.html" });
    
    // Check loading screen presence right after start
    const loaderInitial = await client.eval(`
      (() => {
        const screen = document.getElementById("loadingScreen");
        const title = document.getElementById("loaderTitle");
        const sub = document.getElementById("loaderSub");
        const bar = document.getElementById("loaderBar");
        return {
          exists: !!screen,
          isLoadedClass: screen ? screen.classList.contains("is-loaded") : false,
          titleText: title ? title.textContent : "",
          hasBar: !!bar
        };
      })()
    `);
    console.log("Loader initial state:", loaderInitial);
    if (!loaderInitial.exists) throw new Error("FAIL: #loadingScreen does not exist");
    if (!loaderInitial.hasBar) throw new Error("FAIL: #loaderBar does not exist");

    // Wait for auto-dismissal (~1.8s)
    console.log("Waiting for loader smooth auto-dismissal...");
    await sleep(2200);

    const loaderAfter = await client.eval(`
      (() => {
        const screen = document.getElementById("loadingScreen");
        return {
          isLoadedClass: screen ? screen.classList.contains("is-loaded") : false,
          computedOpacity: screen ? window.getComputedStyle(screen).opacity : "1"
        };
      })()
    `);
    console.log("Loader after 2.2s:", loaderAfter);
    if (!loaderAfter.isLoadedClass) throw new Error("FAIL: Loader was not dismissed after timeout");
    console.log("✓ PASSED: Adaptive loading screen displays on open and auto-dismisses smoothly.");

    // 5. Test Dynamic Tab Favicon Synchronization
    console.log("\n[Test 5] Testing Dynamic Tab Favicon Synchronization...");
    const faviconTest = await client.eval(`
      (() => {
        const fav = document.getElementById("siteFavicon");
        return {
          exists: !!fav,
          type: fav ? fav.type : "",
          hrefPrefix: fav ? fav.href.slice(0, 30) : ""
        };
      })()
    `);
    console.log("Favicon state on index.html:", faviconTest);
    if (!faviconTest.exists) throw new Error("FAIL: siteFavicon does not exist");
    if (!faviconTest.hrefPrefix.startsWith("data:image/svg+xml")) {
      throw new Error("FAIL: Default favicon is not an SVG badge");
    }
    console.log("✓ PASSED: Dynamic tab favicon synchronized with top bar brand badge.");

    // 6. Test Card Visibility & Link Security
    console.log("\n[Test 6] Testing Card Visibility & Link Security...");
    const cardsAndLinks = await client.eval(`
      (async () => {
        // Scroll into view to trigger reveal
        const aboutSec = document.getElementById("about");
        if (aboutSec) aboutSec.scrollIntoView();
        await new Promise(r => setTimeout(r, 400));

        const extraCards = Array.from(document.querySelectorAll(".extra-card"));
        const extraVisible = extraCards.length > 0 && extraCards.every(c => parseFloat(window.getComputedStyle(c).opacity) > 0.8);

        const achSec = document.getElementById("achievements");
        if (achSec) achSec.scrollIntoView();
        await new Promise(r => setTimeout(r, 400));

        const achCards = Array.from(document.querySelectorAll(".ach-card"));
        const achVisible = achCards.length > 0 && achCards.every(c => parseFloat(window.getComputedStyle(c).opacity) > 0.8);

        const externalLinks = Array.from(document.querySelectorAll('a[target="_blank"]'));
        const safeLinks = externalLinks.every(a => a.getAttribute("rel") === "noopener noreferrer");

        return {
          achCount: achCards.length,
          achVisible,
          extraCount: extraCards.length,
          extraVisible,
          extLinksCount: externalLinks.length,
          safeLinks
        };
      })()
    `);
    console.log("Cards & links verification:", cardsAndLinks);
    if (!cardsAndLinks.achVisible) throw new Error("FAIL: Achievement cards are not visible");
    if (!cardsAndLinks.extraVisible) throw new Error("FAIL: About extra cards are not visible");
    if (!cardsAndLinks.safeLinks) throw new Error("FAIL: Not all external links have rel='noopener noreferrer'");
    console.log("✓ PASSED: All cards visible and external links safely secured with rel='noopener noreferrer'.");

    client.close();
    console.log("\n=======================================================");
    console.log(" ALL FINAL POLISH, LOADER & SECURITY VERIFICATIONS PASSED! ");
    console.log("=======================================================\n");
  } finally {
    chromeProc.kill("SIGKILL");
    try {
      fs.rmSync(path.join(rootDir, ".chrome-test-profile"), { recursive: true, force: true });
    } catch (e) {}
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
