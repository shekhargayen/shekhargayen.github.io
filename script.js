/* =========================================================
   Shekhar Gayen: Portfolio interactions
   ========================================================= */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- year ---------- */
  $("#year").textContent = new Date().getFullYear();

  /* ---------- nav: scrolled state, mobile menu, active link ---------- */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const closeMenu = () => { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  $$("a", links).forEach(a => a.addEventListener("click", closeMenu));

  const navMap = new Map($$(".nav-links a[href^='#']").map(a => [a.getAttribute("href").slice(1), a]));
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navMap.forEach(a => a.classList.remove("active"));
        navMap.get(e.target.id)?.classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("section[id]").forEach(s => sectionObs.observe(s));

  /* ---------- reveal on scroll + counters ---------- */
  const countUp = el => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const start = performance.now(), dur = 1400;
    const step = now => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      $$("[data-count]", e.target).forEach(countUp);
      if (e.target.matches("[data-count]")) countUp(e.target);
      revealObs.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    revealObs.observe(el);
  });

  /* ---------- typing effect ---------- */
  const phrases = [
    "AI agents that take action.",
    "LLM-powered applications.",
    "RAG systems grounded in data.",
    "MCP servers & agent tools.",
    "reliable backend services.",
  ];
  const typed = $("#typed");
  if (reduceMotion) {
    typed.textContent = phrases[0];
  } else {
    let pi = 0, ci = 0, deleting = false;
    const tick = () => {
      const word = phrases[pi];
      typed.textContent = word.slice(0, ci);
      if (!deleting && ci === word.length) { deleting = true; return setTimeout(tick, 1600); }
      if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
      ci += deleting ? -1 : 1;
      setTimeout(tick, deleting ? 35 : 65);
    };
    tick();
  }

  /* ---------- agent console animation ---------- */
  const consoleBody = $("#consoleBody");
  const script = [
    ['<span class="c-prompt">$</span> python agent.py --task "find an AI engineer"', 0],
    ['<span class="c-dim"># building LangGraph state graph…</span>', 350],
    ['<span class="c-node">[node]</span> retrieve_candidates   <span class="c-ok">✓</span>', 420],
    ['<span class="c-node">[node]</span> parse_resume          <span class="c-ok">✓ pydantic valid</span>', 420],
    ['<span class="c-node">[node]</span> match_skills          <span class="c-ok">✓</span>', 420],
    ['<span class="c-node">[node]</span> evaluate_fit          <span class="c-ok">✓ score 0.97</span>', 420],
    ['', 200],
    ['<span class="c-dim">→ result</span>', 250],
    ['{', 80],
    ['  <span class="c-key">"name"</span>: "Shekhar Gayen",', 80],
    ['  <span class="c-key">"focus"</span>: ["AI Agents", "LLMs", "RAG", "MCP"],', 80],
    ['  <span class="c-key">"stack"</span>: ["Python", "LangGraph", "FastAPI", "Spring Boot"],', 80],
    ['  <span class="c-key">"status"</span>: <span class="c-ok">"open_to_work"</span>', 80],
    ['}', 80],
    ['<span class="c-prompt">$</span> <span class="cursor"></span>', 300],
  ];
  const runConsole = async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    while (true) {
      consoleBody.innerHTML = "";
      for (const [line, delay] of script) {
        await wait(reduceMotion ? 0 : delay);
        consoleBody.innerHTML += line + "\n";
      }
      if (reduceMotion) return;
      await wait(6000);
    }
  };
  runConsole();

  /* ---------- project filters ---------- */
  const filters = $$(".filter");
  const projects = $$(".project");
  filters.forEach(btn => btn.addEventListener("click", () => {
    filters.forEach(b => b.classList.toggle("active", b === btn));
    const f = btn.dataset.filter;
    projects.forEach(p => {
      const show = f === "all" || p.dataset.cat.split(" ").includes(f);
      p.classList.toggle("hide", !show);
      if (show) p.classList.add("in");
    });
  }));

  /* ---------- copy email ---------- */
  const copyBtn = $("#copyEmail");
  copyBtn.addEventListener("click", async () => {
    const label = $(".copy-label", copyBtn);
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.email);
      label.textContent = "Copied ✓";
    } catch {
      window.location.href = "mailto:" + copyBtn.dataset.email;
    }
    setTimeout(() => (label.textContent = "Copy"), 1800);
  });

  /* ---------- card spotlight + cursor glow ---------- */
  $$(".card").forEach(card => card.addEventListener("pointermove", e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--x", `${e.clientX - r.left}px`);
    card.style.setProperty("--y", `${e.clientY - r.top}px`);
  }));
  const glow = $(".cursor-glow");
  window.addEventListener("pointermove", e => {
    glow.style.setProperty("--mx", `${e.clientX}px`);
    glow.style.setProperty("--my", `${e.clientY}px`);
  }, { passive: true });

  /* ---------- neural-network canvas ---------- */
  const canvas = $("#net");
  const ctx = canvas.getContext("2d");
  let W, H, nodes = [], mouse = { x: -9999, y: -9999 }, raf;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.min(90, Math.floor((W * H) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.8,
    }));
    if (reduceMotion) draw();
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const LINK = 140;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!reduceMotion) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
        // gentle mouse attraction
        const dxm = mouse.x - a.x, dym = mouse.y - a.y, dm = Math.hypot(dxm, dym);
        if (dm < 180) { a.x += dxm * 0.006; a.y += dym * 0.006; }
      }
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          const alpha = (1 - d / LINK) * 0.35;
          const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          g.addColorStop(0, `rgba(139,92,246,${alpha})`);
          g.addColorStop(1, `rgba(0,198,255,${alpha})`);
          ctx.strokeStyle = g; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const dmouse = Math.hypot(mouse.x - a.x, mouse.y - a.y);
      ctx.fillStyle = dmouse < 180 ? "rgba(0,198,255,0.95)" : "rgba(160,170,255,0.6)";
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!reduceMotion) raf = requestAnimationFrame(draw);
  };

  const hero = $("#hero");
  hero.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

  // pause the animation when the hero is off screen (saves battery)
  new IntersectionObserver(([e]) => {
    if (reduceMotion) return;
    if (e.isIntersecting) { if (!raf) raf = requestAnimationFrame(draw); }
    else { cancelAnimationFrame(raf); raf = null; }
  }).observe(hero);

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  resize();
})();
