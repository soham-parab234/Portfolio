/* ============================================================
   SCHEMATIC - PUBLIC SITE RENDERER (v2)
   Reads bpData, fills the page, starts the 3D scene, applies
   theme + typography, wires the secret owner gate, resume
   download, certificates lightbox and cursor effects.
   ============================================================ */

(function () {
  "use strict";

  const PREVIEW = new URLSearchParams(window.location.search).has("preview");
  const D = PREVIEW ? window.bpData.loadPreview() : window.bpData.loadData();
  const renderIcon = window.bpIcons.renderIcon;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bootStartTime = performance.now();

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function safeUrl(raw) {
    if (!raw || typeof raw !== "string") return "#";
    const trimmed = raw.trim();
    if (/^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#|[a-zA-Z0-9_\-]+\.html)/i.test(trimmed)) {
      return trimmed;
    }
    if (/^[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed)) {
      return "https://" + trimmed;
    }
    return "#";
  }
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "";
  }
  function heroQuickLink(needle) {
    const m = (D.socialLinks || []).find(s => String(s.label || "").toLowerCase().indexOf(needle) !== -1);
    return m ? m.url : "";
  }
  function avatarMarkup() {
    const av = D.owner.avatar;
    if (av) {
      return '<div class="avatar"><img src="' + esc(av) + '" alt="' + esc(D.owner.name) + '" loading="lazy" decoding="async"/></div>';
    }
    const initials = (D.owner.name || "AS").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    return '<div class="avatar avatar-mono-wrap" aria-hidden="true"><div class="avatar-mono">' + esc(initials) + "</div></div>";
  }

  const FONTS = {
    jakarta: '"Plus Jakarta Sans", "Outfit", system-ui, -apple-system, sans-serif',
    space: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"IBM Plex Mono", ui-monospace, "Cascadia Mono", monospace'
  };
  function hexA(hex, a) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "rgba(15,134,161,0.1)";
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  /* ---------- theme -> CSS variables ---------- */
  function applyTheme() {
    const t = D.theme || {};
    const r = document.documentElement.style;
    const accent = t.accent || "#0F86A1";
    const accent2 = t.accent2 || "#EBC7B5";
    const bg = t.bg || "#F8EFE5";

    r.setProperty("--accent", accent);
    r.setProperty("--bg-teal", accent);
    r.setProperty("--accent2", accent2);
    r.setProperty("--bg", bg);
    r.setProperty("--accent-glow", hexA(accent, 0.45));

    const cursor = t.cursor || {};
    r.setProperty("--cursor-color", cursor.color || accent);
    r.setProperty("--cursor-glow", cursor.glowColor || accent);

    const body = document.body;
    body.dataset.wallpaper = t.wallpaper || "circle";
    if (t.wallpaper === "image" && t.wallpaperImage) {
      body.style.setProperty("--wallpaper-image", 'url("' + t.wallpaperImage + '")');
    } else {
      body.style.removeProperty("--wallpaper-image");
    }

    // Determine if wallpaper / background is dark to guarantee high-contrast text adaptation
    function isDarkHex(hex) {
      if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return false;
      let c = hex.replace("#", "");
      if (c.length === 3) c = c.split("").map(x => x + x).join("");
      const n = parseInt(c, 16);
      const red = (n >> 16) & 255, green = (n >> 8) & 255, blue = n & 255;
      const lum = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
      return lum < 0.48;
    }

    const isDark = t.themeMode === "dark" || isDarkHex(bg) || t.isDark === true;
    body.dataset.themeMode = isDark ? "dark" : "light";

    if (isDark) {
      const yellowHeading = t.accent2 || "#FFE066";
      r.setProperty("--ink", "#F8EFE5");
      r.setProperty("--ink-heading", yellowHeading);
      r.setProperty("--col-h", yellowHeading);
      r.setProperty("--col-b", "#E2E8F0");
      r.setProperty("--mut", "rgba(255, 255, 255, 0.78)");
      r.setProperty("--mut-2", "rgba(255, 255, 255, 0.55)");
      r.setProperty("--line", "rgba(255, 255, 255, 0.14)");
      r.setProperty("--line-strong", "rgba(255, 255, 255, 0.28)");
      r.setProperty("--panel", "rgba(18, 24, 38, 0.88)");
      r.setProperty("--panel-solid", "#121826");
      r.setProperty("--card-bg", "rgba(18, 24, 38, 0.88)");
      r.setProperty("--card-border", "rgba(255, 255, 255, 0.14)");
      r.setProperty("--topbar-bg", "rgba(18, 24, 38, 0.85)");
      r.setProperty("--topbar-border", "rgba(255, 255, 255, 0.14)");
      r.setProperty("--topbar-ink", "#F8EFE5");
      r.setProperty("--hero-cta-bg", accent);
      r.setProperty("--hero-cta-col", "#FFFFFF");
      r.setProperty("--hero-box-bg", "rgba(18, 24, 38, 0.88)");
      r.setProperty("--ql-bg", "rgba(255, 255, 255, 0.08)");
      r.setProperty("--ql-border", "rgba(255, 255, 255, 0.16)");
      r.setProperty("--extra-card-bg", "rgba(255, 255, 255, 0.06)");
      r.setProperty("--avatar-bg", "rgba(255, 255, 255, 0.08)");
    } else {
      r.setProperty("--ink", "#1B1B1B");
      r.setProperty("--ink-heading", "#1B1B1B");
      r.setProperty("--col-h", (D.type && D.type.headingColor) || "#1B1B1B");
      r.setProperty("--col-b", (D.type && D.type.bodyColor) || "#333333");
      r.setProperty("--mut", "#555555");
      r.setProperty("--mut-2", "#7E7E86");
      r.setProperty("--line", "rgba(27, 27, 27, 0.08)");
      r.setProperty("--line-strong", "rgba(27, 27, 27, 0.18)");
      r.setProperty("--panel", "#FFFFFF");
      r.setProperty("--panel-solid", "#FFFFFF");
      r.setProperty("--card-bg", "#FFFFFF");
      r.setProperty("--card-border", "rgba(27, 27, 27, 0.08)");
      r.setProperty("--topbar-bg", "rgba(255, 255, 255, 0.85)");
      r.setProperty("--topbar-border", "rgba(27, 27, 27, 0.08)");
      r.setProperty("--topbar-ink", "#1B1B1B");
      r.setProperty("--hero-cta-bg", accent);
      r.setProperty("--hero-cta-col", "#FFFFFF");
      r.setProperty("--hero-box-bg", "#FFFFFF");
      r.setProperty("--ql-bg", "rgba(15, 134, 161, 0.08)");
      r.setProperty("--ql-border", "rgba(27, 27, 27, 0.08)");
      r.setProperty("--extra-card-bg", "#FAF5EF");
      r.setProperty("--avatar-bg", "rgba(15, 134, 161, 0.08)");
    }

    const vid = document.getElementById("wallpaperVideo");
    if (vid) {
      if (t.wallpaper === "video" && t.wallpaperVideo) {
        if (vid.src !== t.wallpaperVideo) {
          vid.src = t.wallpaperVideo;
        }
        vid.play().catch(() => {});
      } else {
        vid.pause();
        vid.removeAttribute("src");
        vid.load();
      }
    }

    // footer background
    const foot = document.querySelector(".footer");
    if (foot) {
      if (t.footer && t.footer.bg) foot.style.background = t.footer.bg;
      else foot.style.removeProperty("background");
    }

    // hero box upper blur layer overlay colors
    const heroEl = document.getElementById("hero");
    if (heroEl && D.owner) {
      const c1 = D.owner.heroOverlayColor1 || "#0F86A1";
      const c2 = D.owner.heroOverlayColor2 || "#EBC7B5";
      heroEl.style.setProperty("--hero-overlay-1", hexA(c1, 0.48));
      heroEl.style.setProperty("--hero-overlay-2", hexA(c2, 0.40));
    }
  }

  /* ---------- typography -> CSS variables ---------- */
  function applyType() {
    const tp = D.type || {};
    const r = document.documentElement.style;
    r.setProperty("--font-h", FONTS[tp.fontHeading] || FONTS.space);
    r.setProperty("--font-b", FONTS[tp.fontBody] || FONTS.space);
    r.setProperty("--col-h", tp.headingColor || "#e9eef9");
    r.setProperty("--col-b", tp.bodyColor || "#c4d0e4");
    r.setProperty("--size-h", (Number(tp.headingScale) || 100) / 100);
    r.setProperty("--size-b", (Number(tp.bodyScale) || 100) / 100);

    document.querySelectorAll("[data-sec]").forEach(sec => {
      const ov = (tp.overrides || {})[sec.dataset.sec];
      const s = sec.style;
      s.removeProperty("--sec-font-h"); s.removeProperty("--sec-font-b");
      s.removeProperty("--sec-col-h"); s.removeProperty("--sec-col-b");
      s.removeProperty("--sec-size");
      if (!ov) return;
      if (ov.font && ov.font !== "inherit") { s.setProperty("--sec-font-h", FONTS[ov.font]); s.setProperty("--sec-font-b", FONTS[ov.font]); }
      if (ov.headingColor) s.setProperty("--sec-col-h", ov.headingColor);
      if (ov.bodyColor) s.setProperty("--sec-col-b", ov.bodyColor);
      if (Number(ov.size) && Number(ov.size) !== 100) s.setProperty("--sec-size", Number(ov.size) / 100);
    });
  }

  /* ---------- adaptive loading screen ---------- */
  function updateLoader() {
    const o = D.owner || {};
    if (o.name) setText("loaderTitle", o.name);
    if (o.title) setText("loaderSub", o.title);
    const badgeInner = document.getElementById("loaderBadgeInner");
    if (badgeInner) {
      if (o.logo && !o.logo.startsWith("idb:")) {
        badgeInner.innerHTML = '<img class="brand-logo-img" src="' + esc(o.logo) + '" alt="' + esc(o.name || "Brand") + ' Logo" />';
      } else {
        badgeInner.innerHTML = '<span class="brand-dot"></span>';
      }
    }
  }

  function dismissLoader() {
    const loader = document.getElementById("loadingScreen");
    if (!loader || loader.classList.contains("is-loaded")) return;
    const elapsed = performance.now() - bootStartTime;
    const minWait = 1600; // Display for ~1.6s minimum
    const remaining = Math.max(0, minWait - elapsed);
    setTimeout(() => {
      loader.classList.add("is-loaded");
      setTimeout(() => {
        loader.style.display = "none";
      }, 600);
    }, remaining);
  }

  /* ---------- brand logo & favicon dynamic sync ---------- */
  function syncLogoAndFavicon(customLogo) {
    const o = D.owner || {};
    const t = D.theme || {};
    let logo = customLogo !== undefined ? customLogo : o.logo;
    if (logo && typeof logo === "string" && logo.startsWith("idb:")) {
      logo = "";
    }

    // 1. Update top bar brand badge inner DOM
    const inner = document.getElementById("brandBadgeInner");
    if (inner) {
      if (logo) {
        inner.innerHTML = '<img class="brand-logo-img" src="' + esc(logo) + '" alt="' + esc(o.name || "Brand") + ' Logo" />';
      } else {
        inner.innerHTML = '<span class="brand-dot"></span>';
      }
    }

    // 2. Update loading screen badge if present
    const loaderBadge = document.getElementById("loaderBadgeInner");
    if (loaderBadge) {
      if (logo) {
        loaderBadge.innerHTML = '<img class="brand-logo-img" src="' + esc(logo) + '" alt="' + esc(o.name || "Brand") + ' Logo" />';
      } else {
        loaderBadge.innerHTML = '<span class="brand-dot"></span>';
      }
    }

    // 3. Update browser tab favicon
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
    // Render through offscreen canvas for a crisp circular 64x64 favicon
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = 64;
        cv.height = 64;
        const ctx = cv.getContext("2d");
        ctx.beginPath();
        ctx.arc(32, 32, 31, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, 64, 64);
        setFaviconLink(cv.toDataURL("image/png"), "image/png");
      } catch (err) {
        setFaviconLink(clean, clean.startsWith("data:image/gif") ? "image/gif" : "image/png");
      }
    };
    img.onerror = () => {
      setFaviconLink(clean, "image/x-icon");
    };
    img.src = clean;
  }

  function updateFavicon(customLogo) {
    syncLogoAndFavicon(customLogo);
  }

  /* ---------- hero & brand logo ---------- */
  function renderHero() {
    const o = D.owner;
    document.title = o.name + " - " + o.title;
    setText("hero-name", o.name);
    setText("hero-title", o.title);
    setText("hero-tagline", o.tagline);
    setText("hero-cta-primary", o.ctaPrimary || "See the work");
    setText("hero-cta-secondary", o.ctaSecondary || "Get in touch");
    setText("resumeBtn", o.ctaResume || "⬇ Download Resume");
    setText("hd-name", o.name);
    setText("hd-sub", o.title);
    syncLogoAndFavicon();

    // Hero box background media (image / video)
    const heroEl = document.getElementById("hero");
    if (heroEl) {
      const c1 = o.heroOverlayColor1 || "#0F86A1";
      const c2 = o.heroOverlayColor2 || "#EBC7B5";
      heroEl.style.setProperty("--hero-overlay-1", hexA(c1, 0.48));
      heroEl.style.setProperty("--hero-overlay-2", hexA(c2, 0.40));
    }
    const mediaWrap = document.getElementById("heroMediaBackdrop");
    if (heroEl && mediaWrap) {
      if (o.heroMedia) {
        heroEl.classList.add("has-hero-media");
        if (o.heroMediaType === "video") {
          mediaWrap.innerHTML = '<video class="hero-media-el" src="' + esc(o.heroMedia) + '" autoplay muted loop playsinline></video>';
          const v = mediaWrap.querySelector("video");
          if (v) v.play().catch(() => {});
        } else {
          mediaWrap.innerHTML = '<img class="hero-media-el" src="' + esc(o.heroMedia) + '" alt="" />';
        }
      } else {
        heroEl.classList.remove("has-hero-media");
        mediaWrap.innerHTML = "";
      }
    }

    const specs = [];
    if (o.location) specs.push(o.location);
    if (o.handle) specs.push("@" + o.handle);
    setText("hero-specs", specs.join("  ·  "));

    // quick links (GitHub / LinkedIn) replacing stat chips
    const ql = document.getElementById("quickLinks");
    if (ql) {
      const gh = heroQuickLink("github");
      const li = heroQuickLink("linkedin");
      let qhtml = "";
      if (gh) qhtml += '<a class="ql-btn" href="' + esc(safeUrl(gh)) + '" target="_blank" rel="noopener noreferrer"><span class="ql-icon">' + renderIcon("github", 18) + "</span> GitHub</a>";
      if (li) qhtml += '<a class="ql-btn" href="' + esc(safeUrl(li)) + '" target="_blank" rel="noopener noreferrer"><span class="ql-icon">' + renderIcon("linkedin", 18) + "</span> LinkedIn</a>";
      ql.innerHTML = qhtml;
    }
  }

  /* ---------- marquee ---------- */
  function renderMarquee() {
    const items = [];
    (D.skills || []).forEach(sk => {
      String(sk.items).split(",").forEach(i => items.push(i.trim()));
    });
    const el = document.getElementById("marquee");
    const row = items.map(i => "<span>" + esc(i) + "</span><span class=\"sep\">✦</span>").join("");
    el.innerHTML = '<div class="ticker-track">' + row + row + "</div>";
  }

  /* ---------- about ---------- */
  function renderAbout() {
    const el = document.getElementById("about-body");
    if (el) el.innerHTML = (D.about || []).map(p => "<p>" + esc(p) + "</p>").join("");
    const avSlot = document.getElementById("avatar-slot");
    if (avSlot) avSlot.innerHTML = avatarMarkup();

    const extra = document.getElementById("about-extra");
    if (extra) {
      extra.innerHTML = (D.aboutExtra || []).map(x =>
        '<div class="extra-card" data-reveal>' +
          '<span class="extra-icon" aria-hidden="true">' + renderIcon(x.icon, 22) + "</span>" +
          '<div><h4>' + esc(x.title) + "</h4><p>" + esc(x.text) + "</p></div>" +
        "</div>"
      ).join("");
    }
    initReveal();
  }

  /* ---------- skills ---------- */
  function renderSkills() {
    const el = document.getElementById("skills-grid");
    if (!el) return;
    el.innerHTML = (D.skills || []).map(sk => {
      const tags = String(sk.items || "").split(",").map(i => '<span class="skill-tag">' + esc(i.trim()) + "</span>").join("");
      return '<article class="skill-card" data-reveal>' +
        '<h3>' + esc(sk.cat) + "</h3>" +
        '<div class="skill-items">' + tags + "</div></article>";
    }).join("");
    initReveal();
  }

  /* ---------- achievements ---------- */
  function renderAchievements() {
    const el = document.getElementById("achievements-grid");
    if (!el) return;
    el.innerHTML = (D.achievements || []).map((a, i) => {
      const logo = a.logo
        ? '<div class="ach-logo"><img src="' + esc(a.logo) + '" alt="" loading="lazy" decoding="async"/></div>'
        : '<div class="ach-logo ach-logo-icon">' + renderIcon("star", 26) + "</div>";
      const btnLabel = a.btnText || "View certificate ↗";
      const view = a.cert
        ? '<a class="btn btn-sm btn-ghost ach-view" href="certificate.html?id=' + i + '">' + esc(btnLabel) + '</a>'
        : "";
      return '<article class="ach-card" data-reveal>' + logo +
        '<h3>' + esc(a.name) + "</h3>" + view +
        "</article>";
    }).join("");
    initReveal();
  }

  /* ---------- projects ---------- */
  function renderProjects() {
    const el = document.getElementById("projects-grid");
    if (!el) return;
    el.innerHTML = (D.projects || []).map(p => {
      const img = p.image
        ? '<div class="proj-img"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" decoding="async"/></div>'
        : '<div class="proj-img proj-img-ph">' + renderIcon("cube", 34) + "</div>";
      const btnLabel = p.btnText || "Visit ↗";
      const visit = p.link && p.link !== "#"
        ? '<a class="btn btn-sm btn-primary proj-visit" href="' + esc(safeUrl(p.link)) + '" target="_blank" rel="noopener noreferrer">' + esc(btnLabel) + '</a>'
        : "";
      return '<article class="project-card" data-reveal>' +
        img +
        '<div class="proj-body">' +
          '<h3>' + esc(p.title) + "</h3>" +
          "<p>" + esc(p.desc) + "</p>" +
          '<div class="tags">' + (p.tags || []).map(tg => "<span>" + esc(tg) + "</span>").join("") + "</div>" +
          visit +
        "</div></article>";
    }).join("");
    initReveal();
  }

  /* ---------- education ---------- */
  function renderEducation() {
    const el = document.getElementById("edu-list");
    if (!el) return;
    el.innerHTML = (D.education || []).map(ed =>
      '<article class="edu-card" data-reveal>' +
        '<div class="edu-when mono">' + esc(ed.when) + "</div>" +
        "<h3>" + esc(ed.degree) + "</h3>" +
        '<div class="edu-school">' + esc(ed.school) + "</div>" +
        "<p>" + esc(ed.desc) + "</p></article>"
    ).join("");
    initReveal();
  }

  /* ---------- social (dynamic handles & mini app logos) ---------- */
  function renderSocial() {
    const el = document.getElementById("social-links");
    if (!el) return;
    el.innerHTML = (D.socialLinks || []).map(s => {
      const iconOrLogo = s.logo
        ? '<img class="social-mini-logo" src="' + esc(s.logo) + '" alt="' + esc(s.label) + '" />'
        : renderIcon(s.icon || "globe", 20);
      return '<a class="social-link" href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener noreferrer">' +
        iconOrLogo + "<span>" + esc(s.label) + "</span></a>";
    }).join("");
  }

  /* ---------- footer ---------- */
  function renderFooter() {
    const f = (D.theme && D.theme.footer) || {};
    setText("f-left", f.left || "");
    setText("f-right", f.right || "");
  }

  /* ---------- resume generation ---------- */
  function buildResumeHTML(d) {
    const o = d.owner;
    const skills = (d.skills || []).map(s => "<li><b>" + esc(s.cat) + "</b>: " + esc(s.items) + "</li>").join("");
    const projects = (d.projects || []).map(p => "<li><b>" + esc(p.title) + "</b>: " + esc(p.desc) + "</li>").join("");
    const ach = (d.achievements || []).map(a => "<li>" + esc(a.name) + "</li>").join("");
    const edu = (d.education || []).map(e => "<p><b>" + esc(e.degree) + "</b> - " + esc(e.school) + " (" + esc(e.when) + ")</p>").join("");
    const links = (d.socialLinks || []).map(s => '<a href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(s.label) + "</a>").join(" &nbsp;·&nbsp; ");
    const about = (d.about || []).map(p => "<p>" + esc(p) + "</p>").join("");
    return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Resume - " + esc(o.name) + "</title>" +
      "<style>body{font-family:Georgia,serif;color:#111;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.55}" +
      "h1{margin:0 0 2px;font-size:30px}h2{font-size:16px;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #bbb;padding-bottom:4px;margin:28px 0 10px}" +
      ".contact{color:#444;font-size:13px}.muted{color:#555;font-style:italic}ul{margin:6px 0;padding-left:20px}li{margin:4px 0}a{color:#0a5;text-decoration:none}</style></head><body>" +
      "<h1>" + esc(o.name) + "</h1>" +
      "<div class=\"contact\">" + esc(o.title) + "<br>" + esc(o.location) + "<br>" + esc(o.email) + " · " + esc(o.phone) + "<br>" + links + "</div>" +
      "<h2>About</h2>" + about +
      "<h2>Skills</h2><ul>" + skills + "</ul>" +
      "<h2>Projects</h2><ul>" + projects + "</ul>" +
      "<h2>Achievements</h2><ul>" + ach + "</ul>" +
      "<h2>Education</h2>" + edu +
      "</body></html>";
  }
  function setupResume() {
    const btn = document.getElementById("resumeBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const html = buildResumeHTML(D);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Resume_" + (D.owner.handle || D.owner.name).replace(/\s+/g, "") + ".html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    });
  }

  /* ---------- reveal ---------- */
  let revealObserver = null;
  let revealScrollScheduled = false;

  function scheduleRevealCheck() {
    if (revealScrollScheduled) return;
    revealScrollScheduled = true;
    requestAnimationFrame(() => {
      revealScrollScheduled = false;
      const unrevealed = Array.from(document.querySelectorAll("[data-reveal]:not(.in)"));
      if (!unrevealed.length) return;
      const vh = window.innerHeight;
      unrevealed.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < vh + 250 && rect.bottom > -250) {
          el.classList.add("in");
          if (revealObserver) revealObserver.unobserve(el);
        }
      });
    });
  }

  function initReveal() {
    const unrevealed = Array.from(document.querySelectorAll("[data-reveal]:not(.in)"));
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      unrevealed.forEach(el => el.classList.add("in"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            // Also reveal all sibling reveal items in the same section together so nothing is stuck invisible
            const sec = en.target.closest("section");
            if (sec) {
              sec.querySelectorAll("[data-reveal]:not(.in)").forEach(el => {
                el.classList.add("in");
                revealObserver.unobserve(el);
              });
            }
            revealObserver.unobserve(en.target);
          }
        });
      }, { threshold: 0.01, rootMargin: "250px 0px 250px 0px" });

      window.addEventListener("scroll", scheduleRevealCheck, { passive: true });
      window.addEventListener("resize", scheduleRevealCheck, { passive: true });
    }
    unrevealed.forEach(el => {
      const rect = el.getBoundingClientRect();
      const sec = el.closest("section");
      const secRect = sec ? sec.getBoundingClientRect() : null;
      // If element or its section is in view or within margin, reveal immediately
      if ((rect.top < window.innerHeight + 250 && rect.bottom > -250) ||
          (secRect && secRect.top < window.innerHeight + 150 && secRect.bottom > -150)) {
        el.classList.add("in");
      } else {
        revealObserver.observe(el);
      }
    });
  }

  /* ---------- menu ---------- */
  function initMenu() {
    const toggle = document.getElementById("menuToggle");
    const nav = document.getElementById("navLinks");
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-controls", "navLinks");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", e => {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---------- scroll-spy & nav pop-forward ---------- */
  function initNavScrollSpy() {
    const navLinks = Array.from(document.querySelectorAll("#navLinks a"));
    const sectionIds = ["about", "skills", "achievements", "projects", "education", "contact"];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    let isClickScrolling = false;
    let clickTimer = null;

    function updateActive() {
      if (isClickScrolling) return;

      const scrollPos = window.scrollY || window.pageYOffset || 0;
      const vh = window.innerHeight || 800;
      const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

      // If near the top (Hero section), no section link is active
      const firstTop = sections[0] ? (sections[0].offsetTop - 260) : 350;
      if (scrollPos < firstTop) {
        navLinks.forEach(l => l.classList.remove("active"));
        return;
      }

      // Check if user has scrolled near bottom of page -> contact is active
      if (window.innerHeight + scrollPos >= docHeight - 90) {
        setActive("contact");
        return;
      }

      // Find section whose content overlaps the focal line (35% from top of viewport)
      const focalLine = vh * 0.35;
      let activeId = "";

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        const rect = sec.getBoundingClientRect();
        if (rect.top <= focalLine && rect.bottom > focalLine - 80) {
          activeId = sec.id;
          break;
        }
      }

      if (!activeId) {
        for (let i = sections.length - 1; i >= 0; i--) {
          const sec = sections[i];
          if (sec.getBoundingClientRect().top <= vh * 0.55) {
            activeId = sec.id;
            break;
          }
        }
      }

      setActive(activeId);
    }

    function setActive(id) {
      navLinks.forEach(a => {
        const href = (a.getAttribute("href") || "").replace(/^#/, "");
        const isTarget = href === id;
        a.classList.toggle("active", isTarget);
      });
    }

    // Nav link click handling: immediate pop forward + smooth scroll
    navLinks.forEach(a => {
      a.addEventListener("click", e => {
        const href = a.getAttribute("href") || "";
        if (href.startsWith("#")) {
          const targetEl = document.querySelector(href);
          if (targetEl) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove("active"));
            a.classList.add("active");
            isClickScrolling = true;
            clearTimeout(clickTimer);

            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });

            clickTimer = setTimeout(() => {
              isClickScrolling = false;
              updateActive();
            }, 850);
          }
        }
      });
    });

    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();
  }

  /* ---------- cursor + spotlight FX ---------- */
  function initCursor() {
    const spot = document.getElementById("spotlight");
    const cur = document.getElementById("cursorFX");
    const c = (D.theme && D.theme.cursor) || {};
    if (!spot || !cur) return;

    const hasGlow = c.glow !== false; // Active by default
    if (hasGlow) {
      spot.style.display = "block";
      const glowCol = c.glowColor || D.theme.accent || "#0F86A1";
      spot.style.background = "radial-gradient(circle, " + hexA(glowCol, 0.24) + " 0%, " + hexA(D.theme.accent2 || "#EBC7B5", 0.14) + " 40%, transparent 70%)";
    } else {
      spot.style.display = "none";
    }

    const style = c.style || "none";
    document.body.dataset.cursor = style;
    cur.classList.toggle("dot", style === "dot");
    cur.classList.toggle("ring", style === "ring");
    if (style !== "none") cur.style.borderColor = c.color || D.theme.accent || "#0F86A1";

    if (!reduceMotion.matches) {
      let mx = window.innerWidth / 2, my = window.innerHeight / 2;
      let spotX = mx, spotY = my;
      let curX = mx, curY = my;
      let active = false;
      let isIdle = false;
      let idleTimer = null;

      function wakeLoop() {
        if (!active) {
          active = true;
          spotX = mx; spotY = my;
          curX = mx; curY = my;
        }
        if (isIdle) {
          isIdle = false;
          requestAnimationFrame(loop);
        }
      }

      window.addEventListener("pointermove", e => {
        mx = e.clientX;
        my = e.clientY;
        wakeLoop();
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { isIdle = true; }, 1500);
      }, { passive: true });

      function loop() {
        if (!active || isIdle) return;
        const dx = mx - spotX;
        const dy = my - spotY;
        spotX += dx * 0.16;
        spotY += dy * 0.16;
        curX += (mx - curX) * 0.32;
        curY += (my - curY) * 0.32;

        spot.style.transform = "translate3d(" + spotX.toFixed(1) + "px," + spotY.toFixed(1) + "px, 0)";
        cur.style.transform = "translate3d(" + curX.toFixed(1) + "px," + curY.toFixed(1) + "px, 0)";

        if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
          requestAnimationFrame(loop);
        } else {
          isIdle = true;
        }
      }
      requestAnimationFrame(loop);
    }
  }

  /* ---------- Circle Website Scroll-Driven Animations ---------- */
  function initScrollAnimations() {
    if (reduceMotion.matches) return;

    const hero = document.getElementById("hero");
    const plane = document.querySelector(".hero-deco-plane");
    const ring = document.querySelector(".hero-deco-ring");
    const dot = document.querySelector(".hero-deco-dot");
    const sections = Array.from(document.querySelectorAll(".section"));
    const meshOrbs = Array.from(document.querySelectorAll(".mesh-orb"));

    let scrollY = window.scrollY || 0;
    let targetScrollY = scrollY;
    let ticking = false;

    function onScroll() {
      targetScrollY = window.scrollY || 0;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    function updateScroll() {
      scrollY += (targetScrollY - scrollY) * 0.2;
      if (Math.abs(targetScrollY - scrollY) < 0.2) scrollY = targetScrollY;

      const vh = window.innerHeight || 800;

      // 1. Hero Peeling & Parallax Exit
      if (hero && scrollY < vh * 1.5) {
        const progress = Math.min(1, Math.max(0, scrollY / vh));
        hero.style.transform = "translate3d(0, -" + (progress * 55).toFixed(1) + "px, 0)";

        if (plane) {
          plane.style.transform = "translate3d(" + (progress * 160).toFixed(1) + "px, -" + (progress * 110).toFixed(1) + "px, 0) rotate(" + (progress * 22).toFixed(1) + "deg) scale(" + (1 - progress * 0.2).toFixed(2) + ")";
          plane.style.opacity = String(Math.max(0, 1 - progress * 1.2).toFixed(2));
        }
        if (ring) {
          ring.style.transform = "translate3d(0, " + (progress * 80).toFixed(1) + "px, 0) rotate(" + (progress * 75).toFixed(1) + "deg)";
        }
        if (dot) {
          dot.style.transform = "translate3d(-" + (progress * 70).toFixed(1) + "px, " + (progress * 45).toFixed(1) + "px, 0)";
        }
      }

      // 2. Section Card Stacking & Scaling Reveal
      sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        const enterProgress = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.82)));

        const scale = 0.94 + enterProgress * 0.06;
        const translateY = (1 - enterProgress) * 36;
        sec.style.setProperty("--sec-scale", scale.toFixed(3));
        sec.style.setProperty("--sec-trans-y", translateY.toFixed(1) + "px");
        sec.style.setProperty("--sec-opacity", Math.max(0.25, enterProgress).toFixed(2));

        const idxBadge = sec.querySelector(".sec-index");
        if (idxBadge) {
          const badgeScale = Math.min(1, Math.max(0.5, enterProgress * 1.15));
          const badgeRot = (1 - enterProgress) * -22;
          idxBadge.style.transform = "scale(" + badgeScale.toFixed(2) + ") rotate(" + badgeRot.toFixed(1) + "deg)";
        }

        const rule = sec.querySelector(".rule");
        if (rule) {
          const ruleScale = Math.min(1, Math.max(0, (enterProgress - 0.15) * 1.2));
          rule.style.transform = "scaleX(" + ruleScale.toFixed(2) + ")";
          rule.style.transformOrigin = "left center";
        }
      });

      // 3. Ambient mesh wallpaper smooth drift (applied to container to avoid GPU repaint conflicts with CSS keyframes)
      const meshCanvas = document.querySelector(".circle-wallpaper");
      if (meshCanvas) {
        meshCanvas.style.transform = "translate3d(0, " + (scrollY * 0.1).toFixed(1) + "px, 0)";
      }

      if (Math.abs(targetScrollY - scrollY) >= 0.2) {
        requestAnimationFrame(updateScroll);
      } else {
        ticking = false;
      }
    }

    updateScroll();
  }

  /* ---------- certificates lightbox ---------- */
  function initLightbox() {
    const lb = document.getElementById("lightbox");
    const img = document.getElementById("lb-img");
    if (!lb || !img) return;
    document.addEventListener("click", e => {
      const t = e.target.closest("[data-cert]");
      if (t) {
        const src = t.getAttribute("data-cert");
        if (src) { img.src = src; lb.classList.add("open"); }
      }
    });
    document.getElementById("lb-close").addEventListener("click", () => lb.classList.remove("open"));
    lb.addEventListener("click", e => { if (e.target === lb) lb.classList.remove("open"); });
  }

  /* ---------- secret owner gate ---------- */
  function openLock() {
    const ov = document.getElementById("lockOverlay");
    if (!ov) return;
    ov.classList.add("open");
    document.body.classList.add("lock-open");
    const input = document.getElementById("lockPass");
    const msg = document.getElementById("lockMsg");
    const head = document.getElementById("lockHead");
    msg.textContent = "";
    if (!window.bpData.isAuthConfigured()) {
      head.textContent = "Set owner passcode";
      input.placeholder = "Choose a passcode";
    } else {
      head.textContent = "Owner access only";
      input.placeholder = "Passcode";
    }
    setTimeout(() => input.focus(), 60);
  }
  function closeLock() {
    const ov = document.getElementById("lockOverlay");
    if (!ov) return;
    ov.classList.remove("open");
    document.body.classList.remove("lock-open");
    document.getElementById("lockPass").value = "";
  }
  /* ---------- logo pop animation & 5-tap secret owner trigger ---------- */
  function initLogoTrigger() {
    const btn = document.getElementById("brandLogoBtn");
    if (!btn) return;

    let taps = 0;
    let timer = null;

    btn.addEventListener("click", () => {
      // 3D pop animation
      btn.classList.remove("pop-active");
      void btn.offsetWidth; // trigger reflow
      btn.classList.add("pop-active");

      taps++;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        taps = 0;
        timer = null;
      }, 2500);

      if (taps >= 5) {
        taps = 0;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        openLock();
      }
    });
  }

  function initLock() {
    const ov = document.getElementById("lockOverlay");
    const input = document.getElementById("lockPass");
    const msg = document.getElementById("lockMsg");
    const form = document.getElementById("lockForm");
    const eyeToggle = document.getElementById("lockPassToggle");

    if (eyeToggle && input) {
      eyeToggle.addEventListener("click", () => {
        const isPass = input.type === "password";
        input.type = isPass ? "text" : "password";
        eyeToggle.classList.toggle("revealed", isPass);
        eyeToggle.setAttribute("aria-label", isPass ? "Hide password" : "Show password");
      });
    }

    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) return;
        if (!window.bpData.isAuthConfigured()) {
          window.bpData.setPassword(val).then(() => {
            window.bpData.setLoggedIn(true);
            window.location.href = "admin.html";
          });
        } else {
          window.bpData.checkPassword(val).then(ok => {
            if (ok) {
              window.bpData.setLoggedIn(true);
              window.location.href = "admin.html";
            } else {
              msg.textContent = "Incorrect: passcode not accepted.";
              input.select();
            }
          });
        }
      });
    }

    const closeBtn = document.getElementById("lockClose");
    if (closeBtn) closeBtn.addEventListener("click", closeLock);
    if (ov) ov.addEventListener("click", e => { if (e.target === ov) closeLock(); });

    window.addEventListener("keydown", e => {
      if (e.ctrlKey && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        openLock();
      }
      if (e.key === "Escape") closeLock();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    updateLoader();
    applyTheme();
    applyType();
    renderHero();
    renderMarquee();
    renderAbout();
    renderSkills();
    renderAchievements();
    renderProjects();
    renderEducation();
    renderSocial();
    renderFooter();
    initReveal();
    initMenu();
    initCursor();
    initScrollAnimations();
    initNavScrollSpy();
    initLightbox();
    initLogoTrigger();
    initLock();
    setupResume();

    const sceneHost = document.getElementById("scene-root");
    if (sceneHost && D.theme.wallpaper !== "image" && D.theme.wallpaper !== "video") {
      window.bpScene.initScene(sceneHost, D.theme);
    }

    // Resolve any IndexedDB media if not already in memory cache
    if (window.bpData && window.bpData.resolveMedia) {
      window.bpData.resolveMedia(D).then(() => {
        applyTheme();
        renderHero();
        renderAbout();
        renderAchievements();
        updateFavicon();
        updateLoader();
        initReveal();
      }).catch(err => console.warn("resolveMedia error", err))
      .finally(() => {
        dismissLoader();
      });
    } else {
      dismissLoader();
    }
  }

  // Dismiss loader on window load as well
  window.addEventListener("load", dismissLoader);

  // Live reload across browser tabs when dashboard changes are saved
  window.addEventListener("storage", e => {
    if (e.key === "bp_portfolio_v2" || e.key === "bp_preview") {
      window.location.reload();
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
