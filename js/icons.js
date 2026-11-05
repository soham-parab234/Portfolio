/* ============================================================
   ORIGINAL LINE-ICON SET (drawn for this project)
   Each icon is 1-3 strokes on a 24×24 grid. Rendered as inline
   SVG everywhere in the site and available in the owner
   dashboard's icon picker.
   ============================================================ */

const ICONS = {
  cube: {
    paths: [
      "M12 2.5 21 7.5v9l-9 5-9-5v-9l9-5z",
      "M12 2.5v9l9 5",
      "M3 7.5l9 5 9-5"
    ]
  },
  chip: {
    paths: [
      "M7 3v3M17 3v3M7 18v3M17 18v3M3 7h3M3 17h3M18 7h3M18 17h3",
      "M8 8h8v8H8z",
      "M11 11h2v2h-2z"
    ]
  },
  terminal: {
    paths: [
      "M4 5h16v14H4z",
      "M8 9l3 3-3 3",
      "M13 15h4"
    ]
  },
  code: {
    paths: [
      "M8 8l-4 4 4 4",
      "M16 8l4 4-4 4",
      "M13 5l-2 14"
    ]
  },
  globe: {
    paths: [
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
      "M3 12h18",
      "M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"
    ]
  },
  layers: {
    paths: [
      "M12 3l9 5-9 5-9-5 9-5z",
      "M3 12l9 5 9-5",
      "M3 16l9 5 9-5"
    ]
  },
  light: {
    paths: [
      "M9 18h6M10 21h4",
      "M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.6 1 2.5h6c0-.9.2-1.8 1-2.5A6 6 0 0 0 12 3z",
      "M8 8h8"
    ]
  },
  rocket: {
    paths: [
      "M12 4c3 1.6 5 4.5 5 8l-2 5H9l-2-5c0-3.5 2-6.4 5-8z",
      "M9 20h6",
      "M12 10.5a1.5 1.5 0 1 0 0 .01",
      "M9 13l-3 1.5M15 13l3 1.5"
    ]
  },
  wrench: {
    paths: [
      "M14.5 6.5a4 4 0 0 0-5.4 5.4L4 17l3 3 5.1-5.1a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z"
    ]
  },
  brain: {
    paths: [
      "M12 5v.01",
      "M10 4a2.5 2.5 0 0 0-5 .2 4 4 0 0 0-1 7.8 4 4 0 0 0 2 7.7V6.5A2.5 2.5 0 0 1 10 4z",
      "M14 4a2.5 2.5 0 0 1 5 .2 4 4 0 0 1 1 7.8 4 4 0 0 1-2 7.7V6.5A2.5 2.5 0 0 0 14 4z"
    ]
  },
  network: {
    paths: [
      "M5 6h4M15 6h4M9 6h6",
      "M5 6a2 2 0 1 0 0 .01M19 6a2 2 0 1 0 0 .01",
      "M9 18h6M5 18h4M15 18h4",
      "M5 18a2 2 0 1 0 0 .01M19 18a2 2 0 1 0 0 .01",
      "M12 6v12M7 12h10"
    ]
  },
  database: {
    paths: [
      "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z",
      "M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6",
      "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"
    ]
  },
  shield: {
    paths: [
      "M12 3l7 3v5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-3z",
      "M9 12l2 2 4-4"
    ]
  },
  palette: {
    paths: [
      "M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-2 0-1.2 1-2 2-2h1.6A2.4 2.4 0 0 0 20 14.6C20 8.2 16.4 3 12 3z",
      "M7.5 10.5h.01M9.5 7.5h.01M14.5 7.5h.01M16.5 10.5h.01"
    ]
  },
  camera: {
    paths: [
      "M4 8h3l2-3h6l2 3h3v11H4V8z",
      "M12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
    ]
  },
  mobile: {
    paths: [
      "M7 3h10v18H7z",
      "M10 18h4",
      "M10 6h4"
    ]
  },
  wave: {
    paths: [
      "M3 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0"
    ]
  },
  graph: {
    paths: [
      "M4 4v16h16",
      "M8 16l3-4 3 2 4-6"
    ]
  },
  book: {
    paths: [
      "M4 5a3 3 0 0 1 3-3h13v16H7a3 3 0 0 0-3 3V5z",
      "M4 21a3 3 0 0 1 3-3h13"
    ]
  },
  gear: {
    paths: [
      "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
      "M12 2.5v3M12 18.5v3M4.3 6l2.6 1.5M17.1 16.5l2.6 1.5M4.3 18l2.6-1.5M17.1 7.5l2.6-1.5",
      "M4.3 12h3M16.7 12h3"
    ]
  },
  server: {
    paths: [
      "M4 5h16v6H4zM4 13h16v6H4z",
      "M7 8h.01M7 16h.01",
      "M10 8h3M10 16h3"
    ]
  },
  signal: {
    paths: [
      "M5 12a7 7 0 0 1 14 0",
      "M8.5 12a3.5 3.5 0 0 1 7 0",
      "M12 12v.01"
    ]
  },
  map: {
    paths: [
      "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z",
      "M9 4v14M15 6v14"
    ]
  },
  circuit: {
    paths: [
      "M4 12h6M14 12h6",
      "M4 5h6M4 19h6",
      "M12 6v4h2v4h-2v4",
      "M10 8h4M10 16h4"
    ]
  },
  config: {
    paths: [
      "M4 6h7M15 6h5",
      "M4 12h3M11 12h9",
      "M4 18h9M17 18h3",
      "M13.5 4v4M8.5 10v4M14.5 16v4"
    ]
  },
  pen: {
    paths: [
      "M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1z",
      "M13.5 6.5l3 3"
    ]
  },
  spark: {
    paths: [
      "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z",
      "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"
    ]
  },
  star: {
    paths: [
      "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.3l-5.4 2.6 1-6.1L3.2 9.5l6.1-.9L12 3z"
    ]
  },
  heart: {
    paths: [
      "M12 20s-7-4.4-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.6 12 20 12 20z"
    ]
  },
  mail: {
    paths: [
      "M4 5h16v14H4z",
      "M4 7l8 6 8-6"
    ]
  },
  github: {
    paths: [
      "M6 3v10",
      "M6 15a2.5 2.5 0 1 0 0 .01",
      "M18 9a2.5 2.5 0 1 0 0 .01",
      "M6 13.5c0-2.6 1.8-3.6 4-3.6h4c2.2 0 4-1 4-3.6"
    ]
  },
  linkedin: {
    paths: [
      "M10 13a4.5 4.5 0 0 0 6.4 0l2-2a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2",
      "M14 11a4.5 4.5 0 0 0-6.4 0l-2 2A4.5 4.5 0 0 0 12 19.4l1.2-1.2"
    ]
  },
  twitter: {
    paths: [
      "M4 4l16 16M20 4L4 20"
    ]
  },
  discord: {
    paths: [
      "M4 5h16v11H12l-4 3v-3H4V5z",
      "M8 10.5h.01M12 10.5h.01M16 10.5h.01"
    ]
  }
};

/* Returns an SVG markup string for a given icon key (or an emoji/plain string) */
function renderIcon(key, size, color) {
  size = size || 22;
  const s = "width=\"" + size + "\" height=\"" + size + "\"";
  if (key && ICONS[key]) {
    const ic = ICONS[key];
    const paths = ic.paths.map(p =>
      "<path d=\"" + p + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.55\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
    ).join("");
    return "<svg " + s + " viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"bp-icon\">" + paths + "</svg>";
  }
  // fallback: render the raw string (e.g. an emoji) as text
  return "<span class=\"bp-icon-emoji\">" + key + "</span>";
}

if (typeof window !== "undefined") {
  window.bpIcons = { ICONS, renderIcon };
}
