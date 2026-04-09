(() => {
  "use strict";

  // Always start at top on reload/navigation restore.
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);
  window.addEventListener("load", () => window.scrollTo(0, 0));
  window.addEventListener("pageshow", () => window.scrollTo(0, 0));

  /* ═══════════════════════════════════════════════
     UTILITIES
  ═══════════════════════════════════════════════ */
  const $ = (s) => document.querySelector(s);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerpC = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
  const rgb   = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

  /* ═══════════════════════════════════════════════
     SKY GRADIENT KEYFRAMES
     Each stop: { p=scroll 0-1, t=top rgb, m=mid rgb, b=bottom rgb }
  ═══════════════════════════════════════════════ */
  const SKY = [
    { p: 0.00, t:[7,9,40],     m:[12,18,62],    b:[14,12,42]  },  // deep night
    { p: 0.08, t:[18,14,60],   m:[44,26,78],    b:[68,28,70]  },  // pre-dawn purple
    { p: 0.17, t:[48,28,102],  m:[158,68,86],   b:[248,140,76]},  // sunrise orange
    { p: 0.25, t:[88,152,215], m:[138,196,228], b:[252,210,158]}, // morning blue
    { p: 0.38, t:[76,192,244], m:[126,210,248], b:[178,228,252]}, // day sky
    { p: 0.50, t:[40,178,244], m:[78,194,248],  b:[128,212,252]}, // bright noon
    { p: 0.60, t:[60,132,214], m:[218,138,48],  b:[252,182,74] }, // late afternoon
    { p: 0.68, t:[102,6,112],  m:[198,88,44],   b:[252,178,38] }, // golden dusk
    { p: 0.76, t:[28,10,58],   m:[54,26,78],    b:[48,18,68]  },  // twilight
    { p: 0.86, t:[10,12,46],   m:[14,18,54],    b:[12,12,38]  },  // early night
    { p: 1.00, t:[5,8,32],     m:[8,12,46],     b:[7,7,28]    },  // full night
  ];

  function skyAt(p) {
    let i = 0;
    while (i < SKY.length - 1 && SKY[i + 1].p <= p) i++;
    if (i >= SKY.length - 1) return SKY[SKY.length - 1];
    const a = SKY[i], b = SKY[i + 1];
    const f = (p - a.p) / (b.p - a.p);
    return { t: lerpC(a.t, b.t, f), m: lerpC(a.m, b.m, f), b: lerpC(a.b, b.b, f) };
  }

  /* ═══════════════════════════════════════════════
     DOM REFS
  ═══════════════════════════════════════════════ */
  const skyEl    = $("#sky");
  const sunEl    = $("#sun");
  const moonEl   = $("#moon");
  const pCanvas  = $("#particles");
  const pCtx     = pCanvas.getContext("2d");
  const progFill = $("#progFill");
  const musicBtn = $("#musicBtn");
  const splash   = $("#splash");
  const startBtn = $("#startBtn");
  const roadLifeCanvas = $("#roadLife");
  const allScenes = [...document.querySelectorAll(".scene")];

  /* ═══════════════════════════════════════════════
     BUILD CHAPTER SCENES
  ═══════════════════════════════════════════════ */
  function getImageCandidates(path) {
    if (!path) return [];
    const clean = path.trim();
    const hasExt = /\.[a-zA-Z0-9]+$/.test(clean);
    if (!hasExt) {
      return [`${clean}.jpeg`, `${clean}.jpg`, `${clean}.png`, `${clean}.webp`];
    }
    const base = clean.replace(/\.[a-zA-Z0-9]+$/, "");
    const originalExt = clean.slice(base.length);
    const variants = [originalExt, ".jpeg", ".jpg", ".png", ".webp"];
    return [...new Set(variants.map((ext) => `${base}${ext}`))];
  }

  function preloadFirstAvailable(candidates, onResolved) {
    let idx = 0;
    function tryNext() {
      if (idx >= candidates.length) {
        onResolved(null);
        return;
      }
      const src = candidates[idx++];
      const img = new Image();
      img.onload = () => onResolved(src);
      img.onerror = tryNext;
      img.src = src;
    }
    tryNext();
  }

  document.querySelectorAll(".chapter").forEach((sec) => {
    // Normal photo layer
    const bg = document.createElement("div");
    bg.className = "ch-bg";
    const normalCandidates = getImageCandidates(sec.dataset.src || "");
    const animeCandidates = getImageCandidates(sec.dataset.anime || "");
    const normalDefault = normalCandidates[0] || "";
    const animeDefault = animeCandidates[0] || "";
    bg.style.backgroundImage = `url("${normalDefault}")`;

    // Anime photo layer (hidden, revealed by JS)
    const animeBg = document.createElement("div");
    animeBg.className = "ch-bg-anime";
    animeBg.style.backgroundImage = `url("${animeDefault}")`;
    if (sec.dataset.animePos) {
      animeBg.style.backgroundPosition = sec.dataset.animePos;
    }

    // Dark gradient overlay
    const overlay = document.createElement("div");
    overlay.className = "ch-overlay";

    // Caption with song ref + Tamil label + typewriter quote
    const cap = document.createElement("div");
    cap.className = "ch-caption";
    cap.innerHTML = `
      <div class="ch-song">${sec.dataset.song}</div>
      <div class="ch-label-wrap">
        <div class="ch-label-line"></div>
        <span class="ch-label-tamil">${sec.dataset.chTamil}</span>
        <span class="ch-label-num">· ${sec.dataset.chNum}</span>
      </div>
      <p class="ch-quote">
        <span class="typed"></span><span class="ch-cursor">|</span>
      </p>`;

    sec.prepend(bg, animeBg, overlay);
    sec.appendChild(cap);

    preloadFirstAvailable(normalCandidates, (resolved) => {
      if (resolved) bg.style.backgroundImage = `url("${resolved}")`;
    });
    preloadFirstAvailable(animeCandidates, (resolved) => {
      if (resolved) animeBg.style.backgroundImage = `url("${resolved}")`;
    });
  });

  /* ═══════════════════════════════════════════════
     SCROLL PROGRESS
  ═══════════════════════════════════════════════ */
  let progress = 0;
  let rafPending = false;
  let scrollStopTimer = null;
  let isUserScrolling = false;

  function getProgress() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    return total > 0 ? clamp(window.scrollY / total, 0, 1) : 0;
  }

  function updateFrame() {
    progress = getProgress();
    renderSky();
    renderCelestial();
    progFill.style.width = (progress * 100).toFixed(1) + "%";
    activateFocusedChapter();
    // Move elephant along the road(progress bar) as user scrolls.
    const elephantX = 8 + progress * 84;
    eCanvas.style.left = `${elephantX}%`;
    elephantRoadX = elephantX;
    rafPending = false;
  }

  function onScroll() {
    document.body.classList.add("is-scrolling");
    isUserScrolling = true;
    if (scrollStopTimer) clearTimeout(scrollStopTimer);
    scrollStopTimer = setTimeout(() => {
      document.body.classList.remove("is-scrolling");
      isUserScrolling = false;
    }, 140);
    if (!rafPending) { rafPending = true; requestAnimationFrame(updateFrame); }
  }

  /* ═══════════════════════════════════════════════
     MOBILE TOUCH PAGING (auto move to next/prev scene)
  ═══════════════════════════════════════════════ */
  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartTs = 0;
  let isPaging = false;

  function getClosestSceneIndex() {
    const y = window.scrollY + window.innerHeight * 0.5;
    for (let i = 0; i < allScenes.length; i++) {
      const top = allScenes[i].offsetTop;
      const bottom = top + allScenes[i].offsetHeight;
      if (y >= top && y < bottom) return i;
    }
    return allScenes.length - 1;
  }

  function pageToScene(index) {
    const clamped = clamp(index, 0, allScenes.length - 1);
    const target = allScenes[clamped];
    if (!target) return;
    isPaging = true;
    window.scrollTo({ top: target.offsetTop, behavior: "smooth" });
    setTimeout(() => {
      isPaging = false;
      onScroll();
    }, 520);
  }

  function handleSwipePaging(endY, endX, endTs) {
    if (!document.body.classList.contains("scrollable") || isPaging) return;
    const dy = endY - touchStartY;
    const dx = endX - touchStartX;
    const dt = Math.max(1, endTs - touchStartTs);
    const absY = Math.abs(dy);
    const absX = Math.abs(dx);
    const velocityY = absY / dt; // px/ms

    // Vertical intentional swipe only.
    const enoughDistance = absY > 42;
    const enoughVelocity = velocityY > 0.28;
    if (absY <= absX || (!enoughDistance && !enoughVelocity)) return;

    const currentIdx = getClosestSceneIndex();
    if (dy < 0) {
      pageToScene(currentIdx + 1); // swipe up -> next
    } else {
      pageToScene(currentIdx - 1); // swipe down -> prev
    }
  }

  /* ═══════════════════════════════════════════════
     SKY RENDERER
  ═══════════════════════════════════════════════ */
  function renderSky() {
    const c = skyAt(progress);
    skyEl.style.background =
      `linear-gradient(180deg,${rgb(c.t)},${rgb(c.m)} 50%,${rgb(c.b)})`;
  }

  /* ═══════════════════════════════════════════════
     SUN & MOON
  ═══════════════════════════════════════════════ */
  function renderCelestial() {
    const sStart = 0.13, sEnd = 0.74;
    if (progress > sStart && progress < sEnd) {
      const sp = (progress - sStart) / (sEnd - sStart);
      const sx = lerp(82, 16, sp);
      const sy = 11 + 54 * (1 - Math.sin(sp * Math.PI));
      sunEl.style.left    = sx + "%";
      sunEl.style.top     = sy + "%";
      sunEl.style.opacity = sp < 0.07 ? sp / 0.07 : sp > 0.93 ? (1 - sp) / 0.07 : 1;
    } else {
      sunEl.style.opacity = 0;
    }

    let mOp = 0, mX = 68, mY = 12;
    if (progress < 0.17) {
      mOp = progress < 0.11 ? 1 : 1 - (progress - 0.11) / 0.06;
      mX  = lerp(68, 44, progress / 0.17);
      mY  = lerp(10, 24, progress / 0.17);
    } else if (progress > 0.78) {
      const mp = (progress - 0.78) / 0.22;
      mOp = mp < 0.14 ? mp / 0.14 : 1;
      mX  = lerp(80, 55, mp);
      mY  = lerp(30, 10, mp);
    }
    moonEl.style.left    = mX + "%";
    moonEl.style.top     = mY + "%";
    moonEl.style.opacity = mOp;
  }

  /* ═══════════════════════════════════════════════
     PARTICLE ENGINE (canvas)
  ═══════════════════════════════════════════════ */
  let W, H;
  const P = { stars: [], petals: [], leaves: [], snow: [], shoots: [], clouds: [], rain: [] };

  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.55;
    pCanvas.width  = Math.round(W * dpr);
    pCanvas.height = Math.round(H * dpr);
    pCanvas.style.width  = W + "px";
    pCanvas.style.height = H + "px";
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function rand()     { return Math.random(); }
  function randn(n)   { return rand() * n; }
  function rng(a, b)  { return a + rand() * (b - a); }

  function initParticles() {
    P.stars  = Array.from({ length: 90 },  () => ({ x: randn(W), y: randn(H * 0.75), r: rng(0.4, 1.8), ph: randn(6.28), sp: rng(0.3, 0.9) }));
    P.petals = Array.from({ length: 30 },  mkPetal);
    P.leaves = Array.from({ length: 26 },  mkLeaf);
    P.snow   = Array.from({ length: 42 },  mkSnow);
    P.shoots = [];
    P.clouds = Array.from({ length: 6 },   mkCloud);
    P.rain   = Array.from({ length: 90 },  mkRain);
  }

  const mkPetal = () => ({ x: randn(W), y: -20 - randn(H), r: rng(3,6), rot: randn(360), vx: rng(-0.18,0.18), vy: rng(0.35,0.85), vr: rng(-2,2), ph: randn(6.28) });
  const mkLeaf  = () => ({ x: randn(W), y: -20 - randn(H), r: rng(4,8), rot: randn(360), vx: rng(-0.28,0.28), vy: rng(0.45,1.0), vr: rng(-2.5,2.5), hue: rng(12,48), ph: randn(6.28) });
  const mkSnow  = () => ({ x: randn(W), y: -15 - randn(H), r: rng(0.8,3.0), vy: rng(0.2,0.58), vx: rng(-0.16,0.16), ph: randn(6.28) });
  const mkCloud = () => ({ x: rng(W * 0.05, W * 1.1), y: rng(H * 0.04, H * 0.22), w: rng(70,160), h: rng(28,52), spd: rng(0.08,0.22), op: rng(0.35,0.65) });
  const mkRain  = () => ({ x: randn(W), y: randn(H), len: rng(9,20), spd: rng(6,12), slant: rng(1.5,3), op: rng(0.25,0.55) });

  let frame = 0;

  function drawParticles() {
    pCtx.clearRect(0, 0, W, H);
    frame++;
    const t = frame * 0.017;

    /* ── Stars + shooting stars ── */
    let sA = 0;
    if (progress < 0.17)       sA = progress < 0.10 ? 1 : 1 - (progress - 0.10) / 0.07;
    else if (progress > 0.76)  sA = clamp((progress - 0.76) / 0.07, 0, 1);

    if (sA > 0.01) {
      P.stars.forEach((s) => {
        const tw = 0.32 + 0.68 * Math.sin(t * s.sp + s.ph);
        pCtx.globalAlpha = sA * tw;
        pCtx.fillStyle = "#e4dcff";
        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.r, 0, 6.28);
        pCtx.fill();
      });

      // Random shooting stars
      if (sA > 0.25 && rand() < 0.005) {
        P.shoots.push({
          x: rng(W * 0.08, W * 0.82), y: randn(H * 0.32),
          vx: rng(4.5, 8), vy: rng(2, 3.5),
          life: 1, dec: rng(0.016, 0.028)
        });
      }
      P.shoots = P.shoots.filter((ss) => {
        ss.x += ss.vx; ss.y += ss.vy; ss.life -= ss.dec;
        if (ss.life <= 0) return false;
        const len = 5;
        pCtx.globalAlpha = ss.life * sA * 0.85;
        pCtx.strokeStyle = "#ffffff";
        pCtx.lineWidth = 1.4;
        pCtx.beginPath();
        pCtx.moveTo(ss.x, ss.y);
        pCtx.lineTo(ss.x - ss.vx * len, ss.y - ss.vy * len);
        pCtx.stroke();
        return true;
      });
    }

    /* ── Cherry-blossom petals (spring / morning) ── */
    let pA = 0;
    if (progress > 0.16 && progress < 0.50) {
      pA = progress < 0.22 ? (progress - 0.16) / 0.06
         : progress > 0.44 ? (0.50 - progress) / 0.06 : 1;
    }
    if (pA > 0.01) {
      P.petals.forEach((p) => {
        p.x  += p.vx + Math.sin(t + p.ph) * 0.38;
        p.y  += p.vy;
        p.rot += p.vr;
        if (p.y > H + 14) { p.y = -12; p.x = randn(W); }
        pCtx.save();
        pCtx.globalAlpha = pA * 0.68;
        pCtx.translate(p.x, p.y);
        pCtx.rotate(p.rot * 0.01745);
        pCtx.fillStyle = `hsl(${326 + Math.sin(p.ph) * 9},76%,75%)`;
        pCtx.beginPath();
        pCtx.ellipse(0, 0, p.r, p.r * 0.52, 0, 0, 6.28);
        pCtx.fill();
        pCtx.restore();
      });
    }

    /* ── Autumn leaves (dusk) ── */
    let lA = 0;
    if (progress > 0.55 && progress < 0.84) {
      lA = progress < 0.61 ? (progress - 0.55) / 0.06
         : progress > 0.78 ? (0.84 - progress) / 0.06 : 1;
    }
    if (lA > 0.01) {
      P.leaves.forEach((l) => {
        l.x  += l.vx + Math.sin(t * 0.6 + l.ph) * 0.58;
        l.y  += l.vy;
        l.rot += l.vr;
        if (l.y > H + 14) { l.y = -14; l.x = randn(W); }
        pCtx.save();
        pCtx.globalAlpha = lA * 0.6;
        pCtx.translate(l.x, l.y);
        pCtx.rotate(l.rot * 0.01745);
        pCtx.fillStyle = `hsl(${l.hue},80%,46%)`;
        pCtx.beginPath();
        pCtx.ellipse(0, 0, l.r, l.r * 0.42, 0, 0, 6.28);
        pCtx.fill();
        pCtx.restore();
      });
    }

    /* ── Snowflakes (winter night) ── */
    let nA = 0;
    if (progress > 0.72 && progress < 0.99) {
      nA = progress < 0.78 ? (progress - 0.72) / 0.06
         : progress > 0.93 ? (0.99 - progress) / 0.06 : 1;
    }
    if (nA > 0.01) {
      P.snow.forEach((s) => {
        s.x += s.vx + Math.sin(t * 0.36 + s.ph) * 0.24;
        s.y += s.vy;
        if (s.y > H + 10) { s.y = -8; s.x = randn(W); }
        pCtx.globalAlpha = nA * 0.7;
        pCtx.fillStyle = "#ffffff";
        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.r, 0, 6.28);
        pCtx.fill();
      });
    }

    /* ── Clouds (morning → afternoon) ── */
    let cA = 0;
    if (progress > 0.18 && progress < 0.70) {
      cA = progress < 0.24 ? (progress - 0.18) / 0.06
         : progress > 0.64 ? (0.70 - progress) / 0.06 : 1;
    }
    if (cA > 0.01) {
      P.clouds.forEach((c) => {
        c.x -= c.spd;
        if (c.x + c.w < 0) { c.x = W + c.w * 0.5; c.y = rng(H * 0.04, H * 0.22); }
        pCtx.globalAlpha = cA * c.op;
        // Draw fluffy cloud shape from 3 overlapping ellipses
        pCtx.fillStyle = "rgba(255,255,255,0.92)";
        pCtx.beginPath();
        pCtx.ellipse(c.x,              c.y,            c.w * 0.42, c.h * 0.52, 0, 0, 6.28);
        pCtx.ellipse(c.x - c.w * 0.28, c.y + c.h * 0.15, c.w * 0.30, c.h * 0.42, 0, 0, 6.28);
        pCtx.ellipse(c.x + c.w * 0.26, c.y + c.h * 0.18, c.w * 0.28, c.h * 0.40, 0, 0, 6.28);
        pCtx.fill();
      });
    }

    /* ── Rain (mango-season rain chapters 7-8) ── */
    let rA = 0;
    if (progress > 0.60 && progress < 0.83) {
      rA = progress < 0.66 ? (progress - 0.60) / 0.06
         : progress > 0.77 ? (0.83 - progress) / 0.06 : 1;
    }
    if (rA > 0.01) {
      pCtx.lineWidth = 1;
      pCtx.lineCap = "round";
      P.rain.forEach((r) => {
        r.y += r.spd;
        r.x -= r.slant;
        if (r.y > H + r.len) { r.y = -r.len; r.x = randn(W * 1.2); }
        pCtx.globalAlpha = rA * r.op;
        pCtx.strokeStyle = "rgba(172,210,255,0.8)";
        pCtx.beginPath();
        pCtx.moveTo(r.x, r.y);
        pCtx.lineTo(r.x + r.slant * (r.len / r.spd) * 0.25, r.y + r.len);
        pCtx.stroke();
      });
    }

    pCtx.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
  }

  /* ═══════════════════════════════════════════════
     ANIME REVEAL ENGINE
     Maps data-transition → CSS animation name + duration
  ═══════════════════════════════════════════════ */
  const ANIM_MAP = {
    "wipe-down":  { name: "animeWipeDown",  dur: "1.7s cubic-bezier(0.7,0,0.3,1)" },
    "wipe-right": { name: "animeWipeRight", dur: "1.7s cubic-bezier(0.7,0,0.3,1)" },
    "iris":       { name: "animeIris",      dur: "1.8s cubic-bezier(0.6,0,0.4,1)" },
    "diagonal":   { name: "animeDiag",      dur: "1.7s cubic-bezier(0.7,0,0.3,1)" },
    "burn":       { name: "animeBurn",      dur: "2.2s ease" },
    "split":      { name: "animeSplit",     dur: "1.7s cubic-bezier(0.6,0,0.4,1)" },
    "wipe-left":  { name: "animeWipeLeft",  dur: "1.7s cubic-bezier(0.7,0,0.3,1)" },
    "glitch":     { name: "animeGlitch",    dur: "2.0s ease" },
    "corner":     { name: "animeCorner",    dur: "1.8s cubic-bezier(0.6,0,0.4,1)" },
    "wipe-up":    { name: "animeWipeUp",    dur: "1.7s cubic-bezier(0.7,0,0.3,1)" },
  };

  function runFallbackReveal(layer, key) {
    layer.style.animation = "none";
    layer.style.clipPath = "none";
    layer.style.opacity = "0";
    layer.style.transform = "scale(1.04)";
    layer.style.transition = "opacity 900ms ease, transform 1200ms ease, filter 1200ms ease";
    if (key === "glitch") {
      layer.style.filter = "saturate(1.7) contrast(1.2) brightness(1.08)";
    }
    requestAnimationFrame(() => {
      layer.style.opacity = "0.80";
      layer.style.transform = "scale(1)";
    });
  }

  function triggerAnimeReveal(section) {
    const layer = section.querySelector(".ch-bg-anime");
    if (!layer || layer.dataset.revealed) return;
    layer.dataset.revealed = "1";
    section.classList.add("anime-active");

    const key = section.dataset.transition || "wipe-down";
    const cfg = ANIM_MAP[key] || ANIM_MAP["wipe-down"];

    const supportsClipPath = typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      (CSS.supports("clip-path", "inset(0 0 0 0)") || CSS.supports("-webkit-clip-path", "inset(0 0 0 0)"));

    // 2.5 s delay: let viewer see the real photo first
    setTimeout(() => {
      layer.classList.add("revealed");
      if (supportsClipPath) {
        layer.style.transition = "opacity 900ms ease, filter 900ms ease";
        layer.style.transform = "";
        layer.style.animation = `${cfg.name} ${cfg.dur} both forwards`;
        // Safety fallback: if animation still fails, force visible fade.
        setTimeout(() => {
          if (getComputedStyle(layer).opacity === "0") {
            runFallbackReveal(layer, key);
          }
        }, 300);
      } else {
        runFallbackReveal(layer, key);
      }
    }, 2500);
  }

  /* ═══════════════════════════════════════════════
     TAMIL GRAPHEME-AWARE TYPEWRITER
  ═══════════════════════════════════════════════ */
  function splitGraphemes(text) {
    try {
      return [...new Intl.Segmenter("ta", { granularity: "grapheme" })
        .segment(text)].map((s) => s.segment);
    } catch (_) {
      return [...text]; // fallback: code-point split
    }
  }

  function typeWriter(el, text, speed) {
    speed = speed || 55;
    const chars = splitGraphemes(text);
    let i = 0;
    const tick = () => {
      if (i <= chars.length) {
        el.textContent = chars.slice(0, i).join("");
        i++;
        setTimeout(tick, speed + (i % 4 === 0 ? 80 : 0)); // micro pauses
      }
    };
    tick();
  }

  /* ═══════════════════════════════════════════════
     INTERSECTION OBSERVER — scene enter
  ═══════════════════════════════════════════════ */
  const revealedSet = new WeakSet();
  const chapterEls = [...document.querySelectorAll(".chapter")];

  function activateFocusedChapter() {
    const midY = window.innerHeight * 0.52;
    for (const chapter of chapterEls) {
      const rect = chapter.getBoundingClientRect();
      if (rect.top <= midY && rect.bottom >= midY) {
        if (!revealedSet.has(chapter)) {
          revealedSet.add(chapter);
          chapter.classList.add("visible");
          const span = chapter.querySelector(".typed");
          const txt = chapter.dataset.text;
          if (span && txt) setTimeout(() => typeWriter(span, txt), 700);
          triggerAnimeReveal(chapter);
        }
        break;
      }
    }
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("visible");

        // Chapter reveal is handled by focus midpoint check in activateFocusedChapter().
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll(".scene").forEach((s) => obs.observe(s));

  /* ═══════════════════════════════════════════════
     ELEPHANT MASCOT
     States per chapter: sleep|yawn|dance|play|happy|windy|sit|rain|stargaze|sleep|celebrate
  ═══════════════════════════════════════════════ */
  const CHAPTER_STATES = ["sleep","yawn","dance","play","happy","windy","sit","rain","stargaze","sleep"];
  const eCanvas = $("#elephant");
  const eDPR    = Math.min(window.devicePixelRatio || 1, 2);
  eCanvas.width  = 120 * eDPR;
  eCanvas.height = 76 * eDPR;
  const eCtx = eCanvas.getContext("2d");
  eCtx.scale(eDPR, eDPR);

  let elephantState = "sleep";
  let elephantAction = "idle";
  let elephantActionUntil = 0;
  let elephantFrame = 0;
  let elephantRoadX = 50;

  function drawElephant(ctx, cw, ch, t, state) {
    ctx.clearRect(0, 0, cw, ch);
    const cx = cw * 0.5;
    const ground = ch * 0.92;
    const scrollingWalk = isUserScrolling;
    const playingNow = elephantAction === "play" && Date.now() < elephantActionUntil;
    const eatingNow = elephantAction === "eat" && Date.now() < elephantActionUntil;
    const faceRight = true;

    if (faceRight) {
      // Mirror character so it looks forward while moving left->right.
      ctx.save();
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
    }

    /* animated offsets */
    const isDance   = state === "dance" || state === "celebrate";
    const bob       = Math.sin(t * (isDance ? 5 : 2.4)) * (isDance ? 3.5 : 1.4);
    const bodyY     = ground - 30 + bob;
    const bodyTilt  = state === "windy" ? -0.13 + Math.sin(t * 2) * 0.03
                    : isDance            ? Math.sin(t * 4) * 0.1 : 0;

    /* trunk raise 0=hanging,1=fully raised */
    let tUp = 0;
    if (state === "happy" || isDance)       tUp = 0.85 + Math.sin(t * 2.5) * 0.15;
    else if (state === "windy")             tUp = 0.72 + Math.sin(t * 1.8) * 0.12;
    else if (state === "rain")              tUp = 0.52 + Math.sin(t * 1.5) * 0.16;
    else if (state === "stargaze")          tUp = 0.35 + Math.sin(t * 1.2) * 0.08;
    else if (state === "play")              tUp = 0.55 + Math.sin(t * 2)   * 0.25;
    else if (state === "yawn")              tUp = Math.min(1, t * 0.15)    * 0.6;
    else                                    tUp = 0.12 + Math.sin(t * 1.1) * 0.08;

    const col   = "#b0a494";
    const earO  = "#c8b0a0";
    const earI  = "#f0c4bc";
    const eyeC  = "#1a120a";

    ctx.save();
    ctx.translate(cx, 0);
    ctx.rotate(bodyTilt);
    ctx.translate(-cx, 0);

    /* ── ear (drawn before body so body overlaps) ── */
    const earFlap = Math.sin(t * 1.9) * 4;
    ctx.fillStyle = earO;
    ctx.beginPath();
    ctx.ellipse(cx - 27, bodyY - 7 + earFlap * 0.35, 15, 13, -0.28, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = earI;
    ctx.beginPath();
    ctx.ellipse(cx - 27, bodyY - 7 + earFlap * 0.35, 8, 7, -0.28, 0, 6.28);
    ctx.fill();

    /* ── body ── */
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx + 7, bodyY, 30, 20, 0, 0, 6.28);
    ctx.fill();

    /* ── head ── */
    ctx.beginPath();
    ctx.ellipse(cx - 20, bodyY - 6, 18, 16, -0.08, 0, 6.28);
    ctx.fill();

    /* ── trunk ── */
    const tCtrlX = cx - 44 + lerp(0, 7, tUp);
    const tCtrlY = bodyY + lerp(4,  -6, tUp);
    const tEndX  = cx - 38 + lerp(-5, 9, tUp);
    const tEndY  = bodyY  + lerp(18, -28, tUp) + Math.sin(t * 1.3) * 3;
    ctx.strokeStyle = col;
    ctx.lineWidth = 6.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 34, bodyY - 2);
    ctx.quadraticCurveTo(tCtrlX, tCtrlY, tEndX, tEndY);
    ctx.stroke();

    /* ── legs ── */
    const walking = scrollingWalk || state === "dance" || state === "walk" || state === "play";
    const lPhase  = walking ? t * 3.8 : 0;
    const legData = [
      { x: cx - 13, ph: 0 },
      { x: cx - 2,  ph: Math.PI },
      { x: cx + 9,  ph: Math.PI * 0.5 },
      { x: cx + 21, ph: Math.PI * 1.5 },
    ];
    ctx.fillStyle = col;
    legData.forEach(({ x, ph }) => {
      const swing = Math.sin(lPhase + ph) * (walking ? 2.8 : 0);
      const lx = x - 4, ly = bodyY + 15 + swing;
      const lw = 8, lh = 14;
      ctx.beginPath();
      ctx.moveTo(lx + 3, ly);
      ctx.lineTo(lx + lw - 3, ly);
      ctx.quadraticCurveTo(lx + lw, ly, lx + lw, ly + 3);
      ctx.lineTo(lx + lw, ly + lh - 3);
      ctx.quadraticCurveTo(lx + lw, ly + lh, lx + lw - 3, ly + lh);
      ctx.lineTo(lx + 3, ly + lh);
      ctx.quadraticCurveTo(lx, ly + lh, lx, ly + lh - 3);
      ctx.lineTo(lx, ly + 3);
      ctx.quadraticCurveTo(lx, ly, lx + 3, ly);
      ctx.closePath();
      ctx.fill();
    });

    /* ── tail ── */
    const tailSw = Math.sin(t * 3.5) * 9;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 35, bodyY - 8);
    ctx.quadraticCurveTo(cx + 44, bodyY + tailSw * 0.3, cx + 40, bodyY + 5 + tailSw * 0.5);
    ctx.stroke();

    /* ── eye ── */
    const sleeping = state === "sleep";
    ctx.fillStyle = eyeC;
    if (sleeping) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = eyeC;
      ctx.beginPath();
      ctx.arc(cx - 25, bodyY - 10, 3, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx - 25, bodyY - 10, 3.2, 0, 6.28);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(cx - 24, bodyY - 11.5, 1.1, 0, 6.28);
      ctx.fill();
    }

    /* ── state extras ── */
    if (sleeping) {
      /* zzz bubbles */
      [
        { scale: 0.9, ox: 14, oy: -36, delay: 0 },
        { scale: 1.1, ox: 22, oy: -46, delay: 1.2 },
      ].forEach(({ scale, ox, oy, delay }) => {
        const a = (Math.sin(t * 0.9 + delay) + 1) * 0.5;
        ctx.globalAlpha = a;
        ctx.fillStyle = "#c8a8ff";
        ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
        ctx.fillText("z", cx + ox, bodyY + oy + Math.sin(t * 0.5 + delay) * 5);
      });
      ctx.globalAlpha = 1;
    }

    if (state === "happy" || isDance || scrollingWalk) {
      /* sparkles orbit around elephant */
      for (let i = 0; i < 5; i++) {
        const ang = t * 2.2 + (i / 5) * 6.28;
        const r   = 28 + Math.sin(t * 3 + i) * 5;
        const sx  = cx + Math.cos(ang) * r;
        const sy  = bodyY - 18 + Math.sin(ang) * r * 0.5;
        const sa  = (Math.sin(t * 4 + i * 1.3) + 1) * 0.5;
        ctx.globalAlpha = sa * 0.9;
        ctx.fillStyle = i % 2 === 0 ? "#ffe8a0" : "#ffc0d8";
        ctx.beginPath();
        /* 4-point star */
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t + i);
        for (let s = 0; s < 4; s++) {
          const a1 = (s / 4) * 6.28, a2 = a1 + 6.28 / 8;
          ctx.lineTo(Math.cos(a1) * 3.5, Math.sin(a1) * 3.5);
          ctx.lineTo(Math.cos(a2) * 1.4, Math.sin(a2) * 1.4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    if (scrollingWalk || playingNow) {
      // Butterflies around the elephant while it walks on the road.
      for (let i = 0; i < 5; i++) {
        const bx = cx - 26 + i * 22 + Math.sin(t * 2.1 + i) * 5;
        const by = bodyY - 30 - Math.cos(t * 2.8 + i * 0.7) * 8;
        const wing = 2.2 + Math.sin(t * 16 + i * 2) * 1.6;
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = i % 2 === 0 ? "#ff9ec4" : "#ffe08a";
        ctx.beginPath();
        ctx.ellipse(-wing, 0, 3.4, 2.4, -0.25, 0, 6.28);
        ctx.ellipse(wing, 0, 3.4, 2.4, 0.25, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = "#5a3b24";
        ctx.fillRect(-0.5, -2.5, 1, 5);
        ctx.restore();
      }
    }

    if (state === "sit" || state === "rain" || eatingNow) {
      // Eating grass gesture.
      ctx.strokeStyle = "#56b86a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 39, bodyY + 17);
      ctx.lineTo(cx - 30, bodyY + 10);
      ctx.stroke();
      ctx.fillStyle = "#56b86a";
      ctx.beginPath();
      ctx.ellipse(cx - 28, bodyY + 9, 1.4, 2.1, 0, 0, 6.28);
      ctx.fill();
    }

    if (state === "rain") {
      /* drops falling from trunk tip */
      for (let i = 0; i < 4; i++) {
        const dropT = (t * 1.8 + i * 0.55) % 1.8;
        if (dropT < 1) {
          ctx.globalAlpha = (1 - dropT) * 0.85;
          ctx.fillStyle = "#90c8ff";
          ctx.beginPath();
          const dx = tEndX + (i - 1.5) * 4;
          ctx.arc(dx, tEndY + dropT * 18, 2.2, 0, 6.28);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    if (state === "stargaze") {
      /* small stars above elephant's gaze */
      for (let i = 0; i < 4; i++) {
        const ang = -0.6 + i * 0.35 + Math.sin(t * 0.7 + i) * 0.12;
        const r2  = 28 + i * 9;
        const sx  = cx - 20 + Math.cos(ang) * r2 * 0.7;
        const sy  = bodyY - 20 - Math.sin(ang) * r2 * 0.9;
        const blink = (Math.sin(t * 2 + i * 1.8) + 1) * 0.5;
        ctx.globalAlpha = blink * 0.8;
        ctx.fillStyle = "#fff0c0";
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + blink, 0, 6.28);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (state === "yawn") {
      /* open mouth */
      ctx.fillStyle = "#5c2a18";
      ctx.beginPath();
      ctx.ellipse(cx - 20, bodyY - 2, 5, 3.5, 0.1, 0, Math.PI);
      ctx.fill();
    }

    if (faceRight) {
      ctx.restore();
    }
    ctx.restore();
  }

  /* Elephant animation loop */
  function animateElephant() {
    elephantFrame++;
    drawElephant(eCtx, 120, 76, elephantFrame * 0.04, elephantState);
    requestAnimationFrame(animateElephant);
  }

  // Road life layer: scattered plants/rabbits/butterflies independent of elephant movement.
  const roadDpr = Math.min(window.devicePixelRatio || 1, 2);
  const roadCtx = roadLifeCanvas.getContext("2d");
  let roadW = 0;
  let roadH = 56;
  const roadLife = {
    grasses: [],
    canes: [],
    rabbits: [],
    butterflies: []
  };

  function seedRoadLife() {
    roadLife.grasses = Array.from({ length: 18 }, (_, i) => ({
      x: (i + 0.4) / 18,
      h: 0.7 + Math.random() * 0.8
    }));
    roadLife.canes = Array.from({ length: 8 }, (_, i) => ({
      x: (i + 0.5) / 8,
      s: 0.75 + Math.random() * 0.45
    }));
    roadLife.rabbits = Array.from({ length: 4 }, (_, i) => ({
      x: (i + 0.8) / 4,
      phase: Math.random() * 6.28
    }));
    roadLife.butterflies = Array.from({ length: 9 }, (_, i) => ({
      x: (i + 0.2) / 9,
      y: 0.15 + Math.random() * 0.55,
      phase: Math.random() * 6.28,
      color: i % 2 === 0 ? "#ff9ec4" : "#ffe08a"
    }));
  }

  function resizeRoadLife() {
    roadW = window.innerWidth;
    roadH = 56;
    roadLifeCanvas.width = Math.round(roadW * roadDpr);
    roadLifeCanvas.height = Math.round(roadH * roadDpr);
    roadLifeCanvas.style.width = `${roadW}px`;
    roadLifeCanvas.style.height = `${roadH}px`;
    roadCtx.setTransform(roadDpr, 0, 0, roadDpr, 0, 0);
    seedRoadLife();
  }

  function drawRoadLife(time) {
    if (!roadCtx) return;
    roadCtx.clearRect(0, 0, roadW, roadH);
    const t = time * 0.001;
    const groundY = roadH - 6;

    const drawGrassRoad = (x, y, scale) => {
      roadCtx.save();
      roadCtx.translate(x, y);
      roadCtx.scale(scale, scale);
      roadCtx.strokeStyle = "#56b86a";
      roadCtx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const ox = (i - 2) * 2.1;
        roadCtx.beginPath();
        roadCtx.moveTo(ox, 0);
        roadCtx.quadraticCurveTo(ox + (i % 2 === 0 ? -1.5 : 1.5), -5.5, ox + (i % 2 === 0 ? -0.8 : 0.8), -10);
        roadCtx.stroke();
      }
      roadCtx.restore();
    };

    const drawCaneRoad = (x, y, scale) => {
      roadCtx.save();
      roadCtx.translate(x, y);
      roadCtx.scale(scale, scale);
      roadCtx.fillStyle = "#6fcf6a";
      for (let i = 0; i < 2; i++) {
        const sx = i * 5;
        for (let k = 0; k < 4; k++) roadCtx.fillRect(sx, -k * 7.2, 3, 5.6);
        roadCtx.fillStyle = "#4baa58";
        roadCtx.beginPath();
        roadCtx.ellipse(sx - 2.5, -18, 5, 1.8, -0.5, 0, 6.28);
        roadCtx.ellipse(sx + 5.5, -14, 5, 1.8, 0.5, 0, 6.28);
        roadCtx.fill();
        roadCtx.fillStyle = "#6fcf6a";
      }
      roadCtx.restore();
    };

    roadLife.grasses.forEach((g, i) => drawGrassRoad(g.x * roadW, groundY, g.h + Math.sin(t * 1.7 + i) * 0.06));
    roadLife.canes.forEach((c, i) => drawCaneRoad(c.x * roadW, groundY - 1, c.s + Math.sin(t * 1.2 + i) * 0.05));

    roadLife.rabbits.forEach((r, i) => {
      const x = r.x * roadW;
      const hop = Math.abs(Math.sin(t * 3 + r.phase)) * 3.4;
      roadCtx.save();
      roadCtx.translate(x, groundY - 3 - hop);
      if (i % 2) roadCtx.scale(-1, 1);
      roadCtx.fillStyle = "#f7efe7";
      roadCtx.beginPath();
      roadCtx.ellipse(0, 0, 7, 4.8, 0, 0, 6.28);
      roadCtx.ellipse(6, -2.2, 3.8, 3.2, 0, 0, 6.28);
      roadCtx.fill();
      roadCtx.fillStyle = "#f2dfd2";
      roadCtx.beginPath();
      roadCtx.ellipse(6.8, -8.2, 1.2, 4.2, -0.2, 0, 6.28);
      roadCtx.ellipse(9, -8.4, 1.2, 4.1, 0.15, 0, 6.28);
      roadCtx.fill();
      roadCtx.restore();
    });

    roadLife.butterflies.forEach((b, i) => {
      const x = b.x * roadW + Math.sin(t * 1.4 + b.phase) * 9;
      const y = b.y * roadH + Math.cos(t * 2.5 + i) * 6;
      const wing = 2 + Math.sin(t * 14 + b.phase) * 1.4;
      roadCtx.save();
      roadCtx.translate(x, y);
      roadCtx.fillStyle = b.color;
      roadCtx.beginPath();
      roadCtx.ellipse(-wing, 0, 3.2, 2.2, -0.25, 0, 6.28);
      roadCtx.ellipse(wing, 0, 3.2, 2.2, 0.25, 0, 6.28);
      roadCtx.fill();
      roadCtx.fillStyle = "#5a3b24";
      roadCtx.fillRect(-0.5, -2.2, 1, 4.4);
      roadCtx.restore();
    });

    requestAnimationFrame(drawRoadLife);
  }

  /* Set elephant state when chapter comes into view */
  const elephantObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const idx = chapterEls.indexOf(e.target);
        if (idx >= 0 && idx < CHAPTER_STATES.length) {
          elephantState = CHAPTER_STATES[idx];
          elephantAction = idx % 2 === 0 ? "eat" : "play";
          elephantActionUntil = Date.now() + 1800;
        }
      });
    },
    { threshold: 0.5 }
  );

  const outroObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) elephantState = "celebrate";
      });
    },
    { threshold: 0.4 }
  );

  /* ═══════════════════════════════════════════════
     AUDIO — YouTube background loop
  ═══════════════════════════════════════════════ */
  const YT_VIDEO_ID = "pvfyClEwnuI";
  const YT_START_AT_SECONDS = 3;
  let ytPlayer = null;
  let ytApiLoaded = false;
  let ytApiReady = false;
  let isPlaying = false;
  let pendingPlayAfterReady = false;

  function loadYouTubeApi() {
    if (ytApiLoaded) return;
    ytApiLoaded = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }

  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    const host = document.getElementById("ytPlayerHost");
    if (!host) return;
    ytPlayer = new YT.Player("ytPlayerHost", {
      height: "1",
      width: "1",
      videoId: YT_VIDEO_ID,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        loop: 1,
        playlist: YT_VIDEO_ID
      },
      events: {
        onReady: () => {
          if (pendingPlayAfterReady) {
            pendingPlayAfterReady = false;
            initAudio();
          }
        },
        onStateChange: (event) => {
          // Ensure loop if YouTube stops unexpectedly.
          if (event.data === YT.PlayerState.ENDED) {
            ytPlayer.seekTo(0);
            ytPlayer.playVideo();
          }
        }
      }
    });
  };

  function initAudio() {
    loadYouTubeApi();
    if (!ytApiReady || !ytPlayer) {
      pendingPlayAfterReady = true;
      return;
    }
    try {
      ytPlayer.unMute();
      ytPlayer.setVolume(55);
      ytPlayer.seekTo(YT_START_AT_SECONDS, true);
      ytPlayer.playVideo();
      isPlaying = true;
      musicBtn.classList.add("playing");
    } catch (_) {
      // Playback might require user interaction on some browsers.
      isPlaying = false;
      musicBtn.classList.remove("playing");
    }
  }

  function stopAudio() {
    if (ytPlayer) {
      ytPlayer.pauseVideo();
    }
    isPlaying = false;
    musicBtn.classList.remove("playing");
  }

  musicBtn.addEventListener("click", () => {
    if (!isPlaying) initAudio(); else stopAudio();
  });

  /* ═══════════════════════════════════════════════
     SPLASH — star field canvas
  ═══════════════════════════════════════════════ */
  const sCanvas = $("#splashCanvas");
  const sCtx    = sCanvas.getContext("2d");
  let splashLive = true;
  let sStars     = [];

  function initSplash() {
    sCanvas.width  = window.innerWidth;
    sCanvas.height = window.innerHeight;
    sStars = Array.from({ length: 120 }, () => ({
      x:  randn(sCanvas.width),
      y:  randn(sCanvas.height),
      r:  rng(0.3, 1.6),
      ph: randn(6.28),
      sp: rng(0.3, 0.9),
    }));
    animateSplash();
  }

  function animateSplash() {
    if (!splashLive) return;
    sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);
    const t = Date.now() * 0.001;
    sStars.forEach((s) => {
      sCtx.globalAlpha = 0.28 + 0.72 * Math.abs(Math.sin(t * s.sp + s.ph));
      sCtx.fillStyle = "#cfc0ff";
      sCtx.beginPath();
      sCtx.arc(s.x, s.y, s.r, 0, 6.28);
      sCtx.fill();
    });
    requestAnimationFrame(animateSplash);
  }

  initSplash();

  /* ═══════════════════════════════════════════════
     START EXPERIENCE
  ═══════════════════════════════════════════════ */
  function startExperience() {
    if (document.body.classList.contains("scrollable")) return;
    splash.classList.add("hidden");
    splashLive = false;
    document.body.classList.add("scrollable");
    musicBtn.classList.add("show");

    initAudio();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", (e) => {
      if (!e.touches || !e.touches[0]) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartTs = performance.now();
    }, { passive: true });
    window.addEventListener("touchend", (e) => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      handleSwipePaging(
        e.changedTouches[0].clientY,
        e.changedTouches[0].clientX,
        performance.now()
      );
    }, { passive: true });
    window.addEventListener("resize", () => {
      resizeCanvas();
      resizeRoadLife();
      onScroll();
    });

    resizeCanvas();
    resizeRoadLife();
    drawParticles();
    drawRoadLife(performance.now());
    renderSky();
    renderCelestial();
    updateFrame();

    // Elephant
    eCanvas.classList.add("show");
    chapterEls.forEach((el) => elephantObs.observe(el));
    const outroEl = document.querySelector(".outro");
    if (outroEl) outroObs.observe(outroEl);
    animateElephant();
  }

  startBtn.addEventListener("click", (e) => { e.stopPropagation(); startExperience(); });
  splash.addEventListener("click", startExperience);

  // Initial sky render even before start (shows through splash fade)
  renderSky();
})();
