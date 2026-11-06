/* ============================================================
   SCHEMATIC PORTFOLIO - DATA LAYER (v2)
   Shared by the public site (index.html) and the owner
   dashboard (admin.html). Everything the owner edits lives in
   DEFAULT_DATA and is persisted (per-browser) under the
   STORAGE_KEY in localStorage.
   ============================================================ */

const STORAGE_KEY = "bp_portfolio_v2";
const AUTH_KEY = "bp_portfolio_auth";
const SESSION_KEY = "bp_admin_session";

/* ------------------------------------------------------------
   DEFAULT CONTENT: seeded on first visit
   ------------------------------------------------------------ */
const DEFAULT_DATA = {
  owner: {
    name: "Alex Stone",
    handle: "AlexStone",
    title: "Computer Engineering Student",
    tagline:
      "I build things that run fast and feel alive: game engines, " +
      "graphics pipelines, and full-stack tools. One commit at a time.",
    location: "Bellevue, WA",
    avatar: "", // empty -> generated monogram avatar
    logo: "", // top bar logo image/GIF
    heroMedia: "", // main big top home page box image/video
    heroMediaType: "", // "image" | "video" | ""
    heroOverlayColor1: "#0F86A1", // Home Hero Box upper blur layer color 1
    heroOverlayColor2: "#1B1B1B", // Home Hero Box upper blur layer color 2
    email: "alex.stone@example.com",
    phone: "+1 (555) 010-2030",
    ctaPrimary: "See the work",
    ctaSecondary: "Get in touch",
    ctaResume: "⬇ Download Resume"
  },

  about: [
    "I'm a computer engineering student who spends my days (and most " +
      "evenings) turning half-formed ideas into fast, living software - " +
      "from voxel game engines to web apps. I love the exact moment an " +
      "idea stops being a sketch and starts being something you can " +
      "touch, see, and ship.",
    "When I'm not at a keyboard you'll find me in the lab experimenting " +
      "with shaders, profiling a hot loop, or explaining to friends why " +
      "the red circuit is the best circuit. I'm currently open to " +
      "2026 internships."
  ],

  aboutExtra: [
    {
      icon: "terminal",
      title: "Low-level, fast",
      text: "I like code that runs hard: C++, engines, and hot loops."
    },
    {
      icon: "network",
      title: "Builder at heart",
      text: "I ship things people actually use, from apps to tools."
    },
    {
      icon: "light",
      title: "Always learning",
      text: "Graphics, systems, ML: I'm happiest mid-tutorial."
    }
  ],

  achievements: [
    {
      logo: "",
      name: "Hackathon Winner: Campus Companion",
      cert: "",
      btnText: "View certificate ↗"
    },
    {
      logo: "",
      name: "Regional Graphics Paper",
      cert: "",
      btnText: "View certificate ↗"
    },
    {
      logo: "",
      name: "Dev Club Lead",
      cert: "",
      btnText: "View certificate ↗"
    }
  ],

  projects: [
    {
      image: "",
      title: "Voxel Engine",
      desc:
        "A WebGL voxel engine with procedural terrain, chunk meshing, " +
        "and first-person controls.",
      tags: ["Three.js", "WebGL", "TypeScript"],
      link: "#",
      btnText: "Visit ↗"
    },
    {
      image: "",
      title: "Campus Companion",
      desc:
        "A hackathon-winning mobile app that maps campus buildings and " +
        "shows real-time room availability.",
      tags: ["React Native", "Firebase"],
      link: "#",
      btnText: "Visit ↗"
    },
    {
      image: "",
      title: "Redstone Simulator",
      desc:
        "A Python simulation of redstone circuits, used as a teaching " +
        "tool in the campus dev club.",
      tags: ["Python", "Network theory"],
      link: "#",
      btnText: "Visit ↗"
    },
    {
      image: "",
      title: "This Portfolio",
      desc:
        "A 3D animated portfolio with an owner dashboard: every " +
        "word, color and model editable without touching code.",
      tags: ["Three.js", "Vanilla JS"],
      link: "#",
      btnText: "Visit ↗"
    }
  ],

  skills: [
    { cat: "Languages", items: "TypeScript, C++, Python, Java, C" },
    { cat: "Web", items: "React, Node.js, Three.js, CSS/HTML" },
    { cat: "Game & Graphics", items: "Unity, Godot, WebGL, Shaders" },
    { cat: "Systems", items: "Linux, Git, Docker, SQLite" },
    { cat: "Tools & Workflow", items: "Blender, Figma, VS Code, Trello" }
  ],

  education: [
    {
      degree: "B.S. Computer Engineering",
      school: "State University",
      when: "2022 – 2026 (expected)",
      desc:
        "Focus: computer graphics, operating systems, embedded systems, " +
        "and machine learning. Relevant coursework: Graphics, Distributed " +
        "Systems, Digital Logic, Algorithms."
    }
  ],

  socialLinks: [
    { icon: "github", label: "GitHub", url: "https://github.com/alexstone", logo: "" },
    { icon: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/alexstone", logo: "" },
    { icon: "twitter", label: "X / Twitter", url: "https://x.com/alexstone", logo: "" },
    { icon: "mail", label: "Email", url: "mailto:alex.stone@example.com", logo: "" },
    { icon: "discord", label: "Discord", url: "AlexStone", logo: "" }
  ],

  theme: {
    wallpaper: "circle",   // circle | blueprint | grid | circuit | solid | image | video
    scene: "circle",       // circle | workshop | particles | minimal
    accent: "#0F86A1",
    accent2: "#FFE066",
    bg: "#0B0F19",
    isDark: true,
    themeMode: "dark",
    wallpaperImage: "",     // data URL / URL when wallpaper === "image"
    wallpaperVideo: "",     // data URL / URL when wallpaper === "video"
    cursor: {
      style: "none",        // none | dot | ring
      color: "#0F86A1",
      glow: true,
      glowColor: "#0F86A1"
    },
    footer: {
      left: "⚡ Designed with Circle Theme · Alex Stone",
      right: "© 2026 · All rights reserved",
      bg: ""
    }
  },

  type: {
    fontHeading: "jakarta",   // jakarta | space | sans | serif | mono
    fontBody: "jakarta",
    headingColor: "#1B1B1B",
    bodyColor: "#333333",
    headingScale: 100,      // percent
    bodyScale: 100,
    overrides: {
      hero: { font: "inherit", headingColor: "", bodyColor: "", size: 100 },
      about: { font: "inherit", headingColor: "", bodyColor: "", size: 100 },
      skills: { font: "inherit", headingColor: "", bodyColor: "", size: 100 },
      achievements: { font: "inherit", headingColor: "", bodyColor: "", size: 100 },
      projects: { font: "inherit", headingColor: "", bodyColor: "", size: 100 },
      education: { font: "inherit", headingColor: "", bodyColor: "", size: 100 },
      contact: { font: "inherit", headingColor: "", bodyColor: "", size: 100 },
      footer: { font: "inherit", headingColor: "", bodyColor: "", size: 100 }
    }
  }
};

/* ------------------------------------------------------------
   IndexedDB Media Store (Allows 20MB - 50MB+ media files)
   ------------------------------------------------------------ */
const IDB_NAME = "bp_portfolio_db";
const IDB_STORE = "media";

function getIDB() {
  return new Promise(resolve => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

const bpMedia = {
  async set(key, val) {
    const db = await getIDB();
    if (!db) return false;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },
  async get(key) {
    const db = await getIDB();
    if (!db) return null;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },
  async del(key) {
    const db = await getIDB();
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(key);
    } catch (e) {}
  }
};

const mediaCache = {};

async function resolveMedia(data) {
  if (!data) return data;
  if (data.theme && data.theme.wallpaperVideo && data.theme.wallpaperVideo.startsWith("idb:")) {
    const key = data.theme.wallpaperVideo.replace("idb:", "");
    if (!mediaCache[key]) mediaCache[key] = await bpMedia.get(key);
    if (mediaCache[key]) data.theme.wallpaperVideo = mediaCache[key];
  }
  if (data.theme && data.theme.wallpaperImage && data.theme.wallpaperImage.startsWith("idb:")) {
    const key = data.theme.wallpaperImage.replace("idb:", "");
    if (!mediaCache[key]) mediaCache[key] = await bpMedia.get(key);
    if (mediaCache[key]) data.theme.wallpaperImage = mediaCache[key];
  }
  if (data.owner && data.owner.heroMedia && data.owner.heroMedia.startsWith("idb:")) {
    const key = data.owner.heroMedia.replace("idb:", "");
    if (!mediaCache[key]) mediaCache[key] = await bpMedia.get(key);
    if (mediaCache[key]) data.owner.heroMedia = mediaCache[key];
  }
  if (data.owner && data.owner.avatar && data.owner.avatar.startsWith("idb:")) {
    const key = data.owner.avatar.replace("idb:", "");
    if (!mediaCache[key]) mediaCache[key] = await bpMedia.get(key);
    if (mediaCache[key]) data.owner.avatar = mediaCache[key];
  }
  if (data.owner && data.owner.logo && data.owner.logo.startsWith("idb:")) {
    const key = data.owner.logo.replace("idb:", "");
    if (!mediaCache[key]) mediaCache[key] = await bpMedia.get(key);
    if (mediaCache[key]) data.owner.logo = mediaCache[key];
  }
  if (Array.isArray(data.achievements)) {
    for (let i = 0; i < data.achievements.length; i++) {
      const ach = data.achievements[i];
      if (ach && ach.cert && ach.cert.startsWith("idb:")) {
        const key = ach.cert.replace("idb:", "");
        if (!mediaCache[key]) mediaCache[key] = await bpMedia.get(key);
        if (mediaCache[key]) ach.cert = mediaCache[key];
      }
    }
  }
  return data;
}

/* ------------------------------------------------------------
   load / save / reset
   ------------------------------------------------------------ */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Synchronously fill any media that's already in memory cache
      if (parsed.theme && parsed.theme.wallpaperVideo && parsed.theme.wallpaperVideo.startsWith("idb:")) {
        const k = parsed.theme.wallpaperVideo.replace("idb:", "");
        if (mediaCache[k]) parsed.theme.wallpaperVideo = mediaCache[k];
      }
      if (parsed.owner && parsed.owner.heroMedia && parsed.owner.heroMedia.startsWith("idb:")) {
        const k = parsed.owner.heroMedia.replace("idb:", "");
        if (mediaCache[k]) parsed.owner.heroMedia = mediaCache[k];
      }
      if (parsed.owner && parsed.owner.logo && parsed.owner.logo.startsWith("idb:")) {
        const k = parsed.owner.logo.replace("idb:", "");
        if (mediaCache[k]) parsed.owner.logo = mediaCache[k];
      }
      if (parsed.theme && parsed.theme.wallpaperImage && parsed.theme.wallpaperImage.startsWith("idb:")) {
        const k = parsed.theme.wallpaperImage.replace("idb:", "");
        if (mediaCache[k]) parsed.theme.wallpaperImage = mediaCache[k];
      }
      return deepMerge(structuredClone(DEFAULT_DATA), parsed);
    }
  } catch (e) {
    console.warn("Failed to read portfolio data", e);
  }
  return structuredClone(DEFAULT_DATA);
}

function deepMerge(base, override) {
  if (Array.isArray(base) && Array.isArray(override)) return override;
  if (base && typeof base === "object" && override && typeof override === "object") {
    const out = { ...base };
    for (const k of Object.keys(override)) {
      out[k] = k in base ? deepMerge(base[k], override[k]) : override[k];
    }
    return out;
  }
  return override === undefined ? base : override;
}

async function saveData(data) {
  if (!data) return;
  // Shallow copy top-level containers to prevent duplicating multi-megabyte media strings in memory
  const clone = {
    ...data,
    owner: { ...(data.owner || {}) },
    theme: { ...(data.theme || {}) },
    socialLinks: (data.socialLinks || []).map(s => ({ ...s })),
    achievements: (data.achievements || []).map(a => ({ ...a })),
    projects: (data.projects || []).map(p => ({ ...p })),
    skills: (data.skills || []).map(s => ({ ...s })),
    education: (data.education || []).map(e => ({ ...e })),
    contact: { ...(data.contact || {}) },
    type: { ...(data.type || {}) }
  };

  if (clone.theme && clone.theme.wallpaperVideo && clone.theme.wallpaperVideo.length > 250000) {
    await bpMedia.set("wallpaper_video", clone.theme.wallpaperVideo);
    mediaCache["wallpaper_video"] = clone.theme.wallpaperVideo;
    clone.theme.wallpaperVideo = "idb:wallpaper_video";
  }
  if (clone.theme && clone.theme.wallpaperImage && clone.theme.wallpaperImage.length > 250000) {
    await bpMedia.set("wallpaper_image", clone.theme.wallpaperImage);
    mediaCache["wallpaper_image"] = clone.theme.wallpaperImage;
    clone.theme.wallpaperImage = "idb:wallpaper_image";
  }
  if (clone.owner && clone.owner.heroMedia && clone.owner.heroMedia.length > 250000) {
    await bpMedia.set("hero_media", clone.owner.heroMedia);
    mediaCache["hero_media"] = clone.owner.heroMedia;
    clone.owner.heroMedia = "idb:hero_media";
  }
  // Keep owner.logo in localStorage so favicon & badge sync synchronously without async flash
  if (clone.owner && clone.owner.avatar && clone.owner.avatar.length > 250000) {
    await bpMedia.set("avatar_image", clone.owner.avatar);
    mediaCache["avatar_image"] = clone.owner.avatar;
    clone.owner.avatar = "idb:avatar_image";
  }
  if (Array.isArray(clone.achievements)) {
    for (let i = 0; i < clone.achievements.length; i++) {
      const ach = clone.achievements[i];
      if (ach && ach.cert && ach.cert.length > 250000) {
        const key = "cert_" + i;
        await bpMedia.set(key, ach.cert);
        mediaCache[key] = ach.cert;
        ach.cert = "idb:" + key;
      }
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
  } catch (err) {
    console.error("localStorage error:", err);
  }
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULT_DATA);
}

/* Draft used by the dashboard's live preview (not the saved data). */
function loadPreview() {
  try {
    const raw = localStorage.getItem("bp_preview");
    if (raw) return deepMerge(structuredClone(DEFAULT_DATA), JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return structuredClone(DEFAULT_DATA);
}

function savePreview(data) {
  localStorage.setItem("bp_preview", JSON.stringify(data));
}

/* ------------------------------------------------------------
   Owner auth: Client-side cryptographic salted SHA-256 storage
   No secrets or hashes committed to git; unique 128-bit salt
   generated per browser profile.
   ------------------------------------------------------------ */
function sha256(text) {
  if (window.crypto && window.crypto.subtle) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(buf => {
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    });
  }
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Promise.resolve((h >>> 0).toString(16).padStart(8, "0"));
}

function getOrGenerateSalt() {
  let salt = localStorage.getItem("bp_portfolio_salt");
  if (!salt) {
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      salt = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    } else {
      salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    localStorage.setItem("bp_portfolio_salt", salt);
  }
  return salt;
}

function hashPassword(plain, salt) {
  const salted = (salt || "") + ":" + String(plain);
  return sha256(salted);
}

function setPassword(plain) {
  const salt = getOrGenerateSalt();
  const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("bp_server_token") : null;
  if (token) {
    fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ newPassword: plain })
    }).catch(() => {});
  }
  return hashPassword(plain, salt).then(hash => {
    // Store as salt:hash for unique per-browser protection
    localStorage.setItem(AUTH_KEY, salt + ":" + hash);
    return true;
  });
}

function isAuthConfigured() {
  return !!localStorage.getItem(AUTH_KEY);
}

function checkPassword(plain) {
  // 1. Check local cryptographic salted hash first if configured
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    let localPromise;
    if (stored.includes(":")) {
      const parts = stored.split(":");
      localPromise = hashPassword(plain, parts[0]).then(h => h === parts.slice(1).join(":"));
    } else {
      localPromise = sha256(plain).then(h => {
        if (stored === h) {
          setPassword(plain);
          return true;
        }
        return false;
      });
    }

    return localPromise.then(localOk => {
      if (localOk) {
        setLoggedIn(true);
        if (typeof fetch === "function") {
          fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: plain })
          }).then(r => r.json()).then(d => {
            if (d && d.token) sessionStorage.setItem("bp_server_token", d.token);
          }).catch(() => {});
        }
        return true;
      }

      // If local hash did not match, check server API for centralized auth
      if (typeof fetch === "function") {
        return fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: plain })
        }).then(async r => {
          if (r.status === 429) {
            const d = await r.json();
            window.bpData_lastError = d.message || "Too many failed attempts. Account temporarily locked.";
            return false;
          }
          const d = await r.json();
          if (r.ok && d.success) {
            if (d.token) sessionStorage.setItem("bp_server_token", d.token);
            setLoggedIn(true);
            return true;
          }
          return false;
        }).catch(() => {
          return false;
        });
      }
      return false;
    });
  }

  // 2. If no local password configured, check server API
  if (typeof fetch === "function") {
    return fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: plain })
    }).then(async res => {
      if (res.status === 429) {
        const d = await res.json();
        window.bpData_lastError = d.message || "Too many failed attempts. Account temporarily locked.";
        return false;
      }
      const d = await res.json();
      if (res.ok && d.success) {
        if (d.token) sessionStorage.setItem("bp_server_token", d.token);
        setLoggedIn(true);
        return true;
      }
      return false;
    }).catch(() => {
      return false;
    });
  }

  return Promise.resolve(false);
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function setLoggedIn(v) {
  sessionStorage.setItem(SESSION_KEY, v ? "1" : "0");
}

/* ------------------------------------------------------------
   Expose
   ------------------------------------------------------------ */
if (typeof window !== "undefined") {
  window.bpData = {
    STORAGE_KEY,
    DEFAULT_DATA,
    loadData,
    saveData,
    resetData,
    resolveMedia,
    bpMedia,
    loadPreview,
    savePreview,
    setPassword,
    checkPassword,
    isAuthConfigured,
    isLoggedIn,
    setLoggedIn
  };
}
