/* ============================================================
   SCHEMATIC - OWNER DASHBOARD (v2)
   Edits every section of the public site, including footer,
   cursor FX and per-section typography. All data is stored
   per-browser in localStorage (see README note).
   ============================================================ */

(function () {
  "use strict";

  let state = window.bpData.loadData();
  let curTab = "profile";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function parsePath(p) { return (p.match(/[^.\[\]]+/g) || []); }
  function getPath(tokens) { let o = state; for (const k of tokens) { if (o == null) return ""; o = o[k]; } return o == null ? "" : o; }
  function setPath(tokens, val) { let o = state; for (let i = 0; i < tokens.length - 1; i++) { o = o[tokens[i]]; } o[tokens[tokens.length - 1]] = val; }

  function hexA(hex, a) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "rgba(15,134,161,0.1)";
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function getLuminance(hex) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return 0.5;
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  /* Cache blob URLs for large base64 media to prevent DOM memory inflation */
  const blobUrlCache = new Map();
  function getCachedMediaUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return "";
    if (!dataUrl.startsWith("data:") || dataUrl.length < 50000) return dataUrl;
    if (blobUrlCache.has(dataUrl)) return blobUrlCache.get(dataUrl);
    try {
      const parts = dataUrl.split(",");
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || "application/octet-stream";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const url = URL.createObjectURL(blob);
      blobUrlCache.set(dataUrl, url);
      return url;
    } catch (e) {
      return dataUrl;
    }
  }

  /* ---------- theme & dynamic contrast adaptation ---------- */
  function applyTheme() {
    const t = state.theme || {};
    const o = state.owner || {};
    const r = document.documentElement.style;
    const accent = t.accent || "#0F86A1";
    const accent2 = t.accent2 || "#EBC7B5";
    const bg = t.bg || "#F8EFE5";

    r.setProperty("--accent", accent);
    r.setProperty("--bg-teal", accent);
    r.setProperty("--accent2", accent2);
    r.setProperty("--bg", bg);
    r.setProperty("--accent-glow", hexA(accent, 0.45));

    // hero box upper blur layer overlay colors
    const h1 = o.heroOverlayColor1 || "#0F86A1";
    const h2 = o.heroOverlayColor2 || "#EBC7B5";
    r.setProperty("--hero-overlay-1", hexA(h1, 0.48));
    r.setProperty("--hero-overlay-2", hexA(h2, 0.40));

    // Calculate background luminance to prevent text blending
    const lum = getLuminance(bg);
    const isDark = t.themeMode === "dark" || t.isDark === true || lum < 0.42;

    r.setProperty("--ink", isDark ? "#F8FAFC" : "#1B1B1B");
    r.setProperty("--mut", isDark ? "#94A3B8" : "#555555");
    r.setProperty("--line", isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(27, 27, 27, 0.08)");
    r.setProperty("--card-bg", isDark ? "rgba(30, 41, 59, 0.88)" : "#FFFFFF");
    r.setProperty("--card-border", isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(27, 27, 27, 0.08)");
    r.setProperty("--input-bg", isDark ? "rgba(15, 23, 42, 0.75)" : "#FFFFFF");
    r.setProperty("--input-color", isDark ? "#FFFFFF" : "#1B1B1B");
    r.setProperty("--input-border", isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(27, 27, 27, 0.16)");
    r.setProperty("--adminbar-bg", isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.94)");
    r.setProperty("--style-block-bg", isDark ? "rgba(255, 255, 255, 0.03)" : "#FAF5EF");
    r.setProperty("--auth-card-bg", isDark ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)");

    const cursor = t.cursor || {};
    r.setProperty("--cursor-color", cursor.color || accent);
    r.setProperty("--cursor-glow", cursor.glowColor || accent);

    const body = document.body;
    body.dataset.wallpaper = t.wallpaper || "circle";
    body.dataset.themeMode = isDark ? "dark" : "light";
    if (t.wallpaper === "image" && t.wallpaperImage) {
      body.style.setProperty("--wallpaper-image", 'url("' + t.wallpaperImage + '")');
    } else {
      body.style.removeProperty("--wallpaper-image");
    }

    syncLogoAndFavicon();
  }

  function syncLogoAndFavicon(customLogo) {
    const o = state.owner || {};
    const t = state.theme || {};
    let logo = customLogo !== undefined ? customLogo : o.logo;
    if (logo && typeof logo === "string" && logo.startsWith("idb:")) {
      logo = "";
    }

    // 1. Update logo preview in admin form if rendered
    const box = document.getElementById("logoPreviewBox");
    if (box) {
      box.innerHTML = logo
        ? '<img src="' + esc(logo) + '" alt="Logo"/>'
        : '<span class="brand-dot"></span>';
    }

    // 2. Update browser tab favicon
    function setFaviconLink(href, type) {
      const existing = document.querySelectorAll("link[rel*='icon']");
      existing.forEach(el => el.remove());
      const link = document.createElement("link");
      link.id = "siteFavicon";
      link.rel = "icon";
      link.type = type || "image/png";
      link.href = href;
      document.head.appendChild(link);
    }

    if (!logo || typeof logo !== "string" || !logo.trim()) {
      const acc = encodeURIComponent(t.accent || "#0F86A1");
      const acc2 = encodeURIComponent(t.accent2 || "#5AD1FF");
      setFaviconLink("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='" + acc + "'/%3E%3Ccircle cx='16' cy='16' r='5.5' fill='" + acc2 + "'/%3E%3C/svg%3E", "image/svg+xml");
      return;
    }

    const clean = logo.trim();
    if (clean.startsWith("data:image/svg+xml")) {
      setFaviconLink(clean, "image/svg+xml");
      return;
    }
    setFaviconLink(clean, clean.startsWith("data:image/gif") ? "image/gif" : "image/png");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = 64; cv.height = 64;
        const ctx = cv.getContext("2d");
        ctx.beginPath();
        ctx.arc(32, 32, 31, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, 64, 64);
        setFaviconLink(cv.toDataURL("image/png"), "image/png");
      } catch (e) {
        setFaviconLink(clean, clean.startsWith("data:image/gif") ? "image/gif" : "image/png");
      }
    };
    img.onerror = () => setFaviconLink(clean, "image/x-icon");
    img.src = clean;
  }

  function updateFavicon(customLogo) {
    syncLogoAndFavicon(customLogo);
  }

  /* ---------- interactive admin loader ---------- */
  function showAdminLoader(title, sub) {
    const el = document.getElementById("adminLoader");
    if (!el) return;
    const t = document.getElementById("adminLoaderTitle");
    const s = document.getElementById("adminLoaderSub");
    if (t) t.textContent = title || "Applying changes...";
    if (s) s.textContent = sub || "Please wait while content is updated.";
    el.classList.add("active");
  }

  function hideAdminLoader() {
    const el = document.getElementById("adminLoader");
    if (el) el.classList.remove("active");
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- change tracking ---------- */
  function markChanged() { const el = document.getElementById("changedInd"); if (el) el.textContent = "● unsaved changes"; }
  function clearChanged() { const el = document.getElementById("changedInd"); if (el) el.textContent = ""; }

  /* ---------- per-section preview (modal) ---------- */
  function pIcon(key, size) { return window.bpIcons.renderIcon(key, size || 20); }
  function pHeroQL(needle) {
    const m = (state.socialLinks || []).find(s => String(s.label || "").toLowerCase().indexOf(needle) !== -1);
    return m ? m.url : "";
  }
  function prevAvatar() {
    const o = state.owner;
    if (o.avatar) return '<img src="' + esc(o.avatar) + '" alt="" />';
    const ini = (o.name || "AS").split(/\s+/).map(w => w[0]).join("").toUpperCase();
    return '<div class="avatar-mono">' + esc(ini) + "</div>";
  }

  const PREV = {
    profile() {
      const o = state.owner;
      const gh = pHeroQL("github"), li = pHeroQL("linkedin");
      let ql = "";
      if (gh) ql += '<span class="ql-btn"><span class="ql-icon">' + pIcon("github") + '</span> GitHub</span>';
      if (li) ql += '<span class="ql-btn"><span class="ql-icon">' + pIcon("linkedin") + '</span> LinkedIn</span>';
      const specs = [];
      if (o.location) specs.push(o.location);
      if (o.handle) specs.push("@" + o.handle);
      return '<div class="hero mini-hero">' +
        '<div class="hero-inner">' +
          '<p class="kicker mono">' + esc(o.title) + "</p>" +
          '<h1 class="hero-name">' + esc(o.name) + "</h1>" +
          '<p class="hero-tagline">' + esc(o.tagline) + "</p>" +
          '<div class="hero-cta">' +
            '<span class="btn btn-primary">' + esc(o.ctaPrimary) + "</span>" +
            '<span class="btn btn-ghost">' + esc(o.ctaSecondary) + "</span>" +
          "</div>" +
          ql +
          '<div class="specs mono">' + esc(specs.join("  ·  ")) + "</div>" +
        "</div></div>";
    },
    about() {
      const paras = (state.about || []).map(p => "<p>" + esc(p) + "</p>").join("");
      const extra = (state.aboutExtra || []).map(x =>
        '<div class="extra-card"><span class="extra-icon">' + pIcon(x.icon) + '</span><div><h4>' + esc(x.title) + "</h4><p>" + esc(x.text) + "</p></div></div>"
      ).join("");
      return '<div class="about-grid">' +
        '<div class="about-avatar"><div class="avatar">' + prevAvatar() + "</div></div>" +
        '<div class="about-copy"><div class="about-body">' + paras + '</div><div class="about-extra">' + extra + "</div></div>" +
        "</div>";
    },
    skills() {
      return '<div class="skills-grid">' + (state.skills || []).map(s => {
        const tags = String(s.items || "").split(",").map(i => '<span class="skill-tag">' + esc(i.trim()) + "</span>").join("");
        return '<article class="skill-card"><h3>' + esc(s.cat) + '</h3><div class="skill-items">' + tags + "</div></article>";
      }).join("") + "</div>";
    },
    achievements() {
      const items = (state.achievements || []).map(a => {
        const logo = a.logo ? '<div class="ach-logo"><img src="' + esc(a.logo) + '" alt=""/></div>' : '<div class="ach-logo ach-logo-icon">' + pIcon("star", 26) + "</div>";
        const view = a.cert ? '<button class="btn btn-sm btn-ghost ach-view">View certificate ↗</button>' : "";
        return '<article class="ach-card">' + logo + "<h3>" + esc(a.name) + "</h3>" + view + "</article>";
      }).join("");
      return '<div class="achievements-grid">' + items + "</div>";
    },
    projects() {
      const items = (state.projects || []).map(p => {
        const img = p.image ? '<div class="proj-img"><img src="' + esc(p.image) + '" alt=""/></div>' : '<div class="proj-img proj-img-ph">' + pIcon("cube", 34) + "</div>";
        const visit = (p.link && p.link !== "#") ? '<a class="btn btn-sm btn-primary proj-visit">Visit ↗</a>' : "";
        return '<article class="project-card">' + img + '<div class="proj-body"><h3>' + esc(p.title) + "</h3><p>" + esc(p.desc) + "</p><div class=\"tags\">" +
          (p.tags || []).map(t => "<span>" + esc(t) + "</span>").join("") + "</div>" + visit + "</div></article>";
      }).join("");
      return '<div class="projects-grid">' + items + "</div>";
    },
    education() {
      return '<div class="edu-list">' + (state.education || []).map(e =>
        '<article class="edu-card"><div class="edu-when mono">' + esc(e.when) + '</div><h3>' + esc(e.degree) + '</h3><div class="edu-school">' + esc(e.school) + '</div><p>' + esc(e.desc) + "</p></article>"
      ).join("") + "</div>";
    },
    social() {
      return '<div class="social-links">' + (state.socialLinks || []).map(s => {
        const mini = s.logo
          ? '<img class="social-mini-logo" src="' + esc(s.logo) + '" alt="' + esc(s.label) + '" />'
          : pIcon(s.icon || "globe");
        return '<span class="social-link">' + mini + "<span>" + esc(s.label) + "</span></span>";
      }).join("") + "</div>";
    },
    password() {
      return '<div style="padding:28px;text-align:center;color:var(--mut)"><p>Owner password management settings.</p></div>';
    },
    footer() {
      const f = state.theme.footer || {};
      return '<footer class="footer" style="position:static;border-radius:14px">' +
        '<div class="wrap footer-inner">' +
          '<div class="footer-left">' + esc(f.left || "") + "</div>" +
          '<div class="footer-right"><span class="mono muted">' + esc(f.right || "") + "</span></div>" +
        "</div></footer>";
    },
    theme() {
      const t = state.theme || {}, c = t.cursor || {};
      const sw = color => '<span class="sw" style="background:' + (color || "transparent") + '"></span>';
      const row = (label, content) => '<div class="theme-prev-row"><span class="fl-label">' + label + "</span>" + content + "</div>";
      return '<div class="theme-prev">' +
        row("Accent", sw(t.accent) + '<code class="mono">' + esc(t.accent || "") + "</code>") +
        row("Secondary accent", sw(t.accent2) + '<code class="mono">' + esc(t.accent2 || "") + "</code>") +
        row("Background", sw(t.bg) + '<code class="mono">' + esc(t.bg || "") + "</code>") +
        row("3D scene", '<b>' + esc(t.scene || "workshop") + "</b>") +
        row("Cursor", '<b>' + esc(c.style || "none") + (c.glow ? " + glow" : "") + "</b>") +
        "</div>";
    }
  };

  function showPreview(tab) {
    syncBind();
    const body = document.getElementById("previewModalBody");
    const t = state.theme || {};
    const s = body.style;
    s.setProperty("--accent", t.accent || "#5ad1ff");
    s.setProperty("--accent2", t.accent2 || "#ffb454");
    s.setProperty("--bg", t.bg || "#0a0e17");
    body.innerHTML = '<div class="prev-zoom">' + (PREV[tab] ? PREV[tab]() : "") + "</div>";
    document.getElementById("previewModal").classList.add("open");
    body.scrollTop = 0;
  }
  function closePreview() { document.getElementById("previewModal").classList.remove("open"); }

  /* ---------- field widgets ---------- */
  function fieldRow(label, ctrl, hint) {
    return '<label class="fl"><span class="fl-label">' + esc(label) + '</span>' + ctrl +
      (hint ? '<span class="fl-hint">' + esc(hint) + "</span>" : "") + "</label>";
  }
  function tInput(tokens, opts) {
    opts = opts || {};
    const bind = tokens.join(".");
    const ph = opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : "";
    return '<input type="text" data-bind="' + bind + '" value="' + esc(getPath(tokens)) + '"' + ph + "/>";
  }
  function taInput(tokens, rows) {
    const bind = tokens.join(".");
    return '<textarea data-bind="' + bind + '" rows="' + (rows || 3) + '">' + esc(getPath(tokens)) + "</textarea>";
  }
  /* ---------- color palette component (Image 2 style) ---------- */
  function colorPaletteInput(tokens, defaultColor, allowReset) {
    const bind = tokens.join(".");
    const cur = getPath(tokens);
    const hasVal = cur != null && cur !== "";
    const rawVal = hasVal ? String(cur) : (defaultColor || "");
    const hex = rawVal.startsWith("#") ? rawVal.toLowerCase() : rawVal;
    const pickerVal = hex && /^#[0-9a-fA-F]{6}$/.test(hex)
      ? hex
      : (defaultColor && /^#[0-9a-fA-F]{6}$/.test(defaultColor) ? defaultColor.toLowerCase() : "#0f86a1");
    const displayHex = hex || (allowReset ? "inherit" : (defaultColor || "#0f86a1"));
    const swatchBg = hex ? hex : (defaultColor || "var(--accent)");
    const isUnset = allowReset && !hasVal ? "1" : "0";

    return '<div class="color-palette-wrap" data-palette-bind="' + bind + '"' + (allowReset ? ' data-allow-reset="1"' : '') + '>' +
      '<label class="palette-swatch-card" title="Click to open color palette">' +
        '<span class="palette-swatch-box" style="background:' + esc(swatchBg) + '">' +
          '<input type="color" class="palette-native-input" data-bind="' + bind + '" data-palette-unset="' + isUnset + '" value="' + esc(pickerVal) + '"/>' +
        '</span>' +
        '<span class="palette-hex-code mono">' + esc(displayHex) + '</span>' +
      '</label>' +
      (allowReset && hasVal ? '<button type="button" class="palette-reset-btn" data-reset-bind="' + bind + '" title="Reset / inherit color">✕</button>' : '') +
    '</div>';
  }

  function colorInput(tokens, defaultColor) {
    return colorPaletteInput(tokens, defaultColor);
  }
  function hexTextInput(tokens, defaultColor) {
    return colorPaletteInput(tokens, defaultColor, true);
  }
  function colorPalettePicker(tokens, label, presets, hint) {
    return colorPaletteInput(tokens, "", true);
  }

  function rangeInput(tokens, min, max) {
    const bind = tokens.join(".");
    return '<span class="range-wrap"><input type="range" min="' + (min || 0) + '" max="' + (max || 100) + '" data-bind="' + bind + '" value="' + esc(getPath(tokens)) + '"/><b class="range-val mono" data-rangefor="' + bind + '">' + esc(getPath(tokens)) + "</b></span>";
  }
  function checkboxInput(tokens) {
    const bind = tokens.join(".");
    const checked = getPath(tokens) ? " checked" : "";
    return '<span class="cb-wrap"><input type="checkbox" data-bind="' + bind + '"' + checked + "/></span>";
  }
  function selectInput(tokens, options) {
    const bind = tokens.join(".");
    const opts = options.map(([v, l]) => '<option value="' + v + '"' + (String(getPath(tokens)) === v ? " selected" : "") + ">" + l + "</option>").join("");
    return '<select data-bind="' + bind + '">' + opts + "</select>";
  }
  function imgInput(tokens, label) {
    const bind = tokens.join(".");
    const cur = getPath(tokens) || "";
    const isBase64 = cur && cur.startsWith("data:");
    const displayVal = isBase64 ? "[Uploaded Local Media]" : cur;
    const prevSrc = isBase64 ? getCachedMediaUrl(cur) : cur;
    const prev = cur ? '<img src="' + esc(prevSrc) + '"/>' : '<div class="avatar-placeholder">no image</div>';
    return '<div class="upload-inline">' +
      '<div class="thumb">' + prev + "</div>" +
      '<input type="file" class="row-file" data-write="' + bind + '" accept="image/*"/>' +
      '<input type="text" data-bind="' + bind + '" placeholder="' + esc(label || "Image URL") + '" value="' + esc(displayVal) + '" data-is-base64="' + (isBase64 ? "1" : "0") + '"/>' +
      "</div>";
  }

  /* ---------- icon picker (for dynamic handles / extra cards) ---------- */
  function iconPicker(bindTokens, sizeKey) {
    const cur = getPath(bindTokens.concat([sizeKey || "icon"])) || "";
    const known = Object.keys(window.bpIcons.ICONS);
    const isEmoji = !known.includes(cur) && cur !== "";
    const options = known.map(k => '<option value="' + k + '"' + (cur === k ? " selected" : "") + ">" + k + "</option>").join("");
    return '<span class="icon-picker">' +
      '<select class="icon-select" data-key="' + bindTokens.join(".") + '">' +
        '<option value="__emoji"' + (isEmoji ? " selected" : "") + ">emoji / custom</option>" + options +
      "</select>" +
      '<span class="icon-preview">' + window.bpIcons.renderIcon(cur, 22) + "</span>" +
      '<input type="text" class="icon-emoji mono" data-key="' + bindTokens.join(".") + '" placeholder="e.g. ⚙️" value="' + esc(isEmoji ? cur : "") + '" style="display:' + (isEmoji ? "inline-block" : "none") + '"/>' +
      "</span>";
  }

  /* ---------- list builder ---------- */
  const listMeta = { opts: null };
  function renderList(container, opts) {
    listMeta.opts = opts;
    const items = opts.items;
    container.innerHTML = items.map((it, i) => {
      const controls = '<div class="row-ctrl">' +
        '<button type="button" class="mini-btn" data-act="up" data-i="' + i + '" title="Move up">↑</button>' +
        '<button type="button" class="mini-btn" data-act="down" data-i="' + i + '" title="Move down">↓</button>' +
        '<button type="button" class="mini-btn danger" data-act="del" data-i="' + i + '" title="Remove">✕</button></div>';
      return '<div class="li-row">' + controls + '<div class="li-fields">' + opts.fields.map(f => f(i)).join("") + "</div></div>";
    }).join("") || (opts.emptyMsg ? '<div class="empty-note">' + esc(opts.emptyMsg) + "</div>" : "");
  }

  function handleListAction(e) {
    const btn = e.target.closest("[data-act]");
    if (!btn || !listMeta.opts) return;
    const { items } = listMeta.opts;
    const act = btn.dataset.act;
    const i = parseInt(btn.dataset.i, 10);
    if (!["up", "down", "del"].includes(act)) return;
    syncBind();
    if (act === "del") items.splice(i, 1);
    else if (act === "up" && i > 0) { const t = items[i - 1]; items[i - 1] = items[i]; items[i] = t; }
    else if (act === "down" && i < items.length - 1) { const t = items[i + 1]; items[i + 1] = items[i]; items[i] = t; }
    markChanged();
    renderSection(curTab);
  }

  /* ---------- generic image upload (within lists) ---------- */
  function handleRowFile(e) {
    const inp = e.target;
    if (!inp.matches(".row-file")) return;
    const f = inp.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { toast("Please pick an image file."); return; }
    showAdminLoader("Loading image...", "Reading (" + (f.size / (1024 * 1024)).toFixed(1) + "MB)...");
    const r = new FileReader();
    r.onload = () => {
      hideAdminLoader();
      const bind = inp.dataset.write;
      setPath(parsePath(bind), r.result);
      markChanged();
      const wrap = inp.closest(".upload-inline");
      if (wrap) {
        const thumb = wrap.querySelector(".thumb");
        const txt = wrap.querySelector("input[type=text]");
        const objUrl = getCachedMediaUrl(r.result);
        if (thumb) thumb.innerHTML = '<img src="' + esc(objUrl) + '"/>';
        if (txt) {
          txt.value = "[Uploaded Local Media]";
          txt.dataset.isBase64 = "1";
        }
      }
      toast("Image updated ✓");
    };
    r.readAsDataURL(f);
  }

  /* ---------- color palette component handlers (Image 2 style) ---------- */
  function handlePaletteClick(e) {
    const card = e.target.closest(".palette-swatch-card");
    if (card && !e.target.matches(".palette-native-input, .palette-reset-btn")) {
      const inp = card.querySelector(".palette-native-input");
      if (inp && typeof inp.showPicker === "function") {
        try { inp.showPicker(); } catch (err) {}
      }
      return;
    }
    const reset = e.target.closest(".palette-reset-btn");
    if (reset) {
      const bind = reset.dataset.resetBind;
      if (!bind) return;
      const tokens = parsePath(bind);
      setPath(tokens, "");
      const wrap = reset.closest(".color-palette-wrap");
      if (wrap) {
        const swatch = wrap.querySelector(".palette-swatch-box");
        if (swatch) swatch.style.background = "var(--accent)";
        const hexEl = wrap.querySelector(".palette-hex-code");
        if (hexEl) hexEl.textContent = "inherit";
        const inp = wrap.querySelector(".palette-native-input");
        if (inp) inp.dataset.paletteUnset = "1";
      }
      reset.remove();
      markChanged();
      applyTheme();
    }
  }

  function handlePaletteNativeInput(e) {
    const inp = e.target;
    if (!inp.matches(".palette-native-input")) return;
    const bind = inp.dataset.bind;
    if (!bind) return;
    const val = (inp.value || "").toLowerCase();
    inp.dataset.paletteUnset = "0";
    const tokens = parsePath(bind);
    setPath(tokens, val);
    const wrap = inp.closest(".color-palette-wrap") || inp.closest(".palette-swatch-card");
    if (wrap) {
      const swatch = wrap.querySelector(".palette-swatch-box");
      if (swatch) swatch.style.background = val;
      const hexEl = wrap.querySelector(".palette-hex-code");
      if (hexEl) hexEl.textContent = val;
      const mainWrap = wrap.closest(".color-palette-wrap");
      if (mainWrap && mainWrap.dataset.allowReset === "1" && !mainWrap.querySelector(".palette-reset-btn")) {
        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "palette-reset-btn";
        resetBtn.dataset.resetBind = bind;
        resetBtn.title = "Reset / inherit color";
        resetBtn.textContent = "✕";
        mainWrap.appendChild(resetBtn);
      }
    }
    markChanged();
    applyTheme();
  }

  /* ---------- icon picker wiring (delegated) ---------- */
  function handleIconPick(e) {
    const sel = e.target.closest(".icon-select");
    if (sel) {
      const tokens = parsePath(sel.dataset.key).concat(["icon"]);
      const emojiEl = sel.parentElement.querySelector(".icon-emoji");
      if (sel.value === "__emoji") {
        emojiEl.style.display = "inline-block";
        setPath(tokens, emojiEl.value || "✦");
        emojiEl.focus();
      } else {
        emojiEl.style.display = "none";
        setPath(tokens, sel.value);
      }
      sel.parentElement.querySelector(".icon-preview").innerHTML = window.bpIcons.renderIcon(
        emojiEl.style.display === "inline-block" ? (emojiEl.value || "✦") : sel.value, 22);
      markChanged();
      return;
    }
    const emoji = e.target.closest(".icon-emoji");
    if (emoji) {
      const tokens = parsePath(emoji.dataset.key).concat(["icon"]);
      setPath(tokens, emoji.value || "✦");
      const wrap = emoji.parentElement;
      const selEl = wrap.querySelector(".icon-select");
      wrap.querySelector(".icon-preview").innerHTML = window.bpIcons.renderIcon(emoji.value || "✦", 22);
      if (selEl) selEl.value = "__emoji";
      markChanged();
    }
  }

  /* ---------- sections ---------- */
  const TABS = [
    { id: "profile", name: "Profile" },
    { id: "about", name: "About" },
    { id: "skills", name: "Skills" },
    { id: "achievements", name: "Achievements" },
    { id: "projects", name: "Projects" },
    { id: "education", name: "Education" },
    { id: "social", name: "Social" },
    { id: "theme", name: "Theme" },
    { id: "footer", name: "Footer" },
    { id: "password", name: "Password" }
  ];

  const TAB_INFO = {
    profile: {
      title: "Profile & Identity",
      desc: "Manage your name, roles, contact info, brand logo, hero card, and action buttons."
    },
    about: {
      title: "About Section",
      desc: "Edit your bio narrative, avatar photo, and spotlight mini-sections."
    },
    skills: {
      title: "Skills & Stack",
      desc: "Organize your technical competencies and toolkits into grouped categories."
    },
    achievements: {
      title: "Achievements & Certifications",
      desc: "Showcase awards, certifications, verifiable credentials, and button labels."
    },
    projects: {
      title: "Featured Projects",
      desc: "Manage portfolio project cards, descriptions, tags, live URLs, and button labels."
    },
    education: {
      title: "Education & Academics",
      desc: "Display your academic degrees, institutions, and timelines."
    },
    social: {
      title: "Social Links & Handles",
      desc: "Configure quick-access links and custom mini app logos."
    },
    theme: {
      title: "Theme, Wallpaper & Appearance",
      desc: "Customize wallpapers, color palettes, 3D scenes, cursor highlights, and typography."
    },
    footer: {
      title: "Footer Configuration",
      desc: "Customize footer credits, copyright notices, and background styling."
    },
    password: {
      title: "Security & Passcode",
      desc: "Manage your dashboard and lock-screen access passcode without criteria restrictions."
    }
  };

  /* card container helper */
  function cardWrap(title, subtitle, content) {
    let head = "";
    if (title || subtitle) {
      head = '<div class="admin-card-head">' +
        (title ? '<h3 class="admin-card-title">' + esc(title) + '</h3>' : '') +
        (subtitle ? '<p class="admin-card-sub">' + esc(subtitle) + '</p>' : '') +
      '</div>';
    }
    return '<div class="admin-card">' + head + content + '</div>';
  }

  /* inline per-section text styling */
  function styleBlock(secKey) {
    return cardWrap(
      "Typography & Color Overrides",
      "Fine-tune font family, custom heading and body colors, and font scale for this section.",
      '<div class="form-grid two-col">' +
        fieldRow("Font Family", selectInput(["type", "overrides", secKey, "font"], [["inherit", "Inherit (global)"], ["space", "Space Grotesk"], ["sans", "System UI"], ["serif", "Serif"], ["mono", "Mono"]])) +
        fieldRow("Heading Color", colorPaletteInput(["type", "overrides", secKey, "headingColor"], "", true)) +
        fieldRow("Body Color", colorPaletteInput(["type", "overrides", secKey, "bodyColor"], "", true)) +
        fieldRow("Text Size (100 = default)", rangeInput(["type", "overrides", secKey, "size"], 70, 150)) +
      "</div>"
    );
  }

  function renderNav() {
    const nav = document.getElementById("navTabs");
    nav.innerHTML = TABS.map(t =>
      '<button type="button" class="tab-btn' + (t.id === curTab ? " active" : "") + '" data-tab="' + t.id + '">' + esc(t.name) + "</button>"
    ).join("");
  }

  const POST = {
    about: { id: "listExtra", fn: afterAbout },
    skills: { id: "listSkills", fn: afterSkills },
    achievements: { id: "listAch", fn: afterAchievements },
    projects: { id: "listProjects", fn: afterProjects },
    education: { id: "listEdu", fn: afterEducation },
    social: { id: "listSocial", fn: afterSocial }
  };

  function renderSection(tab) {
    const host = document.getElementById("editorContent");
    const builders = {
      profile: buildProfile,
      about: buildAbout,
      skills: buildSkills,
      achievements: buildAchievements,
      projects: buildProjects,
      education: buildEducation,
      social: buildSocial,
      theme: buildTheme,
      footer: buildFooter,
      password: buildPassword
    };

    const info = TAB_INFO[tab] || { title: esc(tab), desc: "" };
    const headerBar = '<div class="sec-header-bar">' +
      '<div class="sec-header-info">' +
        '<h2 class="sec-title">' + esc(info.title) + '</h2>' +
        '<p class="sec-desc">' + esc(info.desc) + '</p>' +
      '</div>' +
      '<div class="sec-toolbar"><button type="button" class="btn btn-ghost btn-sm" id="secPreviewBtn">▶ Preview this section</button></div>' +
    '</div>';

    host.innerHTML = headerBar + builders[tab]();
    if (POST[tab]) POST[tab].fn(document.getElementById(POST[tab].id));

    const spb = document.getElementById("secPreviewBtn");
    if (spb) spb.addEventListener("click", () => showPreview(tab));

    const addBtn = document.getElementById("addBtn");
    if (addBtn) addBtn.addEventListener("click", () => {
      const o = listMeta.opts;
      if (o && o.add) { syncBind(); o.add(); markChanged(); renderSection(curTab); }
    });

    bindUpload("avatarUpload", data => { syncBind(); state.owner.avatar = data; renderSection(curTab); markChanged(); });

    bindUpload("logoUpload", data => {
      syncBind();
      state.owner.logo = data;
      const logoUrl = document.getElementById("logoUrl");
      if (logoUrl) logoUrl.value = "";
      syncLogoAndFavicon(data);
      renderSection(curTab);
      markChanged();
      toast("Logo updated & favicon synchronized ✓");
    });

    // Real-time listener for direct logo URL input
    const logoUrlInput = document.getElementById("logoUrl");
    if (logoUrlInput) {
      const handleLogoUrl = () => {
        const val = logoUrlInput.value.trim();
        state.owner.logo = val;
        syncLogoAndFavicon(val);
        markChanged();
      };
      logoUrlInput.addEventListener("input", handleLogoUrl);
      logoUrlInput.addEventListener("change", handleLogoUrl);
    }

    bindMediaUpload("heroMediaUpload", data => {
      state.owner.heroMedia = data;
      markChanged();
      const box = document.getElementById("heroMediaPreviewBox");
      if (box) {
        const objUrl = getCachedMediaUrl(data);
        if (state.owner.heroMediaType === "video") {
          box.innerHTML = '<video src="' + esc(objUrl) + '" autoplay muted loop playsinline></video>';
        } else {
          box.innerHTML = '<img src="' + esc(objUrl) + '" alt="Hero Media"/>';
        }
      }
      const hmUrl = document.getElementById("heroMediaUrl");
      if (hmUrl) {
        hmUrl.value = "[Uploaded local media]";
        hmUrl.dataset.isBase64 = "1";
      }
      toast("Hero background media uploaded ✓");
    });

    const logoClear = document.getElementById("logoClear");
    if (logoClear) {
      logoClear.addEventListener("click", () => {
        state.owner.logo = "";
        const lUrl = document.getElementById("logoUrl");
        if (lUrl) { lUrl.value = ""; lUrl.dataset.isBase64 = "0"; }
        syncLogoAndFavicon("");
        markChanged();
        renderSection(curTab);
        toast("Cleared custom logo: restored default badge favicon.");
      });
    }

    const hmClear = document.getElementById("heroMediaClear");
    if (hmClear) {
      hmClear.addEventListener("click", () => {
        state.owner.heroMedia = "";
        const box = document.getElementById("heroMediaPreviewBox");
        if (box) box.innerHTML = '<div class="avatar-placeholder" style="color:var(--mut);font-size:13px">Default Circle 3D</div>';
        const hmUrl = document.getElementById("heroMediaUrl");
        if (hmUrl) { hmUrl.value = ""; hmUrl.dataset.isBase64 = "0"; }
        markChanged();
        toast("Cleared hero media.");
      });
    }

    const cpForm = document.getElementById("changePasswordForm");
    if (cpForm) {
      cpForm.addEventListener("submit", handlePasswordSubmit);
    }

    bindUpload("wallpaperUpload", data => {
      state.theme.wallpaperImage = data;
      markChanged();
      applyTheme();
      const wrap = document.getElementById("wallpaperUpload");
      if (wrap) {
        const row = wrap.closest(".upload-row");
        if (row) {
          const prevBox = row.querySelector(".avatar-preview");
          if (prevBox) prevBox.innerHTML = '<img src="' + esc(getCachedMediaUrl(data)) + '" alt="Wallpaper Preview"/>';
          const txt = row.querySelector("#wallpaperImageUrl");
          if (txt) { txt.value = "[Uploaded local image]"; txt.dataset.isBase64 = "1"; }
        }
      }
      if (window.bpPalette) {
        showAdminLoader("Analyzing wallpaper colors...", "Deriving harmonious theme palette from image...");
        window.bpPalette.extractFromImage(data)
          .then(colors => applyExtractedPalette(colors, "uploaded image"))
          .catch(e => {
            console.warn("Palette extraction failed", e);
            toast("Image uploaded.");
          })
          .finally(() => {
            hideAdminLoader();
          });
      }
    });

    bindVideoUpload("wallpaperVideoUpload", data => {
      state.theme.wallpaperVideo = data;
      markChanged();
      applyTheme();
      const wrap = document.getElementById("wallpaperVideoUpload");
      if (wrap) {
        const row = wrap.closest(".upload-row");
        if (row) {
          const prevBox = row.querySelector(".avatar-preview");
          if (prevBox) prevBox.innerHTML = '<video src="' + esc(getCachedMediaUrl(data)) + '" autoplay loop muted playsinline></video>';
          const txt = row.querySelector("#wallpaperVideoUrl");
          if (txt) { txt.value = "[Uploaded local video]"; txt.dataset.isBase64 = "1"; }
        }
      }
      if (window.bpPalette) {
        showAdminLoader("Analyzing video colors...", "Sampling frames and extracting theme palette...");
        window.bpPalette.extractFromVideo(data)
          .then(colors => applyExtractedPalette(colors, "uploaded video"))
          .catch(e => {
            console.warn("Video palette extraction failed", e);
            toast("Video uploaded.");
          })
          .finally(() => {
            hideAdminLoader();
          });
      }
    });

    const extImgBtn = document.getElementById("extractImageColorsBtn");
    if (extImgBtn) {
      extImgBtn.addEventListener("click", async () => {
        syncBind();
        let src = state.theme.wallpaperImage;
        if (!src) { toast("No wallpaper image to extract from."); return; }
        showAdminLoader("Analyzing image colors...", "Deriving primary and secondary accents...");
        try {
          if (src.startsWith("idb:") && window.bpData && window.bpData.resolveMedia) {
            await window.bpData.resolveMedia(state);
            src = state.theme.wallpaperImage;
          }
          const colors = await window.bpPalette.extractFromImage(src);
          applyExtractedPalette(colors, "image");
        } catch (e) {
          toast("Failed to extract: " + (e.message || "error"));
        } finally {
          hideAdminLoader();
        }
      });
    }

    const extVidBtn = document.getElementById("extractVideoColorsBtn");
    if (extVidBtn) {
      extVidBtn.addEventListener("click", async () => {
        syncBind();
        let src = state.theme.wallpaperVideo;
        if (!src) { toast("No wallpaper video to extract from."); return; }
        showAdminLoader("Analyzing video frames...", "Sampling frames and deriving theme palette...");
        try {
          if (src.startsWith("idb:") && window.bpData && window.bpData.resolveMedia) {
            await window.bpData.resolveMedia(state);
            src = state.theme.wallpaperVideo;
          }
          const colors = await window.bpPalette.extractFromVideo(src);
          applyExtractedPalette(colors, "video");
        } catch (e) {
          toast("Failed to extract: " + (e.message || "error"));
        } finally {
          hideAdminLoader();
        }
      });
    }

    const wpClear = document.getElementById("wallpaperClear");
    if (wpClear) {
      wpClear.addEventListener("click", () => {
        state.theme.wallpaperImage = "";
        state.theme.wallpaperVideo = "";
        markChanged();
        applyTheme();
        renderSection(curTab);
        toast("Cleared wallpaper.");
      });
    }

    linkRangeVal();
  }

  function applyExtractedPalette(colors, sourceName) {
    if (!colors) return;
    state.theme.accent = colors.accent;
    state.theme.accent2 = colors.accent2;
    state.theme.bg = colors.bg;
    state.theme.isDark = !!colors.isDark;
    state.theme.themeMode = colors.isDark ? "dark" : "light";
    if (!state.theme.cursor) state.theme.cursor = {};
    state.theme.cursor.color = colors.accent;
    state.theme.cursor.glow = true;
    state.theme.cursor.glowColor = colors.accent;
    if (!state.type) state.type = {};
    state.type.headingColor = colors.headingColor;
    state.type.bodyColor = colors.bodyColor;
    markChanged();
    applyTheme();
    renderSection(curTab);
    toast("✨ Adapted palette to " + sourceName + " (Accent: " + colors.accent + ")! Click Save to persist.");
  }

  function linkRangeVal() {
    $$(".range-wrap").forEach(wrap => {
      const inp = $("input[type=range]", wrap);
      const out = $(".range-val", wrap);
      if (inp && out) inp.addEventListener("input", () => { out.textContent = inp.value; markChanged(); });
    });
  }

  /* --- profile --- */
  function buildProfile() {
    const o = state.owner;
    const logoPrev = o.logo
      ? '<img src="' + esc(getCachedMediaUrl(o.logo)) + '" alt="Logo"/>'
      : '<span class="brand-dot"></span>';

    const heroMediaPrev = o.heroMedia
      ? (o.heroMediaType === "video"
          ? '<video src="' + esc(getCachedMediaUrl(o.heroMedia)) + '" autoplay muted loop playsinline></video>'
          : '<img src="' + esc(getCachedMediaUrl(o.heroMedia)) + '" alt="Hero Media"/>')
      : '<div class="avatar-placeholder" style="color:var(--mut);font-size:13px">Default Circle 3D</div>';

    const personalCard = cardWrap(
      "Personal Information",
      "Basic identity, contact details, and role specifications.",
      '<div class="form-grid two-col">' +
        fieldRow("Full Name", tInput(["owner", "name"])) +
        fieldRow("Handle", tInput(["owner", "handle"])) +
        fieldRow("Title / Role", tInput(["owner", "title"])) +
        fieldRow("Location", tInput(["owner", "location"])) +
        fieldRow("Email", tInput(["owner", "email"])) +
        fieldRow("Phone", tInput(["owner", "phone"])) +
        fieldRow("Tagline", taInput(["owner", "tagline"], 2)) +
      '</div>'
    );

    const buttonsCard = cardWrap(
      "Action & CTA Buttons",
      "Customize button text for hero action links and the resume download button.",
      '<div class="form-grid two-col">' +
        fieldRow("Primary CTA Button Text", tInput(["owner", "ctaPrimary"], { ph: "See the work" })) +
        fieldRow("Secondary CTA Button Text", tInput(["owner", "ctaSecondary"], { ph: "Get in touch" })) +
        fieldRow("Resume Button Text", tInput(["owner", "ctaResume"], { ph: "⬇ Download Resume" })) +
      '</div>'
    );

    const logoCard = cardWrap(
      "Brand Logo & Tab Favicon",
      "Upload a custom brand logo or animated GIF. Automatically sets the site favicon and the secret top bar trigger icon.",
      '<div class="upload-block" style="margin-top:0">' +
        '<div class="upload-row">' +
          '<div class="logo-preview-box" id="logoPreviewBox">' + logoPrev + '</div>' +
          '<div class="upload-controls">' +
            '<input type="file" id="logoUpload" accept="image/*"/>' +
            '<span class="fl-hint">Upload a logo image / GIF or enter a direct URL:</span>' +
            '<input type="text" id="logoUrl" placeholder="https://… / logo URL" value="' + (o.logo && o.logo.startsWith("data:") ? "[Uploaded local logo]" : esc(o.logo || "")) + '" data-is-base64="' + (o.logo && o.logo.startsWith("data:") ? "1" : "0") + '"/>' +
            (o.logo ? '<button type="button" class="mini-btn danger" id="logoClear">Clear custom logo</button>' : "") +
          '</div>' +
        '</div>' +
      '</div>'
    );

    const heroMediaCard = cardWrap(
      "Home Hero Box Background Media & Blur Layer",
      "Upload an image or video inside the top hero box (above the background wallpaper), and customize its dual-color gradient blur layer.",
      '<div class="upload-block" style="margin-top:0">' +
        '<div class="upload-row">' +
          '<div class="hero-media-preview-box" id="heroMediaPreviewBox">' + heroMediaPrev + '</div>' +
          '<div class="upload-controls">' +
            '<div style="display:flex;gap:12px;margin-bottom:8px;align-items:center;">' +
              '<span class="fl-label" style="margin:0;font-size:13px">Media Type:</span>' +
              selectInput(["owner", "heroMediaType"], [["image", "Image"], ["video", "Video"]]) +
            '</div>' +
            '<input type="file" id="heroMediaUpload" accept="image/*,video/*"/>' +
            '<span class="fl-hint">Upload an image or video for the top main hero card box, or enter a URL:</span>' +
            '<input type="text" id="heroMediaUrl" placeholder="https://… / media URL" value="' + (o.heroMedia && o.heroMedia.startsWith("data:") ? "[Uploaded local media]" : esc(o.heroMedia || "")) + '" data-is-base64="' + (o.heroMedia && o.heroMedia.startsWith("data:") ? "1" : "0") + '"/>' +
            (o.heroMedia ? '<button type="button" class="mini-btn danger" id="heroMediaClear">Clear hero media</button>' : "") +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:20px;border-top:1px solid var(--line);padding-top:16px;">' +
        '<h4 style="margin:0 0 10px;font-size:15px;color:var(--ink);">Hero Box Upper Blur Layer - Gradient Tint Overlay</h4>' +
        '<div class="form-grid two-col">' +
          fieldRow("Gradient Color 1 (Ocean Teal)", colorPaletteInput(["owner", "heroOverlayColor1"], "#0F86A1")) +
          fieldRow("Gradient Color 2 (Amber Peach)", colorPaletteInput(["owner", "heroOverlayColor2"], "#EBC7B5")) +
        '</div>' +
        '<span class="fl-hint" style="margin-top:8px">Two-color palette tint layer. When hero image or video wallpaper is uploaded, it shines through this translucent dual-gradient layer.</span>' +
      '</div>'
    );

    return personalCard + buttonsCard + logoCard + heroMediaCard + styleBlock("hero");
  }

  /* --- about + avatar + extra cards --- */
  function buildAbout() {
    const o = state.owner;
    const text = (state.about || []).join("\n");
    const av = o.avatar ? '<img id="avatarPrev" src="' + esc(o.avatar) + '" alt="Avatar preview"/>' : '<div class="avatar-placeholder mono">' + esc((o.name || "AS").split(/\s+/).map(w => w[0]).join("").toUpperCase()) + "</div>";

    const avatarCard = cardWrap(
      "Profile Avatar",
      "Portrait image displayed in the About section.",
      '<div class="upload-block" style="margin-top:0">' +
        '<div class="upload-row"><div class="avatar-preview">' + av + "</div>" +
        '<div class="upload-controls">' +
          '<input type="file" id="avatarUpload" accept="image/*"/>' +
          '<span class="fl-hint">Upload an image (stored locally in IndexedDB) or paste a URL:</span>' +
          '<input type="text" id="avatarUrl" placeholder="https://… / image URL" value="' + esc(o.avatar || "") + '"/>' +
          (o.avatar ? '<button type="button" class="mini-btn danger" id="avatarClear">Clear image</button>' : "") +
        "</div></div></div>"
    );

    const narrativeCard = cardWrap(
      "About Narrative",
      "Biographical paragraphs describing your journey and craft.",
      fieldRow("Bio Paragraphs (One Per Line)", '<textarea id="aboutTa" rows="6">' + esc(text) + "</textarea>", "Each line becomes a paragraph on the site.")
    );

    const miniCard = cardWrap(
      "Spotlight Mini-Sections",
      "Highlight key traits, specialties, or fast facts beneath your bio.",
      '<div id="listExtra"></div>' +
      '<div class="list-toolbar"><button type="button" class="btn btn-ghost btn-sm" id="addBtn">+ Add Mini-Section</button></div>'
    );

    return avatarCard + narrativeCard + miniCard + styleBlock("about");
  }
  function afterAbout(host) {
    renderList(host, {
      items: state.aboutExtra,
      emptyMsg: "No mini-sections yet.",
      add() { state.aboutExtra.push({ icon: "light", title: "New fact", text: "" }); },
      fields: [i => fieldRow("Icon", iconPicker(["aboutExtra", i])) +
        fieldRow("Title", tInput(["aboutExtra", i, "title"])) +
        fieldRow("Text", taInput(["aboutExtra", i, "text"], 2))]
    });
  }

  /* --- skills --- */
  function buildSkills() {
    const skillsCard = cardWrap(
      "Skill Categories & Toolkits",
      "Group your languages, frameworks, libraries, and workflows.",
      '<div id="listSkills"></div>' +
      '<div class="list-toolbar"><button type="button" class="btn btn-ghost btn-sm" id="addBtn">+ Add Skill Group</button></div>'
    );
    return skillsCard + styleBlock("skills");
  }
  function afterSkills(host) {
    renderList(host, {
      items: state.skills,
      emptyMsg: "No skill groups yet.",
      add() { state.skills.push({ cat: "New group", items: "Item1, Item2" }); },
      fields: [i => fieldRow("Category", tInput(["skills", i, "cat"])) +
        fieldRow("Skills (comma separated)", tInput(["skills", i, "items"]))]
    });
  }

  /* --- achievements --- */
  function buildAchievements() {
    const achCard = cardWrap(
      "Honors, Awards & Certifications",
      "Showcase credentials with certificates and customized action buttons.",
      '<div id="listAch"></div>' +
      '<div class="list-toolbar"><button type="button" class="btn btn-ghost btn-sm" id="addBtn">+ Add Achievement</button></div>'
    );
    return achCard + styleBlock("achievements");
  }
  function afterAchievements(host) {
    renderList(host, {
      items: state.achievements,
      emptyMsg: "No achievements yet.",
      add() { state.achievements.push({ logo: "", name: "New achievement", cert: "", btnText: "View certificate ↗" }); },
      fields: [i => fieldRow("Logo Image", imgInput(["achievements", i, "logo"], "Logo URL")) +
        fieldRow("Achievement Name", tInput(["achievements", i, "name"])) +
        fieldRow("Certificate Image", imgInput(["achievements", i, "cert"], "Certificate image URL or upload")) +
        fieldRow("Button Text", tInput(["achievements", i, "btnText"], { ph: "View certificate ↗" }))]
    });
  }

  /* --- projects --- */
  function buildProjects() {
    const projCard = cardWrap(
      "Featured Projects",
      "Showcase selected works with screenshots, descriptions, tags, live links, and button labels.",
      '<div id="listProjects"></div>' +
      '<div class="list-toolbar"><button type="button" class="btn btn-ghost btn-sm" id="addBtn">+ Add Project</button></div>'
    );
    return projCard + styleBlock("projects");
  }
  function afterProjects(host) {
    renderList(host, {
      items: state.projects,
      emptyMsg: "No projects yet.",
      add() { state.projects.push({ image: "", title: "New project", desc: "", tags: [], link: "#", btnText: "Visit ↗" }); },
      fields: [i =>
        fieldRow("Project Image", imgInput(["projects", i, "image"], "Image URL")) +
        fieldRow("Project Title", tInput(["projects", i, "title"])) +
        fieldRow("Description", taInput(["projects", i, "desc"], 3)) +
        fieldRow("Tags (comma separated)", tInput(["projects", i, "tags"])) +
        fieldRow("Project URL (Destination)", tInput(["projects", i, "link"], { ph: "https://…" })) +
        fieldRow("Button Text", tInput(["projects", i, "btnText"], { ph: "Visit ↗" }))]
    });
  }

  /* --- education --- */
  function buildEducation() {
    return cardWrap(
      "Academic Qualifications",
      "List your academic degrees, colleges, institutions, timelines, and descriptions.",
      '<div id="listEdu"></div>' +
      '<div class="list-toolbar"><button type="button" class="btn btn-ghost btn-sm" id="addBtn">+ Add Entry</button></div>'
    );
  }
  function afterEducation(host) {
    renderList(host, {
      items: state.education,
      emptyMsg: "No education entries yet.",
      add() { state.education.push({ degree: "Degree", school: "School", when: "2020 - 2024", desc: "" }); },
      fields: [i =>
        fieldRow("Degree", tInput(["education", i, "degree"])) +
        fieldRow("School", tInput(["education", i, "school"])) +
        fieldRow("Period", tInput(["education", i, "when"])) +
        fieldRow("Description", taInput(["education", i, "desc"], 3))]
    });
  }

  /* --- social (dynamic handles & mini app logos) --- */
  function buildSocial() {
    return cardWrap(
      "Social Platforms & Contact Handles",
      "Upload mini app logos, labels, and links for each button.",
      '<div id="listSocial"></div>' +
      '<div class="list-toolbar"><button type="button" class="btn btn-ghost btn-sm" id="addBtn">+ Add Handle</button></div>'
    );
  }
  function afterSocial(host) {
    renderList(host, {
      items: state.socialLinks,
      emptyMsg: "No social handles yet.",
      add() { state.socialLinks.push({ logo: "", icon: "globe", label: "New handle", url: "" }); },
      fields: [i => fieldRow("Mini App Logo", imgInput(["socialLinks", i, "logo"], "Mini app logo URL or upload")) +
        fieldRow("Label", tInput(["socialLinks", i, "label"])) +
        fieldRow("URL / Handle", tInput(["socialLinks", i, "url"], { ph: "https://… or handle" }))]
    });
  }

  /* --- theme --- */
  function buildTheme() {
    const t = state.theme;
    const wallpapers = [
      ["circle", "Circle Ambient Mesh (Default)"],
      ["blueprint", "Blueprint Grid"],
      ["grid", "Fine Grid"],
      ["circuit", "Circuit"],
      ["solid", "Solid"],
      ["image", "Image Upload"],
      ["video", "Video Upload"]
    ];
    const scenes = [
      ["circle", "Circle 3D Spheres & Rings (Default)"],
      ["workshop", "Workshop (Shapes)"],
      ["particles", "Particles Only"],
      ["minimal", "Minimal"]
    ];
    const cursorStyles = [["none", "Default (Auto)"], ["dot", "Dot"], ["ring", "Ring"]];

    let mediaBlock = "";
    if (t.wallpaper === "image") {
      const prev = t.wallpaperImage
        ? '<img src="' + esc(getCachedMediaUrl(t.wallpaperImage)) + '" alt="Wallpaper Preview"/>'
        : '<div class="avatar-placeholder">No Image</div>';
      mediaBlock = '<div class="upload-block" style="margin-top:16px">' +
        '<span class="fl-label">Wallpaper Image & Auto-Theme</span>' +
        '<div class="upload-row">' +
          '<div class="avatar-preview wide">' + prev + '</div>' +
          '<div class="upload-controls">' +
            '<input type="file" id="wallpaperUpload" accept="image/*"/>' +
            '<span class="fl-hint">Upload an image (or paste URL): theme and text colors auto-adapt!</span>' +
            '<input type="text" id="wallpaperImageUrl" placeholder="https://… / image URL" value="' + (t.wallpaperImage && t.wallpaperImage.startsWith("data:") ? "[Uploaded local image]" : esc(t.wallpaperImage || "")) + '" data-is-base64="' + (t.wallpaperImage && t.wallpaperImage.startsWith("data:") ? "1" : "0") + '"/>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="extractImageColorsBtn">🎨 Re-extract palette from image</button>' +
            (t.wallpaperImage ? '<button type="button" class="mini-btn danger" id="wallpaperClear">Clear wallpaper</button>' : "") +
          '</div>' +
        '</div>' +
        '<div class="fl-hint" style="margin-top:10px">✨ Uploading an image automatically adapts the accent, text, cursor glow, and background colors.</div>' +
      '</div>';
    } else if (t.wallpaper === "video") {
      const prev = t.wallpaperVideo
        ? '<video src="' + esc(getCachedMediaUrl(t.wallpaperVideo)) + '" autoplay loop muted playsinline></video>'
        : '<div class="avatar-placeholder">No Video</div>';
      mediaBlock = '<div class="upload-block" style="margin-top:16px">' +
        '<span class="fl-label">Wallpaper Video & Auto-Theme</span>' +
        '<div class="upload-row">' +
          '<div class="avatar-preview wide">' + prev + '</div>' +
          '<div class="upload-controls">' +
            '<input type="file" id="wallpaperVideoUpload" accept="video/*"/>' +
            '<span class="fl-hint">Upload a video loop (or paste URL): website colors will auto-adapt!</span>' +
            '<input type="text" id="wallpaperVideoUrl" placeholder="https://… / video URL or path" value="' + (t.wallpaperVideo && t.wallpaperVideo.startsWith("data:") ? "[Uploaded local video]" : esc(t.wallpaperVideo || "")) + '" data-is-base64="' + (t.wallpaperVideo && t.wallpaperVideo.startsWith("data:") ? "1" : "0") + '"/>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="extractVideoColorsBtn">🎨 Re-extract palette from video</button>' +
            (t.wallpaperVideo ? '<button type="button" class="mini-btn danger" id="wallpaperClear">Clear wallpaper</button>' : "") +
          '</div>' +
        '</div>' +
        '<div class="fl-hint" style="margin-top:10px">✨ Uploading a video automatically samples frames and adapts the theme, typography, and cursor highlight colors.</div>' +
      '</div>';
    }

    const wallpaperCard = cardWrap(
      "Wallpaper & Visual Canvas",
      "Select your background canvas style or upload a custom image or video.",
      fieldRow("Wallpaper Style", selectInput(["theme", "wallpaper"], wallpapers)) + mediaBlock
    );

    const paletteCard = cardWrap(
      "Color Palette & Accents",
      "Core visual colors applied across buttons, highlights, badges, and backgrounds.",
      '<div class="form-grid two-col">' +
        fieldRow("Accent Color", colorPaletteInput(["theme", "accent"], "#0F86A1")) +
        fieldRow("Secondary Accent Color", colorPaletteInput(["theme", "accent2"], "#EBC7B5")) +
        fieldRow("Background Color", colorPaletteInput(["theme", "bg"], "#F8EFE5")) +
      '</div>'
    );

    const sceneCard = cardWrap(
      "3D Interactive Scene",
      "Interactive Three.js geometric simulations running in the backdrop.",
      fieldRow("3D Scene Simulation", selectInput(["theme", "scene"], scenes), "Circle -> Spheres & rings, Workshop -> floating 3D shapes, Particles -> ambient particle cloud")
    );

    const cursorCard = cardWrap(
      "Custom Cursor & Ambient Glow",
      "Interactive cursor styling and pointer ambient glow.",
      '<div class="form-grid two-col">' +
        fieldRow("Cursor Style", selectInput(["theme", "cursor", "style"], cursorStyles)) +
        fieldRow("Cursor Color", colorPaletteInput(["theme", "cursor", "color"], "#0F86A1")) +
        fieldRow("Glow Around Cursor", checkboxInput(["theme", "cursor", "glow"])) +
        fieldRow("Glow Color", colorPaletteInput(["theme", "cursor", "glowColor"], "#0F86A1")) +
      '</div>'
    );

    const typeCard = cardWrap(
      "Global Typography System",
      "Fonts, scales, and text colors applied throughout the website.",
      '<div class="form-grid two-col">' +
        fieldRow("Heading Font", selectInput(["type", "fontHeading"], FONT_OPTS)) +
        fieldRow("Body Font", selectInput(["type", "fontBody"], FONT_OPTS)) +
        fieldRow("Heading Color", colorPaletteInput(["type", "headingColor"], "#1B1B1B")) +
        fieldRow("Body Color", colorPaletteInput(["type", "bodyColor"], "#333333")) +
        fieldRow("Heading Size (100 = default)", rangeInput(["type", "headingScale"], 70, 150)) +
        fieldRow("Body Size (100 = default)", rangeInput(["type", "bodyScale"], 70, 150)) +
      '</div>'
    );

    return wallpaperCard + paletteCard + sceneCard + cursorCard + typeCard;
  }

  /* --- footer --- */
  function buildFooter() {
    const footerCard = cardWrap(
      "Footer Content & Copyright",
      "Bottom signature, credits, and footer background styling.",
      '<div class="form-grid two-col">' +
        fieldRow("Left Text", tInput(["theme", "footer", "left"])) +
        fieldRow("Right Text (e.g. ©)", tInput(["theme", "footer", "right"])) +
      '</div>' +
      fieldRow("Footer Background Color", colorPaletteInput(["theme", "footer", "bg"], "", true), "Choose a custom color from the palette for the footer background, or click ✕ to reset to theme default.")
    );
    return footerCard + styleBlock("footer");
  }

  /* --- password --- */
  function buildPassword() {
    const isSet = window.bpData.isAuthConfigured();
    const curPassRow = isSet ? (
      fieldRow("Current Passcode", '<div class="pass-wrap"><input type="password" id="curPassInput" placeholder="Enter current passcode" /><button type="button" class="pass-toggle" data-toggle="curPassInput" aria-label="Toggle password visibility"><svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div>')
    ) : "";

    const formContent = '<form id="changePasswordForm" class="auth-form" style="max-width:440px;text-align:left;">' +
      curPassRow +
      fieldRow("New Passcode", '<div class="pass-wrap"><input type="password" id="newPassInput" placeholder="Enter new passcode" required /><button type="button" class="pass-toggle" data-toggle="newPassInput" aria-label="Toggle password visibility"><svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div>', "No length or symbol restrictions.") +
      fieldRow("Confirm New Passcode", '<div class="pass-wrap"><input type="password" id="confirmPassInput" placeholder="Confirm new passcode" required /><button type="button" class="pass-toggle" data-toggle="confirmPassInput" aria-label="Toggle password visibility"><svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div>') +
      '<div id="changePassMsg" class="auth-error" style="text-align:left;min-height:20px;margin-top:6px;"></div>' +
      '<button type="submit" class="btn btn-primary" id="changePassSubmit" style="margin-top:10px;">Update Passcode</button>' +
    '</form>';

    return cardWrap(
      "Owner Passcode & Lock Security",
      "Update the secret passcode used to access this dashboard and the owner lock screen. There are no restrictions or criteria on length, characters, or symbols.",
      formContent
    );
  }

  function handlePasswordSubmit(e) {
    e.preventDefault();
    const curInp = document.getElementById("curPassInput");
    const newInp = document.getElementById("newPassInput");
    const confInp = document.getElementById("confirmPassInput");
    const msg = document.getElementById("changePassMsg");
    if (!newInp || !confInp) return;

    const newPass = newInp.value;
    const confPass = confInp.value;

    if (!newPass) {
      if (msg) msg.textContent = "New passcode cannot be empty.";
      return;
    }
    if (newPass !== confPass) {
      if (msg) msg.textContent = "Passcodes do not match. Please retype.";
      return;
    }

    if (window.bpData.isAuthConfigured() && curInp) {
      const curPass = curInp.value;
      window.bpData.checkPassword(curPass).then(ok => {
        if (!ok) {
          if (msg) msg.textContent = "Current passcode is incorrect.";
          curInp.select();
        } else {
          window.bpData.setPassword(newPass).then(() => {
            if (msg) {
              msg.style.color = "#2a9d8f";
              msg.textContent = "Passcode updated successfully! ✓";
            }
            toast("Passcode updated successfully ✓");
            setTimeout(() => renderSection("password"), 1500);
          });
        }
      });
    } else {
      window.bpData.setPassword(newPass).then(() => {
        if (msg) {
          msg.style.color = "#2a9d8f";
          msg.textContent = "Passcode set successfully! ✓";
        }
        toast("Passcode set successfully ✓");
        setTimeout(() => renderSection("password"), 1500);
      });
    }
  }

  const FONT_OPTS = [["jakarta", "Plus Jakarta Sans (Circle Default)"], ["space", "Space Grotesk"], ["sans", "System UI"], ["serif", "Serif"], ["mono", "Mono"]];

  /* ---------- sync bound inputs ---------- */
  function syncBind() {
    $$("#editorContent [data-bind]").forEach(inp => {
      const p = inp.dataset.bind;
      if (!p) return;
      if (inp.classList.contains("palette-native-input") && inp.dataset.paletteUnset === "1") return;
      const tokens = parsePath(p);
      if (tokens[0] === "about" && tokens.length === 1) {
        state.about = inp.value.split("\n").map(s => s.trim()).filter(Boolean);
        return;
      }
      let val = inp.value;
      if (inp.dataset.isBase64 === "1" && (val.startsWith("[Uploaded") || !val.trim())) {
        return;
      }
      if (inp.type === "checkbox") val = inp.checked;
      else if (inp.type === "range" || inp.type === "number") val = Number(val);
      setPath(tokens, val);
      if (tokens[tokens.length - 1] === "tags") {
        setPath(tokens, String(inp.value).split(",").map(s => s.trim()).filter(Boolean));
      }
    });
    const aboutTa = document.getElementById("aboutTa");
    if (aboutTa) state.about = aboutTa.value.split("\n").map(s => s.trim()).filter(Boolean);
    const avatarUrl = document.getElementById("avatarUrl");
    if (avatarUrl && !avatarUrl.value.startsWith("[Uploaded")) state.owner.avatar = avatarUrl.value.trim();
    const logoUrl = document.getElementById("logoUrl");
    if (logoUrl && !logoUrl.value.startsWith("[Uploaded")) state.owner.logo = logoUrl.value.trim();
    const heroMediaUrl = document.getElementById("heroMediaUrl");
    if (heroMediaUrl && !heroMediaUrl.value.startsWith("[Uploaded")) state.owner.heroMedia = heroMediaUrl.value.trim();
    const wpImgUrl = document.getElementById("wallpaperImageUrl");
    if (wpImgUrl && !wpImgUrl.value.startsWith("[Uploaded")) state.theme.wallpaperImage = wpImgUrl.value.trim();
    const wpVidUrl = document.getElementById("wallpaperVideoUrl");
    if (wpVidUrl && !wpVidUrl.value.startsWith("[Uploaded")) state.theme.wallpaperVideo = wpVidUrl.value.trim();
  }

  /* ---------- auth ---------- */
  function showEditor() {
    document.getElementById("adminAuth").style.display = "none";
    document.getElementById("editorRoot").style.display = "block";
    renderNav();
    renderSection(curTab);
    clearChanged();
  }

  function initAuth() {
    const form = document.getElementById("authForm");
    const pass = document.getElementById("authPass");
    const msg = document.getElementById("authMsg");
    const head = $("#authSub");

    if (window.bpData.isLoggedIn()) { showEditor(); return; }
    if (!window.bpData.isAuthConfigured()) {
      head.textContent = "This is a fresh install: choose a passcode for the dashboard.";
    }
    form.addEventListener("submit", e => {
      e.preventDefault();
      const val = pass.value.trim();
      if (!val) return;
      if (!window.bpData.isAuthConfigured()) {
        window.bpData.setPassword(val).then(() => { window.bpData.setLoggedIn(true); showEditor(); });
      } else {
        window.bpData.checkPassword(val).then(ok => {
          if (ok) { window.bpData.setLoggedIn(true); showEditor(); }
          else { msg.textContent = "Incorrect passcode."; pass.select(); }
        }).catch(err => {
          msg.textContent = err.message || "Authentication error.";
          pass.select();
        });
      }
    });
  }

  /* ---------- top actions + nav delegation ---------- */
  function initActions() {
    // nav (delegated once: fixes highlight glitch)
    document.getElementById("navTabs").addEventListener("click", e => {
      const b = e.target.closest(".tab-btn");
      if (!b) return;
      syncBind();
      curTab = b.dataset.tab;
      $$(".tab-btn").forEach(x => x.classList.toggle("active", x === b));
      renderSection(curTab);
    });

    // Eye toggle delegation for inputs with data-toggle
    document.addEventListener("click", e => {
      const toggle = e.target.closest(".pass-toggle");
      if (!toggle) return;
      const targetId = toggle.dataset.toggle;
      const inp = targetId ? document.getElementById(targetId) : toggle.parentElement.querySelector("input");
      if (inp) {
        const isPass = inp.type === "password";
        inp.type = isPass ? "text" : "password";
        toggle.classList.toggle("revealed", isPass);
        toggle.setAttribute("aria-label", isPass ? "Hide password" : "Show password");
      }
    });

    document.getElementById("previewModalClose").addEventListener("click", closePreview);
    document.getElementById("previewModal").addEventListener("click", e => {
      if (e.target === e.currentTarget) closePreview();
    });

    document.getElementById("saveBtn").addEventListener("click", async () => {
      syncBind();
      const saveBtn = document.getElementById("saveBtn");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      showAdminLoader("Saving portfolio changes...", "Writing data to secure browser storage...");
      try {
        await new Promise(res => setTimeout(res, 50));
        await window.bpData.saveData(state);
        clearChanged();
        applyTheme();
        toast("Saved ✓ - refresh the site to see changes.");
      } catch (err) {
        console.error("Save error:", err);
        toast("Save error: " + (err.message || "Failed to persist"));
      } finally {
        hideAdminLoader();
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 Save changes";
      }
    });
    document.getElementById("resetBtn").addEventListener("click", async () => {
      if (!confirm("Reset all content to defaults? This cannot be undone.")) return;
      showAdminLoader("Resetting to defaults...", "Restoring default portfolio configuration...");
      await new Promise(res => setTimeout(res, 40));
      state = window.bpData.resetData();
      applyTheme();
      renderNav();
      renderSection(curTab);
      hideAdminLoader();
      toast("Reset to defaults.");
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
      window.bpData.setLoggedIn(false);
      sessionStorage.removeItem("bp_server_token");
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      window.location.reload();
    });

    const content = document.getElementById("editorContent");
    content.addEventListener("click", handleListAction);
    content.addEventListener("click", handleIconPick);
    content.addEventListener("click", handlePaletteClick);
    content.addEventListener("input", handlePaletteNativeInput);
    content.addEventListener("change", handlePaletteNativeInput);
    content.addEventListener("change", handleRowFile);
    content.addEventListener("input", e => {
      if (e.target.matches("[data-bind], .icon-emoji, #avatarUrl, #aboutTa, #logoUrl, #heroMediaUrl")) markChanged();
    });
    content.addEventListener("change", e => {
      if (e.target.matches("[data-bind]")) {
        markChanged();
        if (e.target.dataset.bind === "theme.wallpaper") {
          syncBind();
          applyTheme();
          renderSection(curTab);
        } else if (e.target.dataset.bind.startsWith("theme.")) {
          syncBind();
          applyTheme();
        }
      }
    });
  }

  function bindUpload(fileId, onData) {
    const inp = document.getElementById(fileId);
    if (!inp) return;
    inp.addEventListener("change", () => {
      const f = inp.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { toast("Please pick an image file."); return; }
      showAdminLoader("Loading image...", "Reading (" + (f.size / (1024 * 1024)).toFixed(1) + "MB) and preparing preview...");
      setTimeout(() => {
        const r = new FileReader();
        r.onload = () => {
          showAdminLoader("Applying image...", "Updating content and adapting palette...");
          setTimeout(() => {
            try {
              onData(r.result);
            } finally {
              hideAdminLoader();
            }
          }, 30);
        };
        r.onerror = () => {
          hideAdminLoader();
          toast("Failed to read image file.");
        };
        r.readAsDataURL(f);
      }, 50);
    });
  }

  function bindMediaUpload(fileId, onData) {
    const inp = document.getElementById(fileId);
    if (!inp) return;
    inp.addEventListener("change", () => {
      const f = inp.files[0];
      if (!f) return;
      const isVid = /^video\//.test(f.type);
      const isImg = /^image\//.test(f.type);
      if (!isVid && !isImg) {
        toast("Please choose an image or video file.");
        return;
      }
      if (f.size > 60 * 1024 * 1024) {
        toast("File exceeds 60MB limit. Please choose a smaller file.");
        return;
      }
      state.owner.heroMediaType = isVid ? "video" : "image";
      showAdminLoader(isVid ? "Loading video file..." : "Loading image file...", "Reading (" + (f.size / (1024 * 1024)).toFixed(1) + "MB)...");
      setTimeout(() => {
        const r = new FileReader();
        r.onload = () => {
          showAdminLoader("Applying hero media...", "Rendering media element...");
          setTimeout(() => {
            try {
              onData(r.result);
            } finally {
              hideAdminLoader();
            }
          }, 30);
        };
        r.onerror = () => {
          hideAdminLoader();
          toast("Failed to read media file.");
        };
        r.readAsDataURL(f);
      }, 50);
    });
  }

  function bindVideoUpload(fileId, onData) {
    const inp = document.getElementById(fileId);
    if (!inp) return;
    inp.addEventListener("change", () => {
      const f = inp.files[0];
      if (!f) return;
      if (!/^video\//.test(f.type)) { toast("Please pick a video file (e.g. mp4, webm)."); return; }
      if (f.size > 60 * 1024 * 1024) {
        toast("Video exceeds 60MB limit. Please choose a file under 60MB.");
        return;
      }
      showAdminLoader("Loading video (" + (f.size / (1024 * 1024)).toFixed(1) + "MB)...", "Reading and caching video into storage...");
      setTimeout(() => {
        const r = new FileReader();
        r.onload = () => {
          showAdminLoader("Applying video wallpaper...", "Extracting theme colors & applying video...");
          setTimeout(() => {
            try {
              onData(r.result);
            } finally {
              hideAdminLoader();
            }
          }, 30);
        };
        r.onerror = () => {
          hideAdminLoader();
          toast("Failed to read video file.");
        };
        r.readAsDataURL(f);
      }, 50);
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    applyTheme();
    initAuth();
    initActions();
    if (window.bpData && window.bpData.resolveMedia) {
      window.bpData.resolveMedia(state).then(() => {
        applyTheme();
        if (window.bpData.isLoggedIn()) {
          renderSection(curTab);
        }
      }).catch(err => console.warn("resolveMedia error in admin:", err));
    }
  }

  window.bpAdmin = {
    applyTheme,
    getState: () => state,
    setState: s => { state = s; applyTheme(); renderSection(curTab); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
