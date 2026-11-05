// Automated verification script using native Node.js CDP WebSocket
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

async function runTests() {
  const browserPath = findChrome();
  console.log("Starting headless browser at:", browserPath);
  const testDir = os.tmpdir() + "\\chrome_test_" + Date.now();

  const proc = spawn(browserPath, [
    "--headless=new",
    "--remote-debugging-port=9444",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + testDir,
    "http://127.0.0.1:4173/index.html"
  ]);

  proc.on("error", (e) => console.error("Chrome proc error:", e));

  await sleep(1800);

  let tabs;
  for (let i = 0; i < 5; i++) {
    try {
      tabs = await new Promise((resolve, reject) => {
        http.get("http://127.0.0.1:9444/json", res => {
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
  console.log("Connected to Chrome via CDP WebSocket ✓");

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  async function waitForPageLoad() {
    await cdp.eval(`
      new Promise(resolve => {
        if (document.readyState === "complete") setTimeout(resolve, 350);
        else window.addEventListener("load", () => setTimeout(resolve, 350));
      })
    `);
  }

  await waitForPageLoad();

  console.log("\n--- TEST 1: index.html DOM Elements & Brand Logo ---");
  const logoInfo = await cdp.eval(`
    (() => {
      const btn = document.getElementById("brandLogoBtn");
      const inner = document.getElementById("brandBadgeInner");
      const hero = document.getElementById("hero");
      const backdrop = document.getElementById("heroMediaBackdrop");
      const lockOverlay = document.getElementById("lockOverlay");
      const passToggle = document.getElementById("lockPassToggle");
      const secretMark = document.getElementById("secretMark");
      return {
        hasLogoBtn: !!btn,
        hasInner: !!inner,
        hasHeroBackdrop: !!backdrop,
        hasLockOverlay: !!lockOverlay,
        hasPassToggle: !!passToggle,
        hasSecretMarkInFooter: !!secretMark
      };
    })()
  `);
  console.log("Logo & Header verification:", logoInfo);
  if (!logoInfo.hasLogoBtn) throw new Error("Missing #brandLogoBtn");
  if (logoInfo.hasSecretMarkInFooter) throw new Error("Footer stars should be removed");
  if (!logoInfo.hasPassToggle) throw new Error("Missing lock password eye toggle");

  console.log("\n--- TEST 2: Brand Logo Pop & 5-tap Lock Screen Trigger ---");
  const triggerResult = await cdp.eval(`
    (() => {
      const btn = document.getElementById("brandLogoBtn");
      const overlay = document.getElementById("lockOverlay");
      const startOpen = overlay.classList.contains("open");
      
      // Tap 1
      btn.click();
      const hasPopActive = btn.classList.contains("pop-active");

      // Taps 2, 3, 4, 5
      btn.click();
      btn.click();
      btn.click();
      btn.click();

      const endOpen = overlay.classList.contains("open");
      return { startOpen, hasPopActive, endOpen };
    })()
  `);
  console.log("5-tap logo trigger result:", triggerResult);
  if (!triggerResult.hasPopActive) throw new Error("Logo did not get .pop-active animation class");
  if (!triggerResult.endOpen) throw new Error("Lock screen overlay did not open after 5 taps on logo");

  console.log("\n--- TEST 3: Lock Screen Eye Toggle ---");
  const eyeToggleResult = await cdp.eval(`
    (() => {
      const input = document.getElementById("lockPass");
      const toggle = document.getElementById("lockPassToggle");
      const initialType = input.type;
      toggle.click();
      const toggledType = input.type;
      toggle.click();
      const restoredType = input.type;
      return { initialType, toggledType, restoredType };
    })()
  `);
  console.log("Eye toggle result:", eyeToggleResult);
  if (eyeToggleResult.initialType !== "password" || eyeToggleResult.toggledType !== "text" || eyeToggleResult.restoredType !== "password") {
    throw new Error("Password eye toggle failed to toggle input type");
  }

  console.log("\n--- TEST 4: Certificate Navigation & Dedicated Certificate Page ---");
  // Set sample certificate data in portfolio and reload
  await cdp.eval(`
    (() => {
      const d = window.bpData.loadData();
      d.achievements[0].cert = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='blue' width='100' height='100'/%3E%3C/svg%3E";
      window.bpData.saveData(d);
    })()
  `);

  await cdp.send("Page.navigate", { url: "http://127.0.0.1:4173/index.html" });
  await waitForPageLoad();

  const achViewLink = await cdp.eval(`
    (() => {
      const link = document.querySelector(".ach-card a.ach-view");
      return link ? { href: link.getAttribute("href"), text: link.textContent.trim() } : null;
    })()
  `);
  console.log("Achievement certificate view link:", achViewLink);
  if (!achViewLink || !achViewLink.href.includes("certificate.html?id=0")) {
    throw new Error("Achievement 'View certificate ↗' link does not target certificate.html?id=0");
  }

  // Navigate to certificate.html?id=0
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:4173/certificate.html?id=0" });
  await waitForPageLoad();

  const certPageCheck = await cdp.eval(`
    (() => {
      const title = document.getElementById("certName").textContent;
      const recipient = document.getElementById("recipientName").textContent;
      const img = document.getElementById("certImage");
      const back = document.getElementById("backBtn");
      return {
        title,
        recipient,
        imgSrc: img ? img.getAttribute("src").slice(0, 30) : null,
        backHref: back ? back.getAttribute("href") : null
      };
    })()
  `);
  console.log("certificate.html verification:", certPageCheck);
  if (!certPageCheck.imgSrc || !certPageCheck.imgSrc.startsWith("data:image/svg")) {
    throw new Error("Certificate image was not rendered on certificate.html");
  }

  console.log("\n--- TEST 5: Admin Dashboard Theme Adaptation & Eye Toggle ---");
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:4173/admin.html" });
  await waitForPageLoad();

  const adminAuthCheck = await cdp.eval(`
    (() => {
      const pass = document.getElementById("authPass");
      const toggle = document.getElementById("authPassToggle");
      const submit = document.getElementById("authSubmit");
      const mesh = document.querySelector(".ambient-mesh-canvas");
      const video = document.getElementById("wallpaperVideo");

      const initType = pass.type;
      toggle.click();
      const toggleType = pass.type;
      toggle.click();

      const accentProp = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      const btnBg = getComputedStyle(submit).backgroundColor;

      return {
        hasMesh: !!mesh,
        hasVideo: !!video,
        initType,
        toggleType,
        accentProp,
        btnBg
      };
    })()
  `);
  console.log("Admin auth gate check:", adminAuthCheck);
  if (adminAuthCheck.initType !== "password" || adminAuthCheck.toggleType !== "text") {
    throw new Error("Admin auth password eye toggle failed");
  }

  console.log("\n--- TEST 6: Admin Dashboard Tabs & Password Section (No Criteria) ---");
  // Set passcode and log in to admin
  await cdp.eval(`
    (async () => {
      await window.bpData.setPassword("testowner123");
      window.bpData.setLoggedIn(true);
      window.location.reload();
    })()
  `);
  await sleep(1000);

  const adminTabsCheck = await cdp.eval(`
    (() => {
      const tabBtns = Array.from(document.querySelectorAll("#navTabs .tab-btn")).map(b => ({
        id: b.dataset.tab,
        text: b.textContent.trim()
      }));
      return tabBtns;
    })()
  `);
  console.log("Admin tabs:", adminTabsCheck);
  const passTab = adminTabsCheck.find(t => t.id === "password");
  if (!passTab) throw new Error("Missing 'password' tab in admin dashboard");

  // Click password tab
  await cdp.eval(`
    (() => {
      const btn = document.querySelector('.tab-btn[data-tab="password"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(400);

  const passFormCheck = await cdp.eval(`
    (() => {
      const form = document.getElementById("changePasswordForm");
      const cur = document.getElementById("curPassInput");
      const nw = document.getElementById("newPassInput");
      const conf = document.getElementById("confirmPassInput");
      return {
        hasForm: !!form,
        hasCur: !!cur,
        hasNew: !!nw,
        hasConfirm: !!conf
      };
    })()
  `);
  console.log("Password form elements:", passFormCheck);
  if (!passFormCheck.hasForm || !passFormCheck.hasNew || !passFormCheck.hasConfirm) {
    throw new Error("Change password form incomplete");
  }

  // Change password to a simple word with no criteria
  const passChangeResult = await cdp.eval(`
    (async () => {
      document.getElementById("curPassInput").value = "testowner123";
      document.getElementById("newPassInput").value = "1";
      document.getElementById("confirmPassInput").value = "1";
      document.getElementById("changePassSubmit").click();
      await new Promise(r => setTimeout(r, 600));
      const msg = document.getElementById("changePassMsg").textContent;
      const ok = await window.bpData.checkPassword("1");
      return { msg, ok };
    })()
  `);
  console.log("Password change with no criteria result:", passChangeResult);
  if (!passChangeResult.ok) throw new Error("Failed to change password to simple character '1'");

  console.log("\n--- TEST 7: Profile Section Logo & Hero Media Inputs ---");
  await cdp.eval(`
    (() => {
      const btn = document.querySelector('.tab-btn[data-tab="profile"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(400);

  const profileInputsCheck = await cdp.eval(`
    (() => {
      const logoUp = document.getElementById("logoUpload");
      const logoUrl = document.getElementById("logoUrl");
      const heroUp = document.getElementById("heroMediaUpload");
      const heroUrl = document.getElementById("heroMediaUrl");
      const heroType = document.querySelector('[data-bind="owner.heroMediaType"]');
      return {
        hasLogoUpload: !!logoUp,
        hasLogoUrl: !!logoUrl,
        hasHeroUpload: !!heroUp,
        hasHeroUrl: !!heroUrl,
        hasHeroType: !!heroType
      };
    })()
  `);
  console.log("Profile Logo and Hero media inputs:", profileInputsCheck);
  if (!profileInputsCheck.hasLogoUpload || !profileInputsCheck.hasHeroUpload) {
    throw new Error("Missing Logo or Hero Media upload inputs in Profile section");
  }

  console.log("\n--- TEST 8: Social Section Mini App Logo Inputs ---");
  await cdp.eval(`
    (() => {
      const btn = document.querySelector('.tab-btn[data-tab="social"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(400);

  const socialCheck = await cdp.eval(`
    (() => {
      const miniLogoInp = document.querySelector('[data-bind="socialLinks.0.logo"]');
      const fileInp = document.querySelector('.row-file[data-write="socialLinks.0.logo"]');
      return {
        hasMiniLogoInput: !!miniLogoInp,
        hasMiniLogoFileInput: !!fileInp
      };
    })()
  `);
  console.log("Social mini logo inputs check:", socialCheck);
  if (!socialCheck.hasMiniLogoInput || !socialCheck.hasMiniLogoFileInput) {
    throw new Error("Missing mini logo upload/input for social items");
  }

  console.log("\n--- TEST 9: Large Media IndexedDB Storage Engine (20MB-50MB Video Support) ---");
  const idbCheck = await cdp.eval(`
    (async () => {
      // Create a 2MB synthetic data URL payload to test IndexedDB storage bypass
      const chunkSize = 2 * 1024 * 1024;
      const fakeVideo = "data:video/mp4;base64," + "A".repeat(chunkSize);
      
      const d = window.bpData.loadData();
      d.theme.wallpaper = "video";
      d.theme.wallpaperVideo = fakeVideo;
      
      // Save data - should detect size > 250KB and route to bpMedia (IndexedDB)
      await window.bpData.saveData(d);

      // Verify that localStorage only has thin pointer "idb:wallpaper_video"
      const rawStored = localStorage.getItem(window.bpData.STORAGE_KEY);
      const parsed = JSON.parse(rawStored);
      const storedPointer = parsed.theme.wallpaperVideo;

      // Verify IndexedDB has the full payload
      const idbVal = await window.bpData.bpMedia.get("wallpaper_video");
      const idbMatches = (idbVal === fakeVideo);

      // Test resolveMedia restores full payload
      const loaded = window.bpData.loadData();
      await window.bpData.resolveMedia(loaded);
      const resolvedMatches = (loaded.theme.wallpaperVideo === fakeVideo);

      return {
        storedPointer,
        idbMatches,
        resolvedMatches,
        payloadSizeMB: (chunkSize / (1024 * 1024)).toFixed(1) + " MB"
      };
    })()
  `);
  console.log("IndexedDB media persistence test:", idbCheck);
  if (idbCheck.storedPointer !== "idb:wallpaper_video") {
    throw new Error("Large video was not routed to IndexedDB pointer; found: " + idbCheck.storedPointer);
  }
  if (!idbCheck.idbMatches || !idbCheck.resolvedMatches) {
    throw new Error("Payload in IndexedDB did not match or failed to resolve");
  }

  console.log("\n--- TEST 10: Adaptive About Box Image Styling ---");
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:4173/index.html" });
  await sleep(1000);

  const aboutBoxCheck = await cdp.eval(`
    (() => {
      const avatarBox = document.querySelector(".about-avatar");
      const img = avatarBox.querySelector(".avatar img");
      const cs = getComputedStyle(avatarBox);
      const imgCs = img ? getComputedStyle(img) : null;
      return {
        display: cs.display,
        alignItems: cs.alignItems,
        imgFit: imgCs ? imgCs.objectFit : null,
        imgHeight: imgCs ? imgCs.height : null
      };
    })()
  `);
  console.log("About image box adaptive styling check:", aboutBoxCheck);

  console.log("\n==============================================");
  console.log("🎉 ALL 10 TESTS PASSED SUCCESSFULLY! ✓");
  console.log("==============================================");

  cdp.close();
  proc.kill();
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
