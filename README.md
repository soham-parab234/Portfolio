# Schematic Portfolio Template

An interactive, 3D-animated personal portfolio and owner dashboard designed for developers, creators, and engineers. Built with vanilla JavaScript, CSS variables, and HTML5 with zero build step and zero dependencies.

Includes an integrated secret Owner Dashboard where every headline, button, image, video wallpaper, project, certificate, and color scheme can be customized in real time.

---

## Quick Start

No build tools, bundlers, or compilers required. Serve the folder over HTTP:

```bash
# Option 1: Node.js static server
node tools/serve.js

# Option 2: Python 3
python -m http.server 4173

# Option 3: npx serve
npx serve .
```

Open `http://localhost:4173` in your browser.

- **Public Site**: `index.html`
- **Owner Dashboard**: `admin.html`
- **Certificate Viewer**: `certificate.html`

---

## Secret Owner Access Gate

The management dashboard is securely hidden from casual visitors. To access it from the public portfolio:

1. **Brand Logo Trigger**: Click or tap the circular brand logo badge on the left side of the top navigation bar **5 times**. Each tap plays an interactive 3D bounce animation. On the 5th tap, the passcode modal will pop up.
2. **Keyboard Shortcut**: Press `Ctrl + Shift + D` anywhere on the page.

On a fresh installation, the gate prompts you to set your initial passcode (there are no arbitrary password restrictions or length criteria). After that, entering your passcode grants access to the dashboard. The password modal includes an eye toggle button to reveal or conceal what you type.

---

## Key Features

### 1. Dynamic Wallpaper & Media Palette Adaptation
- **Image & Video Wallpapers**: Upload high-resolution background images or looping video wallpapers (supported up to 50 MB via IndexedDB).
- **Auto-Theme Extraction**: The site samples the colors of your uploaded image or video, automatically calculating harmonious primary accent, secondary tint, text colors, and cursor glow.
- **Adaptive Contrast Mode**: When dark wallpapers are chosen, cards, buttons, input fields, and text automatically switch to high-contrast dark themes so content never blends into the background.

### 2. Tab Favicon & Brand Logo Synchronization
- Changing your logo image or animated GIF in the dashboard automatically synchronizes both the top-bar trigger button and the browser tab favicon across all pages (`index.html`, `admin.html`, and `certificate.html`).
- If no custom logo is uploaded, a crisp vector badge matching your active accent palette is automatically generated.

### 3. Adaptive Loading Screen
- A smooth startup loading screen displays your personal badge, name, title, and animated gradient progress bar.
- Automatically takes on your active theme colors and smoothly transitions out as soon as media and models are initialized.

### 4. Interactive 3D Background & Cursor FX
- Floating geometric 3D spheres with subtle mouse parallax and inertia.
- Trailing glowing cursor spotlight that matches the active accent tone.
- Natural scroll animations with synchronized section highlights in the sticky top bar.

### 5. Achievement & Certificate Showcase
- Dedicated certificate upload in the dashboard for diplomas, hackathon wins, and certifications.
- Each achievement card on the main site features an interactive button navigating to a dedicated certificate display page (`certificate.html?id=0`).

### 6. Fully Editable Button Labels
- Every action button across the site (hero call-to-actions, resume download, project visit links, certificate buttons) can have its text customized directly from its respective dashboard panel.

---

## Security & Privacy (GitHub-Safe)

- **No Passwords in Git**: Passwords and private credentials are never stored in the code repository.
- **Salted SHA-256 Hashing**: Passwords are saved with client-side 128-bit cryptographic random salts (`crypto.getRandomValues`) and digested with SHA-256 (`crypto.subtle.digest`) into the owner's local browser profile (`localStorage`).
- **Safe Link Sanitization**: All external project, certificate, and social URLs are validated against dangerous XSS protocols and rendered with `rel="noopener noreferrer"`.
- **Preconfigured `.gitignore`**: Excludes local caches, logs, and environment files so you can push straight to a public GitHub repository with complete confidence.

---

## How to Hand Over as a Template to a New User

To give this portfolio template to someone else:

1. **Clone or Copy**: Share this folder or push it to a new GitHub repository.
2. **Open the Site**: Run any local HTTP server (or open via GitHub Pages).
3. **Open Secret Gate**: Tap the top-left circle badge 5 times or press `Ctrl + Shift + D`.
4. **Choose Passcode**: On the fresh browser, enter the new owner's chosen passcode.
5. **Customize Content**:
   - In **Profile**: Update name, title, tagline, contact details, button labels, and upload avatar/logo.
   - In **Theme**: Choose or upload a wallpaper image or video loop.
   - In **About, Skills, Achievements, Projects, Education, Social**: Fill in experience, upload project screenshots and certificates, and link social profiles.
6. **Deploy**: Push to GitHub and enable **GitHub Pages** under repository settings (Deploy from Branch -> `main` / root). Your portfolio is live immediately with zero configuration.

---

## Codebase Architecture

```
index.html              Public portfolio presentation
admin.html              Owner dashboard and editor
certificate.html        Dedicated digital certificate viewer
css/
  style.css             Public layout, responsive grid, theme variables, loading screen
  admin.css             Dashboard editor styles and dark/light adaptive controls
js/
  data.js               Data layer, salted SHA-256 auth, IndexedDB media storage
  main.js               Public DOM renderer, reveal observer, logo trigger, resume generator
  admin.js              Dashboard form bindings, file uploads, live preview engine
  scene.js              Three.js 3D backdrop scene and orbital sphere animations
  palette.js            Automatic color extraction from wallpaper images & video frames
  icons.js              Modular SVG icon set
  vendor/
    three.min.js        Three.js library (vendored for offline reliability)
tools/
  serve.js              Zero-dependency Node HTTP server
.gitignore              Repository exclusion list for git hygiene
```

---

## License

MIT License. Feel free to use this template for personal or commercial portfolios.
