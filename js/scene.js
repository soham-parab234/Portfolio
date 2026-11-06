/* ============================================================
   CIRCLE WEBSITE - 3D SCENE & WALLPAPER ANIMATION
   Inspired by circle-website.webflow.io:
   Floating 3D pastel & teal spheres, smooth rotating toruses
   (the iconic "circle" motif), dotted orbital paths, and ambient
   micro-particles with cursor parallax and scroll-depth.
   ============================================================ */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function initScene(container, theme) {
    const hasWebGL = (() => {
      try {
        const c = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
      } catch (e) {
        return false;
      }
    })();

    if (!hasWebGL || typeof THREE === "undefined") {
      container.style.display = "none";
      document.documentElement.classList.add("bp-no-webgl");
      return { ok: false };
    }

    const accent = theme.accent || "#0F86A1";
    const accent2 = theme.accent2 || "#EBC7B5";
    const coral = "#FF7A50";
    const mint = "#73C5B5";
    const white = "#FFFFFF";
    const sceneMode = theme.scene || "circle";

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.pointerEvents = "none";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    camera.position.set(0, 0, 56);

    /* ----- Lights ----- */
    const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(30, 45, 60);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(new THREE.Color(accent2), 0.4);
    fillLight.position.set(-30, -25, 20);
    scene.add(fillLight);

    const shapes = [];

    if (sceneMode === "circle") {
      /* ----- Circle website: 3D Spheres & Toruses ----- */
      const sphereDefs = [
        { r: 3.4, pos: [-24, 10, -12], col: accent2, rough: 0.35, metal: 0.05, spd: 0.7 },
        { r: 2.8, pos: [24, 12, -14], col: accent, rough: 0.3, metal: 0.1, spd: 0.6 },
        { r: 2.2, pos: [22, -10, 4], col: coral, rough: 0.4, metal: 0.05, spd: 0.85 },
        { r: 2.6, pos: [-20, -12, 10], col: white, rough: 0.25, metal: 0.1, spd: 0.5 },
        { r: 1.6, pos: [14, 16, -6], col: mint, rough: 0.35, metal: 0.05, spd: 0.9 },
        { r: 1.3, pos: [-9, -18, 16], col: accent2, rough: 0.3, metal: 0.05, spd: 0.75 },
        { r: 1.1, pos: [8, -7, 22], col: accent, rough: 0.35, metal: 0.1, spd: 0.65 },
        { r: 1.8, pos: [-28, -2, -4], col: "#FFEAE0", rough: 0.4, metal: 0.05, spd: 0.8 }
      ];

      sphereDefs.forEach((d, i) => {
        const geo = new THREE.SphereGeometry(d.r, 28, 28);
        const mat = new THREE.MeshStandardMaterial({
          color: d.col,
          roughness: d.rough,
          metalness: d.metal
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(d.pos[0], d.pos[1], d.pos[2]);
        mesh.userData = {
          baseX: d.pos[0],
          baseY: d.pos[1],
          baseZ: d.pos[2],
          spd: d.spd,
          phase: i * 1.1,
          rotSpd: (i % 2 === 0 ? 1 : -1) * 0.008
        };
        scene.add(mesh);
        shapes.push(mesh);
      });

      /* ----- Toruses (The iconic Circle Website Rings) ----- */
      const torusDefs = [
        { r: 3.8, tube: 0.42, pos: [-16, 14, -2], rot: [0.8, 0.4, 0.2], col: accent, rough: 0.3 },
        { r: 4.6, tube: 0.38, pos: [20, -4, -8], rot: [-0.6, 0.8, -0.4], col: accent2, rough: 0.35 },
        { r: 2.5, tube: 0.24, pos: [2, 18, -14], rot: [0.3, -0.7, 0.5], col: white, rough: 0.25 }
      ];

      torusDefs.forEach((d, i) => {
        const geo = new THREE.TorusGeometry(d.r, d.tube, 18, 36);
        const mat = new THREE.MeshStandardMaterial({
          color: d.col,
          roughness: d.rough,
          metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(d.pos[0], d.pos[1], d.pos[2]);
        mesh.rotation.set(d.rot[0], d.rot[1], d.rot[2]);
        mesh.userData = {
          baseX: d.pos[0],
          baseY: d.pos[1],
          baseZ: d.pos[2],
          phase: i * 2.2,
          rx: 0.18 + i * 0.04,
          ry: 0.26 + i * 0.05,
          rz: 0.12
        };
        scene.add(mesh);
        shapes.push(mesh);
      });

      /* ----- Orbital circular rings ----- */
      const makeOrbitRing = (radius, tiltX, tiltZ, col) => {
        const segs = 72;
        const pts = [];
        for (let i = 0; i <= segs; i++) {
          const theta = (i / segs) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
        }
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const m = new THREE.LineBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.28,
          linewidth: 1
        });
        const line = new THREE.LineLoop(g, m);
        line.rotation.x = tiltX;
        line.rotation.z = tiltZ;
        line.position.set(0, 0, -10);
        line.userData = { rotZ: 0.04 };
        scene.add(line);
        shapes.push(line);
      };

      makeOrbitRing(28, 1.1, 0.3, accent);
      makeOrbitRing(36, -0.9, -0.4, accent2);

    } else if (sceneMode === "workshop") {
      /* Fallback legacy workshop shapes */
      const defs = [
        { g: new THREE.IcosahedronGeometry(2.2, 1), p: [-24, 1, -8], s: 1, r: 0.12, c: accent },
        { g: new THREE.TorusKnotGeometry(1.5, 0.42, 90, 14), p: [20, 3, -16], s: 0.8, r: 0.1, c: accent2 },
        { g: new THREE.OctahedronGeometry(1.8, 0), p: [26, -1.5, 2], s: 0.9, r: 0.14, c: accent }
      ];
      defs.forEach(d => {
        const mat = new THREE.MeshBasicMaterial({ color: d.c, wireframe: true, transparent: true, opacity: 0.35 });
        const mesh = new THREE.Mesh(d.g, mat);
        mesh.scale.setScalar(d.s);
        mesh.position.set(d.p[0], d.p[1], d.p[2]);
        mesh.userData = { rx: d.r, ry: d.r * 1.4, phase: Math.random() * Math.PI * 2 };
        scene.add(mesh);
        shapes.push(mesh);
      });
    }

    /* ----- Particles ----- */
    const baseCount = sceneMode === "minimal" ? 80 : 260;
    const count = reduceMotion.matches ? Math.min(baseCount, 100) : baseCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colPalette = [
      new THREE.Color(accent),
      new THREE.Color(accent2),
      new THREE.Color(coral),
      new THREE.Color(white)
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 120;
      positions[i3 + 1] = (Math.random() - 0.5) * 80;
      positions[i3 + 2] = (Math.random() - 0.5) * 70;
      const c = colPalette[Math.floor(Math.random() * colPalette.length)];
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    /* ----- Sizing ----- */
    let W = 1, H = 1;
    function resize() {
      W = container.clientWidth || window.innerWidth;
      H = container.clientHeight || window.innerHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    /* ----- Parallax interaction ----- */
    const target = { x: 0, y: 0 };
    let pointerActive = false;
    function onMove(e) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.x = nx * 3.5;
      target.y = -ny * 2.2;
      pointerActive = true;
    }
    window.addEventListener("pointermove", onMove, { passive: true });

    /* ----- Scroll depth interaction ----- */
    let scrollY = 0;
    function onScroll() {
      scrollY = window.scrollY || window.pageYOffset || 0;
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ----- Animation loop ----- */
    const clock = new THREE.Clock();
    let animId = null;
    let isVisible = !document.hidden;

    function handleVisibility() {
      isVisible = !document.hidden;
      if (isVisible && !animId) {
        clock.start();
        animate();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    const animate = () => {
      if (!isVisible) {
        animId = null;
        return;
      }
      const t = clock.getElapsedTime();

      if (!reduceMotion.matches) {
        for (let i = 0; i < shapes.length; i++) {
          const m = shapes[i];
          const ud = m.userData;
          if (ud.spd) {
            // Spheres smooth organic floating
            m.position.y = ud.baseY + Math.sin(t * ud.spd + ud.phase) * 1.8;
            m.position.x = ud.baseX + Math.cos(t * (ud.spd * 0.7) + ud.phase) * 1.1;
            m.rotation.y += ud.rotSpd || 0.005;
          } else if (ud.rx) {
            // Toruses smooth tumbling
            m.rotation.x = t * ud.rx + ud.phase;
            m.rotation.y = t * ud.ry + ud.phase;
            m.position.y = ud.baseY + Math.sin(t * 0.6 + ud.phase) * 1.5;
          } else if (ud.rotZ) {
            // Orbit lines gentle rotation
            m.rotation.z += 0.0008;
          }
        }
        points.rotation.y = t * 0.015;
        points.rotation.x = Math.sin(t * 0.01) * 0.08;
      }

      // Parallax easing (mouse tracking + dynamic scroll depth)
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollFraction = Math.min(1, Math.max(0, scrollY / maxScroll));
      const scrollCamY = -scrollFraction * 32;

      camera.position.x += (target.x - camera.position.x) * 0.05;
      camera.position.y += ((target.y + scrollCamY) - camera.position.y) * 0.05;
      camera.lookAt(0, scrollCamY * 0.7, 0);

      // Subtle dynamic 3D scene tilt and rotation on scroll
      scene.rotation.y = scrollFraction * 0.45;
      scene.rotation.z = Math.sin(scrollFraction * Math.PI) * 0.08;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    return {
      ok: true,
      dispose() {
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
        if (animId) cancelAnimationFrame(animId);
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
            else o.material.dispose();
          }
        });
        if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }

  if (typeof window !== "undefined") window.bpScene = { initScene };
})();
