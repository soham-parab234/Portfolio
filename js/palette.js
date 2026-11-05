/* ============================================================
   SCHEMATIC - DYNAMIC MEDIA PALETTE ADAPTATION (v2)
   Analyzes uploaded wallpaper images and videos to automatically
   derive harmonious theme colors:
   - Primary Accent (buttons, active pills, cursor glow)
   - Secondary Accent (warm/mesh accents, secondary badges)
   - Background Tone (adaptive light cream or deep dark)
   - Heading & Body Text colors (WCAG contrast compliant)
   ============================================================ */

(function () {
  "use strict";

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s, l];
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
    const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, "0");
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  function analyzePixels(data) {
    const pixelCount = data.length / 4;
    let totalL = 0;
    let totalR = 0, totalG = 0, totalB = 0;

    // 36 hue bins of 10 degrees each
    const bins = Array.from({ length: 36 }, () => ({
      count: 0,
      score: 0,
      sumH: 0,
      sumS: 0,
      sumL: 0,
      sumR: 0,
      sumG: 0,
      sumB: 0
    }));

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      totalR += r; totalG += g; totalB += b;
      const [h, s, l] = rgbToHsl(r, g, b);
      totalL += l;

      // Filter out pure grays, deep blacks, and extreme white washes for accent extraction
      if (s > 0.16 && l > 0.12 && l < 0.90) {
        const binIdx = Math.floor(h / 10) % 36;
        const bin = bins[binIdx];
        const weight = Math.pow(s, 1.25) * (1 - Math.abs(l - 0.5));
        bin.count++;
        bin.score += weight;
        bin.sumH += h;
        bin.sumS += s;
        bin.sumL += l;
        bin.sumR += r;
        bin.sumG += g;
        bin.sumB += b;
      }
    }

    const avgL = totalL / (pixelCount || 1);
    const avgR = totalR / (pixelCount || 1);
    const avgG = totalG / (pixelCount || 1);
    const avgB = totalB / (pixelCount || 1);
    const [avgH, avgS] = rgbToHsl(avgR, avgG, avgB);

    const sortedBins = bins
      .filter(b => b.count > 0)
      .sort((a, b) => b.score - a.score);

    let dominantH = avgH;
    let dominantS = Math.max(0.65, avgS);
    let dominantL = avgL;

    if (sortedBins.length > 0) {
      const top = sortedBins[0];
      dominantH = top.sumH / top.count;
      dominantS = top.sumS / top.count;
      dominantL = top.sumL / top.count;
    }

    // Secondary distinctive hue (at least 35 degrees apart)
    let secH = (dominantH + 35) % 360;
    let secS = Math.max(0.40, dominantS * 0.75);
    for (let i = 1; i < sortedBins.length; i++) {
      const b = sortedBins[i];
      const candH = b.sumH / b.count;
      const diff = Math.min(Math.abs(candH - dominantH), 360 - Math.abs(candH - dominantH));
      if (diff >= 35) {
        secH = candH;
        secS = b.sumS / b.count;
        break;
      }
    }

    const isDark = avgL < 0.46;

    // 1. Accent color (used for buttons, active nav pill, cursor, main links)
    const accentL = isDark ? 0.60 : 0.38;
    const accentS = Math.max(0.70, Math.min(0.95, dominantS * 1.25));
    const accent = hslToHex(dominantH, accentS, accentL);

    // 2. Secondary accent (used for secondary badges, mesh orbs, warm accents)
    const accent2L = isDark ? 0.72 : 0.80;
    const accent2S = Math.max(0.38, Math.min(0.75, secS));
    const accent2 = hslToHex(secH, accent2S, accent2L);

    // 3. Background color
    let bg;
    if (isDark) {
      // Deep tinted background
      bg = hslToHex(dominantH, Math.min(0.24, dominantS * 0.4), 0.08);
    } else {
      // Soft warm/cool tinted light canvas
      bg = hslToHex(dominantH, Math.min(0.32, dominantS * 0.45), 0.95);
    }

    // 4. Heading and Body text colors
    let headingColor, bodyColor;
    if (isDark) {
      headingColor = hslToHex(dominantH, 0.12, 0.96);
      bodyColor = hslToHex(dominantH, 0.10, 0.78);
    } else {
      headingColor = hslToHex(dominantH, 0.22, 0.11);
      bodyColor = hslToHex(dominantH, 0.12, 0.26);
    }

    return {
      accent,
      accent2,
      bg,
      headingColor,
      bodyColor,
      cursorColor: accent,
      cursorGlow: accent,
      isDark
    };
  }

  function extractFromImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) return reject(new Error("No image source provided"));
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          const w = 64, h = 64;
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h).data;
          resolve(analyzePixels(imgData));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image for color extraction"));
      img.src = src;
    });
  }

  function extractFromVideo(src) {
    return new Promise((resolve, reject) => {
      if (!src) return reject(new Error("No video source provided"));
      const video = document.createElement("video");
      video.crossOrigin = "Anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      let resolved = false;
      const sample = () => {
        if (resolved) return;
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          const w = 64, h = 64;
          canvas.width = w; canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h).data;
          resolved = true;
          cleanup();
          resolve(analyzePixels(imgData));
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      const cleanup = () => {
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
        video.pause();
        video.removeAttribute("src");
        video.load();
      };

      video.onloadeddata = () => {
        const targetTime = Math.min(1.0, (video.duration || 2) * 0.25);
        try {
          video.currentTime = targetTime;
        } catch (e) {
          sample();
        }
      };

      video.onseeked = () => {
        sample();
      };

      video.onerror = () => {
        cleanup();
        reject(new Error("Failed to load video for color extraction"));
      };

      // Fallback timeout in case seeked doesn't fire
      setTimeout(() => {
        if (!resolved && video.readyState >= 2) {
          sample();
        } else if (!resolved) {
          cleanup();
          reject(new Error("Video extraction timed out"));
        }
      }, 3500);

      video.src = src;
      video.load();
    });
  }

  function extractFromMedia(src, type) {
    if (type === "video" || /\.(mp4|webm|ogg|mov)($|\?)/i.test(src) || /^data:video\//i.test(src)) {
      return extractFromVideo(src);
    }
    return extractFromImage(src);
  }

  window.bpPalette = {
    rgbToHsl,
    hslToHex,
    analyzePixels,
    extractFromImage,
    extractFromVideo,
    extractFromMedia
  };
})();

