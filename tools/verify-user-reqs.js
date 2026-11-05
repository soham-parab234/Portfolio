const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const os = require("os");

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
    try { this.ws.close(); } catch(e) {}
  }
}

async function run() {
  const browserPath = findChrome();
  const testDir = os.tmpdir() + "\\chrome_test_reqs_" + Date.now();

  const proc = spawn(browserPath, [
    "--headless=new",
    "--remote-debugging-port=9455",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + testDir,
    "http://127.0.0.1:4173/admin.html"
  ]);

  proc.on("error", (e) => console.error("Chrome proc error:", e));
  await sleep(1800);

  let tabs;
  for (let i = 0; i < 5; i++) {
    try {
      tabs = await new Promise((resolve, reject) => {
        http.get("http://127.0.0.1:9455/json", res => {
          let buf = "";
          res.on("data", c => buf += c);
          res.on("end", () => resolve(JSON.parse(buf)));
        }).on("error", reject);
      });
      break;
    } catch(e) {
      await sleep(500);
    }
  }

  const pageTab = tabs.find(t => t.type === "page");
  if (!pageTab) throw new Error("No page tab found in Chrome");

  const cdp = new CDPClient(pageTab.webSocketDebuggerUrl);
  await cdp.connect();
  console.log("Connected to Chrome via CDP ✓");

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  // Log in as owner
  await cdp.eval(`
    (async () => {
      await new Promise(res => {
        function ck() {
          if (document.readyState === "complete" && window.bpData) res();
          else setTimeout(ck, 100);
        }
        ck();
      });
      await window.bpData.setPassword("admin123");
      window.bpData.setLoggedIn(true);
      window.location.reload();
    })()
  `);
  await sleep(1200);

  console.log("\n--- TEST 1: Dashboard Organization & Card Structure ---");
  const orgCheck = await cdp.eval(`
    (() => {
      const headerBar = document.querySelector(".sec-header-bar");
      const title = document.querySelector(".sec-title");
      const desc = document.querySelector(".sec-desc");
      const cards = Array.from(document.querySelectorAll(".admin-card"));
      const cardTitles = cards.map(c => {
        const t = c.querySelector(".admin-card-title");
        return t ? t.textContent.trim() : null;
      }).filter(Boolean);

      // Check no extra video in document flow causing scroll
      const flowVideo = document.querySelector("body > video");

      return {
        hasHeaderBar: !!headerBar,
        secTitle: title ? title.textContent.trim() : null,
        secDesc: desc ? desc.textContent.trim() : null,
        cardCount: cards.length,
        cardTitles,
        hasFlowVideo: !!flowVideo
      };
    })()
  `);
  console.log("Dashboard organization check:", orgCheck);
  if (!orgCheck.hasHeaderBar || !orgCheck.secTitle) throw new Error("Missing .sec-header-bar");
  if (orgCheck.cardCount < 3) throw new Error("Expected grouped .admin-card elements");
  if (orgCheck.hasFlowVideo) throw new Error("Unwanted video element in root body");

  console.log("\n--- TEST 2: Every Clickable Button Text Editable ---");
  // Check Profile buttons
  const profileBtns = await cdp.eval(`
    (() => {
      const ctaP = document.querySelector('[data-bind="owner.ctaPrimary"]');
      const ctaS = document.querySelector('[data-bind="owner.ctaSecondary"]');
      const ctaR = document.querySelector('[data-bind="owner.ctaResume"]');
      return {
        hasCtaPrimary: !!ctaP,
        ctaPrimaryVal: ctaP ? ctaP.value : null,
        hasCtaSecondary: !!ctaS,
        ctaSecondaryVal: ctaS ? ctaS.value : null,
        hasCtaResume: !!ctaR,
        ctaResumeVal: ctaR ? ctaR.value : null
      };
    })()
  `);
  console.log("Profile action buttons check:", profileBtns);
  if (!profileBtns.hasCtaPrimary || !profileBtns.hasCtaSecondary || !profileBtns.hasCtaResume) {
    throw new Error("Missing CTA button text inputs in Profile section");
  }

  // Switch to Achievements and check button text input
  await cdp.eval(`document.querySelector('.tab-btn[data-tab="achievements"]').click()`);
  await sleep(350);
  const achBtnCheck = await cdp.eval(`
    (() => {
      const btnInp = document.querySelector('[data-bind="achievements.0.btnText"]');
      return {
        hasBtnText: !!btnInp,
        val: btnInp ? btnInp.value : null
      };
    })()
  `);
  console.log("Achievement button text input check:", achBtnCheck);
  if (!achBtnCheck.hasBtnText) throw new Error("Missing Button Text input in Achievements section");

  // Switch to Projects and check button text input
  await cdp.eval(`document.querySelector('.tab-btn[data-tab="projects"]').click()`);
  await sleep(350);
  const projBtnCheck = await cdp.eval(`
    (() => {
      const btnInp = document.querySelector('[data-bind="projects.0.btnText"]');
      return {
        hasBtnText: !!btnInp,
        val: btnInp ? btnInp.value : null
      };
    })()
  `);
  console.log("Project button text input check:", projBtnCheck);
  if (!projBtnCheck.hasBtnText) throw new Error("Missing Button Text input in Projects section");

  console.log("\n--- TEST 3: Casing & Typography Requirements ---");
  const casingCheck = await cdp.eval(`
    (() => {
      const labels = Array.from(document.querySelectorAll(".fl-label"));
      const sampleTransform = labels[0] ? getComputedStyle(labels[0]).textTransform : null;
      const sampleText = labels[0] ? labels[0].textContent.trim() : null;
      return {
        count: labels.length,
        sampleTransform,
        sampleText
      };
    })()
  `);
  console.log("Casing check on .fl-label:", casingCheck);
  if (casingCheck.sampleTransform === "uppercase") {
    throw new Error(".fl-label is still forced uppercase!");
  }

  console.log("\n--- TEST 4: Dynamic Theme & Contrast Adaptation (Dark Background) ---");
  // Set theme to black/dark background and trigger live palette adaptation
  await cdp.eval(`
    (() => {
      // Switch back to profile tab to have card and inputs present
      document.querySelector('.tab-btn[data-tab="profile"]').click();
      
      const st = window.bpAdmin.getState();
      st.theme.bg = "#0B0F19";
      st.theme.accent = "#5AD1FF";
      window.bpData.saveData(st);
      window.bpAdmin.applyTheme();
    })()
  `);
  await sleep(400);

  const darkMetrics = await cdp.eval(`
    (() => {
      const body = document.body;
      const themeMode = body.dataset.themeMode;
      const card = document.querySelector(".admin-card");
      const input = document.querySelector("input[type='text']");
      const label = document.querySelector(".fl-label");

      const cardBg = card ? getComputedStyle(card).backgroundColor : null;
      const inputBg = input ? getComputedStyle(input).backgroundColor : null;
      const inputCol = input ? getComputedStyle(input).color : null;
      const labelCol = label ? getComputedStyle(label).color : null;

      return {
        themeMode,
        cardBg,
        inputBg,
        inputCol,
        labelCol
      };
    })()
  `);
  console.log("Dark theme adaptation metrics:", darkMetrics);
  if (darkMetrics.themeMode !== "dark") throw new Error("Expected themeMode to be 'dark'");
  // In dark mode, input should NOT be white rgb(255, 255, 255)
  if (darkMetrics.inputBg === "rgb(255, 255, 255)") {
    throw new Error("Input background is still solid white in dark theme!");
  }
  // Text should NOT be dark #1B1B1B
  if (darkMetrics.inputCol === "rgb(27, 27, 27)") {
    throw new Error("Input text is dark on dark background!");
  }

  console.log("\n--- TEST 5: Favicon Dynamic Synchronization ---");
  const updatedFavicon = await cdp.eval(`
    (() => {
      const newLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Ccircle cx='5' cy='5' r='5' fill='magenta'/%3E%3C/svg%3E";
      const st = window.bpAdmin.getState();
      st.owner.logo = newLogo;
      window.bpData.saveData(st);
      window.bpAdmin.applyTheme();

      const icon = document.getElementById("siteFavicon");
      return icon ? icon.getAttribute("href") : null;
    })()
  `);
  console.log("Updated favicon href:", updatedFavicon ? updatedFavicon.slice(0, 50) : null);
  if (!updatedFavicon || !updatedFavicon.includes("magenta")) {
    throw new Error("Favicon did not synchronize with owner.logo");
  }

  console.log("\n--- TEST 6: Public Site (`index.html`) Reveal & Visibility of Achievements & About ---");
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:4173/index.html" });
  await sleep(1500);

  const siteVisibilityCheck = await cdp.eval(`
    (async () => {
      // Wait for complete
      await new Promise(res => {
        function ck() {
          if (document.readyState === "complete" && window.bpData) res();
          else setTimeout(ck, 100);
        }
        ck();
      });

      // Scroll to about section
      const aboutSec = document.getElementById("about");
      if (aboutSec) aboutSec.scrollIntoView();
      await new Promise(r => setTimeout(r, 400));

      const aboutExtra = document.getElementById("about-extra");
      const extraCards = Array.from(aboutExtra ? aboutExtra.querySelectorAll(".extra-card") : []);
      const extraCardOpacities = extraCards.map(c => getComputedStyle(c).opacity);

      // Scroll to achievements section
      const achSec = document.getElementById("achievements");
      if (achSec) achSec.scrollIntoView();
      await new Promise(r => setTimeout(r, 400));
      
      const achGrid = document.getElementById("achievements-grid");
      const achCards = Array.from(achGrid ? achGrid.querySelectorAll(".ach-card") : []);
      const achCardOpacities = achCards.map(c => getComputedStyle(c).opacity);

      // Check fav icon on index.html
      const siteFav = document.getElementById("siteFavicon");

      return {
        achCount: achCards.length,
        achCardOpacities,
        extraCount: extraCards.length,
        extraCardOpacities,
        siteFavHref: siteFav ? siteFav.getAttribute("href").slice(0, 50) : null
      };
    })()
  `);
  console.log("Site visibility check:", siteVisibilityCheck);
  if (siteVisibilityCheck.achCount === 0 || siteVisibilityCheck.extraCount === 0) {
    throw new Error("Achievements or About mini-sections missing from DOM!");
  }
  const hasInvisibleAch = siteVisibilityCheck.achCardOpacities.some(o => o === "0");
  if (hasInvisibleAch) {
    throw new Error("One or more achievement cards are stuck invisible at opacity 0!");
  }

  console.log("\n==============================================");
  console.log("✨ ALL 6 USER REQUIREMENT TESTS PASSED! 💯");
  console.log("==============================================");

  cdp.close();
  proc.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
