/* ==========================================================================
   数学讲解师 · 交互脚本
   零依赖：星海背景 / 星图 / 课程库 / 视频弹层 / 四个 canvas 实验
   ========================================================================== */
(function () {
  "use strict";

  /* global MATH_DATA */
  var DATA = window.MATH_DATA || { modules: [] };
  var MODULES = DATA.modules || [];
  var FEATURED = DATA.featured || null;

  function toCourse(item, isFeatured) {
    return {
      id: item.id,
      title: item.name || "",
      en: item.en || "",
      glyph: item.glyph || "∑",
      color: item.color || "#d8b878",
      rgb: item.rgb || "216,184,120",
      video: item.video || "",
      poster: item.poster || "",
      featured: !!isFeatured,
      label: item.label || ""
    };
  }

  var COURSES = (FEATURED ? [toCourse(FEATURED, true)] : []).concat(
    MODULES.map(function (m) { return toCourse(m, false); })
  );
  var MODMAP = {};
  MODULES.forEach(function (m) { MODMAP[m.id] = m; });

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOUCH = window.matchMedia && window.matchMedia("(hover: none)").matches;

  function pad2(n) { return String(n).padStart(2, "0"); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(s) {
    if (!s) return "—";
    var p = String(s).split("-");
    return p.length === 3 ? p[0] + "." + p[1] + "." + p[2] : s;
  }

  var MONO = '"JetBrains Mono", ui-monospace, monospace';

  /* ---------------------------------------------------------------- 状态 */
  var STORE_KEY = "mathcosmos.done.v2";
  var doneSet = (function () {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) { return new Set(); }
  })();
  function saveDone() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(doneSet))); } catch (e) {}
  }

  /* ---------------------------------------------------------------- 背景星海 */
  function initStarfield() {
    var canvas = $("#starfield");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1, stars = [], shooters = [], raf = 0;
    var last = 0, t = 0, running = false;
    var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, scrollY = 0;

    function build() {
      var n = W < 700 ? 80 : W < 1100 ? 130 : 190;
      stars = new Array(n).fill(0).map(function () {
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.25 + 0.25,
          a: Math.random() * 0.55 + 0.16,
          tw: Math.random() * Math.PI * 2,
          sp: 0.35 + Math.random() * 1.0,
          dep: 0.2 + Math.random() * 0.8,
          gold: Math.random() > 0.86
        };
      });
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (REDUCED) draw(0);
    }

    function draw(dt) {
      ctx.clearRect(0, 0, W, H);

      mx += (tx - mx) * 0.045;
      my += (ty - my) * 0.045;

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var twinkle = REDUCED ? 0.8 : 0.62 + 0.38 * Math.sin(t * 0.0011 * s.sp + s.tw);
        var alpha = s.a * twinkle;
        var ox = (mx - 0.5) * 18 * s.dep;
        var oy = (my - 0.5) * 12 * s.dep - scrollY * 0.012 * s.dep;
        var x = s.x + ox;
        var y = s.y + oy;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.gold
          ? "rgba(240,217,168," + alpha.toFixed(3) + ")"
          : "rgba(226,232,244," + alpha.toFixed(3) + ")";
        ctx.fill();
        if (s.r > 1.1) {
          ctx.beginPath();
          ctx.arc(x, y, s.r * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = s.gold
            ? "rgba(240,217,168," + (alpha * 0.05).toFixed(3) + ")"
            : "rgba(200,214,255," + (alpha * 0.05).toFixed(3) + ")";
          ctx.fill();
        }
      }

      if (!REDUCED) {
        if (shooters.length < 2 && Math.random() < 0.0035) {
          shooters.push({
            x: W * (0.15 + Math.random() * 0.75),
            y: H * Math.random() * 0.42,
            vx: 3.4 + Math.random() * 2.4,
            vy: 1.15 + Math.random() * 0.9,
            life: 1
          });
        }
        for (var j = shooters.length - 1; j >= 0; j--) {
          var sh = shooters[j];
          sh.x += sh.vx * (dt / 16.7);
          sh.y += sh.vy * (dt / 16.7);
          sh.life -= 0.011 * (dt / 16.7);
          if (sh.life <= 0) { shooters.splice(j, 1); continue; }
          var len = 90;
          var norm = Math.hypot(sh.vx, sh.vy);
          var g = ctx.createLinearGradient(sh.x, sh.y, sh.x - (sh.vx / norm) * len, sh.y - (sh.vy / norm) * len);
          g.addColorStop(0, "rgba(240,217,168," + (0.55 * sh.life).toFixed(3) + ")");
          g.addColorStop(1, "rgba(240,217,168,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(sh.x, sh.y);
          ctx.lineTo(sh.x - (sh.vx / norm) * len, sh.y - (sh.vy / norm) * len);
          ctx.stroke();
        }
      }
    }

    function loop(ts) {
      if (!running) return;
      if (!last) last = ts;
      var dt = Math.min(48, ts - last);
      last = ts;
      t += dt;
      draw(dt);
      raf = window.requestAnimationFrame(loop);
    }

    function start() {
      if (running || REDUCED) return;
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      window.cancelAnimationFrame(raf);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", function () { scrollY = window.scrollY || 0; }, { passive: true });
    window.addEventListener("mousemove", function (e) {
      if (TOUCH) return;
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else { last = 0; start(); }
    });

    resize();
    if (!REDUCED) start();
  }

  /* ---------------------------------------------------------------- 星尘光标 */
  function initCursor() {
    var glow = $("#cursor-glow");
    if (!glow || TOUCH || REDUCED) return;
    var x = window.innerWidth / 2, y = window.innerHeight / 2, tx = x, ty = y;
    var seen = false;
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; glow.style.opacity = "1"; }
    }, { passive: true });
    (function loop() {
      x += (tx - x) * 0.075;
      y += (ty - y) * 0.075;
      glow.style.transform = "translate3d(" + (x - 260).toFixed(1) + "px," + (y - 260).toFixed(1) + "px,0)";
      window.requestAnimationFrame(loop);
    })();
  }

  /* ---------------------------------------------------------------- 顶栏 / 滚动进度 */
  function initChrome() {
    var header = $("#site-header");
    var bar = $("#scroll-progress");
    var links = $$(".site-nav a");
    var sections = $$("main section[id]");
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        if (header) header.classList.toggle("is-scrolled", y > 24);

        var h = document.documentElement.scrollHeight - window.innerHeight;
        if (bar) bar.style.width = (h > 0 ? clamp(y / h, 0, 1) * 100 : 0) + "%";

        var current = "";
        var bottomReached = window.innerHeight + y >= document.documentElement.scrollHeight - 6;
        if (bottomReached && sections.length) {
          current = sections[sections.length - 1].id;
        } else {
          for (var i = 0; i < sections.length; i++) {
            if (sections[i].getBoundingClientRect().top <= window.innerHeight * 0.42) current = sections[i].id;
          }
        }
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("data-nav") === current);
        });

        updateTimelineProgress();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  /* ---------------------------------------------------------------- 移动菜单 */
  function initMenu() {
    var toggle = $("#menu-toggle");
    var menu = $("#mobile-menu");
    if (!toggle || !menu) return;

    function setOpen(open) {
      document.body.classList.toggle("menu-open", open);
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", String(!open));
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    }
    toggle.addEventListener("click", function () {
      setOpen(!menu.classList.contains("is-open"));
    });
    $$("a", menu).forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024 && menu.classList.contains("is-open")) setOpen(false);
    });
  }

  /* ---------------------------------------------------------------- 入场动效 */
  function initReveal() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    if (REDUCED || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------- 首屏视差 */
  function initHero() {
    var hero = $(".hero");
    var visual = $("#hero-visual");
    if (!hero || !visual || TOUCH || REDUCED) return;
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      var px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      var py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      visual.style.setProperty("--px", px.toFixed(3));
      visual.style.setProperty("--py", py.toFixed(3));
    }, { passive: true });
  }

  /* ---------------------------------------------------------------- 星图 */
  function initGalaxy() {
    var rotor = $("#orbit-rotor");
    var panel = $("#module-panel");
    if (!rotor || !panel || !MODULES.length) return;

    var radii = [32, 41.5];
    var nodes = [];
    var spokes = [];
    var current = -1;

    var NS = "http://www.w3.org/2000/svg";
    var lineLayer = document.createElementNS(NS, "svg");
    lineLayer.setAttribute("class", "orbit-spokes");
    lineLayer.setAttribute("viewBox", "0 0 100 100");
    lineLayer.setAttribute("preserveAspectRatio", "none");
    lineLayer.setAttribute("aria-hidden", "true");

    MODULES.forEach(function (m, i) {
      var angle = ((-90 + i * 60) * Math.PI) / 180;
      var r = radii[i % 2];
      var x = 50 + Math.cos(angle) * r;
      var y = 50 + Math.sin(angle) * r;
      var count = 1;

      var spoke = document.createElementNS(NS, "line");
      spoke.setAttribute("x1", "50");
      spoke.setAttribute("y1", "50");
      spoke.setAttribute("x2", x.toFixed(2));
      spoke.setAttribute("y2", y.toFixed(2));
      lineLayer.appendChild(spoke);
      spokes.push(spoke);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "orbit-node" + (Math.sin(angle) > 0.4 ? " is-top" : "");
      btn.style.left = x.toFixed(2) + "%";
      btn.style.top = y.toFixed(2) + "%";
      btn.style.setProperty("--m", m.color || "#d8b878");
      btn.style.setProperty("--m-rgb", m.rgb || "216,184,120");
      btn.dataset.module = m.id;
      btn.setAttribute("aria-label", "播放 " + m.name + " 板块视频");
      btn.innerHTML =
        '<span class="orbit-node-inner">' +
          '<span class="orbit-node-dot"></span>' +
          '<span class="orbit-node-label">' +
            '<span class="orbit-node-name">' + esc(m.name) + "</span>" +
            '<span class="orbit-node-count">' + pad2(count) + " 讲</span>" +
          "</span>" +
        "</span>";

      btn.addEventListener("mouseenter", function () { select(i); });
      btn.addEventListener("focus", function () { select(i); });
      btn.addEventListener("click", function () {
        select(i);
        openCourse(m.id);
      });

      rotor.appendChild(btn);
      nodes.push(btn);
    });

    rotor.appendChild(lineLayer);

    function renderPanel(i) {
      var m = MODULES[i];
      if (!m) return;
      panel.style.setProperty("--pm-rgb", m.rgb || "216,184,120");
      panel.innerHTML =
        '<div class="panel-enter">' +
          '<div class="mp-top">' +
            '<span class="mp-index">MODULE ' + pad2(i + 1) + " / " + pad2(MODULES.length) + "</span>" +
            '<span class="mp-glyph">' + (m.glyph || "∑") + "</span>" +
          "</div>" +
          '<h3 class="mp-title">' + esc(m.name) + "</h3>" +
          '<p class="mp-en">' + esc(m.en) + "</p>" +
          '<div class="mp-foot">' +
            '<span class="mp-count">01 讲 · 完整视频</span>' +
            '<a class="mp-link" href="#courses">观看本板块 <span aria-hidden="true">→</span></a>' +
          "</div>" +
        "</div>";

      var link = $(".mp-link", panel);
      if (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          openCourse(m.id);
        });
      }
    }

    function select(i) {
      if (i === current) return;
      current = i;
      nodes.forEach(function (n, j) { n.classList.toggle("is-active", j === i); });
      spokes.forEach(function (sp, j) { sp.classList.toggle("is-active", j === i); });
      renderPanel(i);
    }

    select(0);
    // 首屏不筛选，只展示第一个模块
    nodes[0].classList.add("is-active");

    var hint = $(".orbit-hint");
    if (hint && TOUCH) hint.textContent = "点按星球 · 播放视频";
  }

  /* ---------------------------------------------------------------- 课程库 */
  function moduleCardHTML(m, i) {
    var c = toCourse(m, false);
    var isDone = doneSet.has(c.id);
    return (
      '<article class="course-card course-card--module' + (isDone ? " is-done" : "") + '" role="button" tabindex="0"' +
        ' aria-label="播放 ' + esc(m.name) + ' 板块视频" data-id="' + esc(c.id) + '"' +
        ' style="--i:' + i + ';--c:' + c.color + ';--c-rgb:' + c.rgb + '">' +
        '<div class="course-media">' +
          '<span class="course-index">' + pad2(i + 1) + "</span>" +
          '<span class="course-glyph" aria-hidden="true">' + (m.glyph || "∑") + "</span>" +
          '<span class="course-play" aria-hidden="true">' +
            '<svg viewBox="0 0 12 14"><path d="M1 1.2 11 7 1 12.8Z" fill="currentColor"/></svg>' +
          "</span>" +
        "</div>" +
        '<div class="course-body">' +
          '<h3 class="course-title">' + esc(m.name) + "</h3>" +
          '<p class="course-en">' + esc(m.en || "") + "</p>" +
          '<span class="course-watch"><i aria-hidden="true"></i>观看视频<span aria-hidden="true">→</span></span>' +
        "</div>" +
      "</article>"
    );
  }

  function featuredHTML() {
    if (!FEATURED) return "";
    var c = toCourse(FEATURED, true);
    var isDone = doneSet.has(c.id);
    return (
      '<article class="feature-card' + (isDone ? " is-done" : "") + '" role="button" tabindex="0"' +
        ' aria-label="播放 ' + esc(c.title) + '" data-id="' + esc(c.id) + '">' +
        '<div class="feature-copy">' +
          '<p class="feature-kicker">00 / 先导课 · PROLOGUE</p>' +
          '<h3 class="feature-title">' + esc(c.title) + "</h3>" +
          '<p class="feature-en">' + esc(c.en) + "</p>" +
          '<span class="feature-watch"><span class="feature-play" aria-hidden="true">' +
            '<svg viewBox="0 0 12 14"><path d="M1 1.2 11 7 1 12.8Z" fill="currentColor"/></svg>' +
          "</span>观看完整视频</span>" +
        "</div>" +
        '<div class="feature-art" aria-hidden="true">' +
          '<span class="feature-ring"></span>' +
          '<span class="feature-glyph">' + (c.glyph || "∞") + "</span>" +
        "</div>" +
      "</article>"
    );
  }

  function applyPoster(card, c) {
    if (!c.poster || !card) return;
    var media = $(".course-media", card);
    if (!media) return;
    media.style.backgroundImage = 'linear-gradient(180deg, rgba(4,6,12,.15), rgba(4,6,12,.62)), url("' + c.poster + '")';
    media.style.backgroundSize = "cover";
    media.style.backgroundPosition = "center";
  }

  function renderLibrary() {
    var featured = $("#featured-course");
    if (featured) featured.innerHTML = featuredHTML();

    var grid = $("#course-grid");
    if (grid) grid.innerHTML = MODULES.map(moduleCardHTML).join("");

    COURSES.forEach(function (c) {
      var card = document.querySelector('.library [data-id="' + c.id + '"]');
      if (card) applyPoster(card, c);
    });

    var count = $("#library-count");
    if (count) count.textContent = "共 " + COURSES.length + " 讲";

    updateProgress();
  }

  function updateProgress() {
    var total = COURSES.length;
    var n = COURSES.filter(function (c) { return doneSet.has(c.id); }).length;
    var doneEl = $("#progress-done");
    var totalEl = $("#progress-total");
    var bar = $("#progress-bar");
    if (doneEl) doneEl.textContent = n;
    if (totalEl) totalEl.textContent = total;
    if (bar) bar.style.width = (total ? (n / total) * 100 : 0) + "%";
  }

  function bindCards(root) {
    if (!root) return;

    root.addEventListener("click", function (e) {
      var card = e.target.closest("[data-id]");
      if (!card) return;
      openCourse(card.dataset.id);
    });

    root.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest("[data-id]");
      if (!card) return;
      e.preventDefault();
      openCourse(card.dataset.id);
    });

    var raf = 0, lastEvt = null;
    root.addEventListener("mousemove", function (e) {
      lastEvt = e;
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        if (!lastEvt) return;
        var card = lastEvt.target.closest(".course-card, .feature-card");
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (((lastEvt.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (((lastEvt.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
      });
    }, { passive: true });
  }

  function initCardEvents() {
    bindCards($("#featured-course"));
    bindCards($("#course-grid"));
  }

  /* ---------------------------------------------------------------- 课程弹层 */
  var modal = null;
  var modalCourseId = null;
  var lastFocus = null;

  var LAB_FOR_MODULE = {
    function: { id: "deriv", name: "割线 · 切线" },
    trig: { id: "trig", name: "单位圆 · 正弦波" },
    sequence: { id: "golden", name: "斐波那契 · 螺旋" },
    probability: { id: "monte", name: "随机 · π" }
  };

  function videoPlaceholder() {
    return (
      '<div class="video-placeholder">' +
        '<span class="vp-mark" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/></svg>' +
        "</span>" +
        '<p class="vp-tag">VIDEO SLOT RESERVED</p>' +
        '<p class="vp-title">本讲视频即将上线</p>' +
        '<p class="vp-note">正在整理这一讲的视频与板书，稍后回来看看。</p>' +
      "</div>"
    );
  }

  function renderVideo(c) {
    var stage = $("#modal-video");
    if (!stage) return;
    var v = String(c.video || "").trim();
    if (!v) {
      stage.innerHTML = videoPlaceholder();
      return;
    }
    if (v.charAt(0) === "<") {
      stage.innerHTML = v;
      var ifr = stage.querySelector("iframe");
      if (ifr) {
        ifr.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
        ifr.setAttribute("allowfullscreen", "");
        ifr.setAttribute("loading", "lazy");
        ifr.setAttribute("title", c.title);
      }
      return;
    }
    stage.innerHTML =
      '<iframe src="' + esc(v) + '" title="' + esc(c.title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>';
  }

  function updateDoneBtn() {
    var btn = $("#modal-done");
    var txt = $("#modal-done-text");
    if (!btn || !txt) return;
    var isDone = modalCourseId ? doneSet.has(modalCourseId) : false;
    btn.setAttribute("aria-pressed", isDone ? "true" : "false");
    txt.textContent = isDone ? "已学完 · 点击取消" : "标记为已学";
  }

  function nextCourse(id) {
    if (!COURSES.length) return null;
    var idx = COURSES.findIndex(function (c) { return c.id === id; });
    if (idx === -1) return COURSES[0];
    return COURSES[(idx + 1) % COURSES.length];
  }

  function openCourse(id) {
    var c = COURSES.find(function (x) { return x.id === id; });
    if (!c || !modal) return;
    modalCourseId = id;

    var modIndex = MODULES.findIndex(function (x) { return x.id === c.id; });
    $("#modal-kicker").textContent = c.featured
      ? "先导课 · PROLOGUE"
      : "MODULE " + pad2(modIndex + 1) + " / " + pad2(MODULES.length) + " · 完整视频";
    $("#modal-title").textContent = c.title;

    renderVideo(c);

    var lab = c.featured ? null : LAB_FOR_MODULE[c.id];
    var labBtn = $("#modal-lab");
    if (labBtn) {
      if (lab) {
        labBtn.hidden = false;
        labBtn.dataset.lab = lab.id;
        labBtn.textContent = "配合实验 · " + lab.name;
      } else {
        labBtn.hidden = true;
        labBtn.dataset.lab = "";
      }
    }

    var next = nextCourse(id);
    var nextBtn = $("#modal-next");
    var nextText = $("#modal-next-text");
    if (nextBtn) {
      nextBtn.hidden = !next;
      nextBtn.dataset.id = next ? next.id : "";
    }
    if (nextText) nextText.textContent = next && next.featured ? "回到先导课" : "下一个板块";

    updateDoneBtn();

    if (!modal.classList.contains("is-open")) {
      lastFocus = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
    }
    var panel = $("#modal-panel");
    if (panel) panel.scrollTop = 0;
    var closeBtn = $(".modal-close", modal);
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeModal() {
    if (!modal || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    var stage = $("#modal-video");
    window.setTimeout(function () {
      if (!modal.classList.contains("is-open") && stage) stage.innerHTML = "";
    }, 380);
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function initModal() {
    modal = $("#course-modal");
    if (!modal) return;

    $$("[data-close]", modal).forEach(function (el) {
      el.addEventListener("click", closeModal);
    });

    $("#modal-done").addEventListener("click", function () {
      if (!modalCourseId) return;
      if (doneSet.has(modalCourseId)) {
        doneSet.delete(modalCourseId);
        toast("已取消「已学」标记");
      } else {
        doneSet.add(modalCourseId);
        toast("已标记为已学 · 继续保持");
      }
      saveDone();
      updateDoneBtn();
      renderLibrary();
    });

    $("#modal-next").addEventListener("click", function () {
      var id = this.dataset.id;
      if (id) openCourse(id);
    });

    $("#modal-lab").addEventListener("click", function () {
      var labId = this.dataset.lab;
      closeModal();
      if (labId) window.setTimeout(function () { activateLab(labId, true); }, 380);
    });

    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("is-open")) return;
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key !== "Tab") return;
      var focusables = $$("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])", modal)
        .filter(function (el) { return !el.disabled && el.getClientRects().length > 0; });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------------------------------------------------------------- 数学长廊 */
  function updateTimelineProgress() {
    var track = $("#timeline-track");
    var fill = $("#timeline-fill");
    if (!track || !fill) return;
    var r = track.getBoundingClientRect();
    var p = clamp((window.innerHeight * 0.66 - r.top) / Math.max(1, r.height), 0, 1);
    fill.style.height = (p * 100).toFixed(2) + "%";
  }

  /* ---------------------------------------------------------------- 名言轮播 */
  function initQuotes() {
    var shell = $("#quote-shell");
    var slides = $$(".quote-slide");
    var idxEl = $("#quote-index");
    if (!shell || !slides.length) return;
    var i = 0, timer = 0;

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle("is-active", j === i); });
      if (idxEl) idxEl.textContent = pad2(i + 1);
    }
    function start() {
      if (REDUCED) return;
      stop();
      timer = window.setInterval(function () { show(i + 1); }, 7200);
    }
    function stop() {
      if (timer) window.clearInterval(timer);
      timer = 0;
    }
    function reset() { stop(); start(); }

    var next = $("#quote-next");
    var prev = $("#quote-prev");
    if (next) next.addEventListener("click", function () { show(i + 1); reset(); });
    if (prev) prev.addEventListener("click", function () { show(i - 1); reset(); });

    shell.addEventListener("mouseenter", stop);
    shell.addEventListener("mouseleave", start);
    shell.addEventListener("focusin", stop);
    shell.addEventListener("focusout", start);

    show(0);
    start();
  }

  /* ---------------------------------------------------------------- 思考一刻 */
  function initThink() {
    var card = $("#think-card");
    var btn = $("#think-toggle");
    if (!card || !btn) return;
    btn.addEventListener("click", function () {
      var open = card.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "收起证明" : "展开证明";
    });
  }

  /* ---------------------------------------------------------------- Toast */
  var toastTimer = 0;
  function toast(msg) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove("is-show"); }, 2200);
  }

  /* ---------------------------------------------------------------- 数字计数 */
  function initCounts() {
    $$("[data-count]").forEach(function (el) {
      var target = Number(el.dataset.count);
      if (!isFinite(target)) return;
      var pad = Number(el.dataset.pad || 0);
      var fmt = function (v) {
        var s = String(Math.round(v));
        return pad ? s.padStart(pad, "0") : s;
      };
      if (REDUCED) { el.textContent = fmt(target); return; }
      var t0 = 0;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = clamp((ts - t0) / 1100, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e);
        if (p < 1) window.requestAnimationFrame(step);
        else el.textContent = fmt(target);
      }
      window.requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------- 画布工具 */
  function CanvasKit(canvas) {
    if (!canvas) return null;
    var ctx = canvas.getContext("2d");
    var w = 0, h = 0;
    return {
      canvas: canvas,
      ctx: ctx,
      get w() { return w; },
      get h() { return h; },
      resize: function () {
        var r = canvas.getBoundingClientRect();
        if (r.width < 20 || r.height < 20) return false;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = r.width;
        h = r.height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return true;
      },
      point: function (e) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }
    };
  }

  function line(ctx, x1, y1, x2, y2, color, width, dash) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    if (dash) ctx.setLineDash(dash);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function text(ctx, str, x, y, color, font) {
    ctx.fillStyle = color;
    ctx.font = font || ("10px " + MONO);
    ctx.fillText(str, x, y);
  }

  function glowDot(ctx, x, y, r, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function plotGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = "rgba(244,239,228,.055)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < 4; i++) {
      ctx.moveTo((w * i) / 4, 0);
      ctx.lineTo((w * i) / 4, h);
    }
    for (var j = 1; j < 4; j++) {
      ctx.moveTo(0, (h * j) / 4);
      ctx.lineTo(w, (h * j) / 4);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------------------------------------------------------- 实验一：单位圆 */
  function createTrigLab() {
    var kit = CanvasKit($("#lab-canvas-trig"));
    if (!kit) return null;
    var s = { theta: Math.PI / 4, A: 1, W: 1, auto: false, drag: false, raf: 0, last: 0 };
    var elTheta = $("#trig-theta");
    var outTheta = $("#trig-theta-out");
    var elA = $("#trig-a");
    var outA = $("#trig-a-out");
    var elW = $("#trig-w");
    var outW = $("#trig-w-out");
    var outSin = $("#trig-sin");
    var outCos = $("#trig-cos");
    var outPeriod = $("#trig-period");
    var btnAuto = $("#trig-auto");
    var btnReset = $("#trig-reset");

    function geometry() {
      var w = kit.w, h = kit.h;
      var R = Math.min(w * 0.155, h * 0.31);
      return {
        cx: w * 0.235,
        cy: h * 0.52,
        R: R,
        x0: w * 0.5,
        x1: w * 0.95
      };
    }

    function sync() {
      var deg = Math.round((s.theta * 180) / Math.PI);
      if (elTheta) elTheta.value = String(deg);
      if (outTheta) outTheta.textContent = deg + "°";
      if (elA) elA.value = String(s.A);
      if (outA) outA.textContent = s.A.toFixed(2);
      if (elW) elW.value = String(s.W);
      if (outW) outW.textContent = s.W.toFixed(2);
      if (outSin) outSin.textContent = Math.sin(s.theta).toFixed(3);
      if (outCos) outCos.textContent = Math.cos(s.theta).toFixed(3);
      if (outPeriod) outPeriod.textContent = ((Math.PI * 2) / s.W).toFixed(2);
    }

    function draw() {
      var w = kit.w, h = kit.h;
      if (!w || !h) return;
      var ctx = kit.ctx;
      var g = geometry();
      var cx = g.cx, cy = g.cy, R = g.R;
      var px = cx + R * Math.cos(s.theta);
      var py = cy - R * Math.sin(s.theta);
      var amp = R * 0.72 * s.A;

      ctx.clearRect(0, 0, w, h);
      plotGrid(ctx, w, h);

      /* 单位圆 */
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(216,184,120,.26)";
      ctx.lineWidth = 1;
      ctx.stroke();

      line(ctx, cx - R * 1.16, cy, cx + R * 1.16, cy, "rgba(244,239,228,.16)");
      line(ctx, cx, cy - R * 1.16, cx, cy + R * 1.16, "rgba(244,239,228,.16)");

      text(ctx, "O", cx - 12, cy + 14, "rgba(244,239,228,.35)", "9px " + MONO);
      text(ctx, "1", cx + R + 6, cy + 12, "rgba(244,239,228,.28)", "8px " + MONO);
      text(ctx, "−1", cx - R - 20, cy + 12, "rgba(244,239,228,.28)", "8px " + MONO);

      /* 角 */
      if (s.theta > 0.01) {
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, -s.theta, true);
        ctx.strokeStyle = "rgba(216,184,120,.55)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      /* 投影 */
      line(ctx, px, py, px, cy, "rgba(127,216,255,.3)", 1, [3, 4]);
      line(ctx, px, py, cx, py, "rgba(164,140,255,.3)", 1, [3, 4]);
      line(ctx, cx, cy, px, py, "rgba(216,184,120,.85)", 1.2);

      /* sin / cos 标注 */
      text(ctx, "sin θ", px + 7, (py + cy) / 2, "rgba(127,216,255,.62)", "8.5px " + MONO);
      text(ctx, "cos θ", (px + cx) / 2 - 12, cy + 15, "rgba(164,140,255,.62)", "8.5px " + MONO);

      glowDot(ctx, px, py, 3.6, "#f0d9a8");

      /* 正弦曲线 */
      var x0 = g.x0, x1 = g.x1;
      line(ctx, x0 - 8, cy, x1 + 8, cy, "rgba(244,239,228,.16)");
      text(ctx, "0", x0 - 3, cy + 15, "rgba(244,239,228,.3)", "8px " + MONO);
      text(ctx, "4π", x1 - 8, cy + 15, "rgba(244,239,228,.3)", "8px " + MONO);
      text(ctx, "y = A sin(ωθ)", x0, 20, "rgba(216,184,120,.55)", "9px " + MONO);

      ctx.beginPath();
      var steps = 260;
      for (var i = 0; i <= steps; i++) {
        var th = (Math.PI * 4 * i) / steps;
        var x = x0 + ((x1 - x0) * i) / steps;
        var y = cy - Math.sin(s.W * th) * amp;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.save();
      ctx.shadowColor = "rgba(216,184,120,.38)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(216,184,120,.94)";
      ctx.lineWidth = 1.7;
      ctx.stroke();
      ctx.restore();

      var wx = x0 + ((x1 - x0) * s.theta) / (Math.PI * 4);
      var wy = cy - Math.sin(s.W * s.theta) * amp;
      line(ctx, wx, cy, wx, wy, "rgba(127,216,255,.32)", 1, [3, 4]);
      glowDot(ctx, wx, wy, 3.2, "#7fd8ff");
    }

    function updateFromPointer(e) {
      var p = kit.point(e);
      var g = geometry();
      var ang = Math.atan2(g.cy - p.y, p.x - g.cx);
      if (ang < 0) ang += Math.PI * 2;
      s.theta = ang;
      sync();
      draw();
    }

    function tick(ts) {
      if (!s.auto) return;
      if (!s.last) s.last = ts;
      var dt = Math.min(48, ts - s.last);
      s.last = ts;
      s.theta = (s.theta + dt * 0.00125) % (Math.PI * 2);
      sync();
      draw();
      s.raf = window.requestAnimationFrame(tick);
    }

    function setAuto(on) {
      s.auto = on;
      if (btnAuto) {
        btnAuto.classList.toggle("is-on", on);
        btnAuto.setAttribute("aria-pressed", String(on));
        btnAuto.textContent = on ? "暂停" : "自动播放";
      }
      window.cancelAnimationFrame(s.raf);
      if (on) {
        s.last = 0;
        s.raf = window.requestAnimationFrame(tick);
      }
    }

    if (elTheta) elTheta.addEventListener("input", function () {
      s.theta = (Number(elTheta.value) * Math.PI) / 180;
      sync(); draw();
    });
    if (elA) elA.addEventListener("input", function () {
      s.A = Number(elA.value); sync(); draw();
    });
    if (elW) elW.addEventListener("input", function () {
      s.W = Number(elW.value); sync(); draw();
    });
    if (btnAuto) btnAuto.addEventListener("click", function () { setAuto(!s.auto); });
    if (btnReset) btnReset.addEventListener("click", function () {
      setAuto(false);
      s.theta = Math.PI / 4; s.A = 1; s.W = 1;
      sync(); draw();
    });

    kit.canvas.addEventListener("pointerdown", function (e) {
      s.drag = true;
      kit.canvas.setPointerCapture(e.pointerId);
      updateFromPointer(e);
    });
    kit.canvas.addEventListener("pointermove", function (e) {
      if (s.drag) updateFromPointer(e);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      kit.canvas.addEventListener(ev, function () { s.drag = false; });
    });
    kit.canvas.addEventListener("pointerdown", function (e) { e.preventDefault(); });

    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (kit.resize()) draw();
      }).observe(kit.canvas.parentElement);
    }

    return {
      show: function () { if (kit.resize()) { sync(); draw(); } },
      stop: function () { setAuto(false); },
      draw: draw
    };
  }

  /* ---------------------------------------------------------------- 实验二：割线切线 */
  function createDerivLab() {
    var kit = CanvasKit($("#lab-canvas-deriv"));
    if (!kit) return null;
    var s = { a: 0.6, h: 1, drag: false };
    var elA = $("#deriv-a");
    var outA = $("#deriv-a-out");
    var elH = $("#deriv-h");
    var outH = $("#deriv-h-out");
    var outK = $("#deriv-k");
    var outTan = $("#deriv-tan");
    var btnSnap = $("#deriv-snap");
    var btnReset = $("#deriv-reset");

    var XMIN = -2.2, XMAX = 2.2, YMIN = -2.2, YMAX = 2.2;
    function f(x) { return (x * x * x) / 3 - x; }

    function geo() {
      var w = kit.w, h = kit.h;
      var padL = 42, padR = 22, padT = 24, padB = 32;
      var pw = w - padL - padR;
      var ph = h - padT - padB;
      return {
        padL: padL, padR: padR, padT: padT, padB: padB, pw: pw, ph: ph,
        sx: function (x) { return padL + ((x - XMIN) / (XMAX - XMIN)) * pw; },
        sy: function (y) { return padT + ((YMAX - y) / (YMAX - YMIN)) * ph; }
      };
    }

    function sync() {
      if (elA) elA.value = String(s.a);
      if (outA) outA.textContent = s.a.toFixed(2);
      if (elH) elH.value = String(s.h);
      if (outH) outH.textContent = s.h.toFixed(2);
    }

    function draw() {
      var w = kit.w, h = kit.h;
      if (!w || !h) return;
      var ctx = kit.ctx;
      var g = geo();
      var a = s.a;
      var b = a + s.h;
      var hh = s.h;
      var bVisible = b <= XMAX;
      var fa = f(a);
      var fb = f(b);
      var k = hh > 0.0001 ? (fb - fa) / hh : a * a - 1;
      var kt = a * a - 1;

      ctx.clearRect(0, 0, w, h);
      plotGrid(ctx, w, h);

      /* 网格与坐标轴 */
      for (var gx = -2; gx <= 2; gx++) {
        if (gx === 0) continue;
        line(ctx, g.sx(gx), g.padT, g.sx(gx), g.padT + g.ph, "rgba(244,239,228,.05)");
        text(ctx, String(gx), g.sx(gx) - 4, g.sy(0) + 15, "rgba(244,239,228,.26)", "8px " + MONO);
      }
      for (var gy = -2; gy <= 2; gy++) {
        if (gy === 0) continue;
        line(ctx, g.padL, g.sy(gy), g.padL + g.pw, g.sy(gy), "rgba(244,239,228,.05)");
        text(ctx, String(gy), g.padL - 18, g.sy(gy) + 3, "rgba(244,239,228,.26)", "8px " + MONO);
      }
      line(ctx, g.padL, g.sy(0), g.padL + g.pw, g.sy(0), "rgba(244,239,228,.2)");
      line(ctx, g.sx(0), g.padT, g.sx(0), g.padT + g.ph, "rgba(244,239,228,.2)");
      text(ctx, "x", g.padL + g.pw - 4, g.sy(0) - 8, "rgba(244,239,228,.35)", "9px " + MONO);
      text(ctx, "y", g.sx(0) + 8, g.padT + 10, "rgba(244,239,228,.35)", "9px " + MONO);

      /* 曲线 */
      ctx.save();
      ctx.beginPath();
      for (var i = 0; i <= 400; i++) {
        var x = XMIN + ((XMAX - XMIN) * i) / 400;
        var y = f(x);
        if (i === 0) ctx.moveTo(g.sx(x), g.sy(y));
        else ctx.lineTo(g.sx(x), g.sy(y));
      }
      ctx.strokeStyle = "rgba(242,237,227,.72)";
      ctx.lineWidth = 1.6;
      ctx.shadowColor = "rgba(242,237,227,.22)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(g.padL, g.padT, g.pw, g.ph);
      ctx.clip();

      /* 割线 */
      if (hh > 0.001) {
        var yA1 = fa + k * (XMIN - a);
        var yA2 = fa + k * (XMAX - a);
        line(ctx, g.sx(XMIN), g.sy(yA1), g.sx(XMAX), g.sy(yA2), "rgba(127,216,255,.75)", 1.3, [5, 5]);
      }

      /* 切线 */
      var t1 = fa + kt * (XMIN - a);
      var t2 = fa + kt * (XMAX - a);
      line(ctx, g.sx(XMIN), g.sy(t1), g.sx(XMAX), g.sy(t2), "rgba(216,184,120,.85)", 1.4);

      /* 增量三角形 */
      if (hh > 0.001 && bVisible) {
        line(ctx, g.sx(a), g.sy(fa), g.sx(b), g.sy(fa), "rgba(244,239,228,.18)", 1, [2, 5]);
        line(ctx, g.sx(b), g.sy(fa), g.sx(b), g.sy(fb), "rgba(244,239,228,.18)", 1, [2, 5]);
        text(ctx, "h", (g.sx(a) + g.sx(b)) / 2 - 4, g.sy(fa) + 15, "rgba(244,239,228,.38)", "8.5px " + MONO);
      }

      ctx.restore();

      /* 点 */
      glowDot(ctx, g.sx(a), g.sy(fa), 3.8, "#f0d9a8");
      text(ctx, "A", g.sx(a) - 16, g.sy(fa) - 10, "rgba(240,217,168,.9)", "10px " + MONO);
      if (hh > 0.001 && bVisible) {
        glowDot(ctx, g.sx(b), g.sy(fb), 3.4, "#7fd8ff");
        text(ctx, "B", g.sx(b) + 9, g.sy(fb) - 9, "rgba(127,216,255,.9)", "10px " + MONO);
      }

      /* 标注 */
      ctx.save();
      text(ctx, "y = x³/3 − x", g.padL + 4, g.padT + 14, "rgba(244,239,228,.4)", "9px " + MONO);
      ctx.restore();

      if (outK) outK.textContent = k.toFixed(3);
      if (outTan) outTan.textContent = kt.toFixed(3);
    }

    function updateFromPointer(e) {
      var p = kit.point(e);
      var g = geo();
      var x = XMIN + ((p.x - g.padL) / g.pw) * (XMAX - XMIN);
      s.a = clamp(x, -1.9, 1.9);
      sync(); draw();
    }

    if (elA) elA.addEventListener("input", function () { s.a = Number(elA.value); sync(); draw(); });
    if (elH) elH.addEventListener("input", function () { s.h = Number(elH.value); sync(); draw(); });
    if (btnReset) btnReset.addEventListener("click", function () { s.a = 0.6; s.h = 1; sync(); draw(); });
    if (btnSnap) btnSnap.addEventListener("click", function () {
      var from = s.h;
      var t0 = 0;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = clamp((ts - t0) / 720, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        s.h = from + (0.02 - from) * e;
        sync(); draw();
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });

    kit.canvas.addEventListener("pointerdown", function (e) {
      s.drag = true;
      kit.canvas.setPointerCapture(e.pointerId);
      updateFromPointer(e);
    });
    kit.canvas.addEventListener("pointermove", function (e) { if (s.drag) updateFromPointer(e); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      kit.canvas.addEventListener(ev, function () { s.drag = false; });
    });
    kit.canvas.addEventListener("pointerdown", function (e) { e.preventDefault(); });

    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (kit.resize()) draw();
      }).observe(kit.canvas.parentElement);
    }

    return {
      show: function () { if (kit.resize()) { sync(); draw(); } },
      stop: function () {},
      draw: draw
    };
  }

  /* ---------------------------------------------------------------- 实验三：蒙特卡洛 */
  function createMonteLab() {
    var kit = CanvasKit($("#lab-canvas-monte"));
    if (!kit) return null;
    var MAX = 30000;
    var s = { points: [], hits: 0, auto: false, raf: 0, seeded: false, frame: 0 };
    var outN = $("#monte-n");
    var outHit = $("#monte-hit");
    var outPi = $("#monte-pi");
    var outErr = $("#monte-err");
    var btnRun = $("#monte-run");
    var btnReset = $("#monte-reset");

    function rect() {
      var w = kit.w, h = kit.h;
      var size = Math.min(w, h) - 48;
      return { x: (w - size) / 2, y: (h - size) / 2, size: size };
    }

    function drawBase() {
      var w = kit.w, h = kit.h;
      if (!w || !h) return;
      var ctx = kit.ctx;
      var r = rect();
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255,255,255,.012)";
      ctx.fillRect(r.x, r.y, r.size, r.size);

      /* 四分之一网格 */
      ctx.save();
      ctx.strokeStyle = "rgba(244,239,228,.06)";
      ctx.lineWidth = 1;
      for (var i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(r.x + (r.size * i) / 4, r.y);
        ctx.lineTo(r.x + (r.size * i) / 4, r.y + r.size);
        ctx.moveTo(r.x, r.y + (r.size * i) / 4);
        ctx.lineTo(r.x + r.size, r.y + (r.size * i) / 4);
        ctx.stroke();
      }
      ctx.restore();

      /* 方框 */
      ctx.strokeStyle = "rgba(244,239,228,.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.size, r.size);

      /* 四分之一圆 */
      ctx.beginPath();
      ctx.arc(r.x, r.y + r.size, r.size, -Math.PI / 2, 0);
      ctx.strokeStyle = "rgba(216,184,120,.55)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      /* 半径 */
      line(ctx, r.x, r.y + r.size, r.x + r.size, r.y + r.size, "rgba(216,184,120,.28)");
      line(ctx, r.x, r.y + r.size, r.x, r.y, "rgba(216,184,120,.28)");

      text(ctx, "O", r.x - 14, r.y + r.size + 14, "rgba(244,239,228,.32)", "8.5px " + MONO);
      text(ctx, "1", r.x + r.size + 5, r.y + r.size + 12, "rgba(244,239,228,.32)", "8.5px " + MONO);
      text(ctx, "1", r.x - 12, r.y - 4, "rgba(244,239,228,.32)", "8.5px " + MONO);
      text(ctx, "S = π/4", r.x + 6, r.y + 16, "rgba(216,184,120,.55)", "9px " + MONO);
    }

    function paint(x, y, hit) {
      var ctx = kit.ctx;
      var r = rect();
      var px = r.x + x * r.size;
      var py = r.y + (1 - y) * r.size;
      ctx.beginPath();
      ctx.arc(px, py, 1.35, 0, Math.PI * 2);
      ctx.fillStyle = hit ? "rgba(240,217,168,.72)" : "rgba(127,216,255,.42)";
      ctx.fill();
    }

    function addPoint(x, y) {
      if (s.points.length >= MAX) return false;
      var hit = x * x + y * y <= 1;
      s.points.push([x, y]);
      if (hit) s.hits++;
      paint(x, y, hit);
      return true;
    }

    function updateStats() {
      var n = s.points.length;
      var est = n ? (s.hits / n) * 4 : 0;
      if (outN) outN.textContent = n.toLocaleString("en-US");
      if (outHit) outHit.textContent = s.hits.toLocaleString("en-US");
      if (outPi) outPi.textContent = n ? est.toFixed(5) : "—";
      if (outErr) outErr.textContent = n ? "±" + Math.abs(est - Math.PI).toFixed(5) : "—";
    }

    function renderAll() {
      drawBase();
      for (var i = 0; i < s.points.length; i++) {
        var p = s.points[i];
        paint(p[0], p[1], p[0] * p[0] + p[1] * p[1] <= 1);
      }
      updateStats();
    }

    function seed() {
      for (var i = 0; i < 600; i++) addPoint(Math.random(), Math.random());
      s.seeded = true;
      updateStats();
    }

    function tick(ts) {
      if (!s.auto) return;
      s.frame++;
      var added = 0;
      for (var i = 0; i < 42; i++) {
        if (!addPoint(Math.random(), Math.random())) break;
        added++;
      }
      if (s.frame % 4 === 0) updateStats();
      if (!added || s.points.length >= MAX) {
        setAuto(false);
        updateStats();
        if (s.points.length >= MAX) toast("已达 3 万点上限 · 重置后可继续");
        return;
      }
      s.raf = window.requestAnimationFrame(tick);
    }

    function setAuto(on) {
      s.auto = on;
      if (btnRun) {
        btnRun.classList.toggle("is-on", on);
        btnRun.setAttribute("aria-pressed", String(on));
        btnRun.textContent = on ? "暂停投点" : "开始投点";
      }
      window.cancelAnimationFrame(s.raf);
      if (on) {
        if (s.points.length >= MAX) { toast("已达 3 万点上限 · 请先重置"); setAuto(false); return; }
        s.raf = window.requestAnimationFrame(tick);
      }
    }

    if (btnRun) btnRun.addEventListener("click", function () { setAuto(!s.auto); });
    if (btnReset) btnReset.addEventListener("click", function () {
      setAuto(false);
      s.points = [];
      s.hits = 0;
      s.seeded = true;
      drawBase();
      updateStats();
    });

    kit.canvas.addEventListener("pointerdown", function (e) {
      var p = kit.point(e);
      var r = rect();
      if (p.x < r.x || p.x > r.x + r.size || p.y < r.y || p.y > r.y + r.size) return;
      var x = (p.x - r.x) / r.size;
      var y = 1 - (p.y - r.y) / r.size;
      addPoint(x, y);
      updateStats();
    });

    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (kit.resize()) renderAll();
      }).observe(kit.canvas.parentElement);
    }

    return {
      show: function () {
        if (!kit.resize()) return;
        if (!s.seeded) seed();
        renderAll();
      },
      stop: function () { setAuto(false); },
      draw: renderAll
    };
  }

  /* ---------------------------------------------------------------- 实验四：黄金螺旋 */
  function createGoldenLab() {
    var kit = CanvasKit($("#lab-canvas-golden"));
    if (!kit) return null;
    var s = { n: 8 };
    var elN = $("#golden-n");
    var outN = $("#golden-n-out");
    var outFn = $("#golden-fn");
    var outRatio = $("#golden-ratio");

    function build(n) {
      var fib = [1, 1];
      for (var i = 2; i < 22; i++) fib.push(fib[i - 1] + fib[i - 2]);
      var squares = [
        { x: 0, y: 0, s: 1, side: -1 },
        { x: 1, y: 0, s: 1, side: -1 }
      ];
      var x1 = 0, y1 = 0, x2 = 2, y2 = 1;
      for (var k = 2; k < n; k++) {
        var side = (k - 2) % 4;
        var sz = fib[k];
        var sq;
        if (side === 0) { sq = { x: x1, y: y2, s: sz, side: 0 }; y2 += sz; }
        else if (side === 1) { sq = { x: x1 - sz, y: y1, s: sz, side: 1 }; x1 -= sz; }
        else if (side === 2) { sq = { x: x1, y: y1 - sz, s: sz, side: 2 }; y1 -= sz; }
        else { sq = { x: x2, y: y1, s: sz, side: 3 }; x2 += sz; }
        squares.push(sq);
      }
      return { fib: fib, squares: squares, x1: x1, y1: y1, x2: x2, y2: y2 };
    }

    function draw() {
      var w = kit.w, h = kit.h;
      if (!w || !h) return;
      var ctx = kit.ctx;
      var data = build(s.n);
      var bw = data.x2 - data.x1;
      var bh = data.y2 - data.y1;
      var pad = 34;
      var scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
      var ox = (w - bw * scale) / 2 - data.x1 * scale;
      var oy = (h - bh * scale) / 2 + data.y2 * scale;
      function sx(x) { return ox + x * scale; }
      function sy(y) { return oy - y * scale; }

      ctx.clearRect(0, 0, w, h);
      plotGrid(ctx, w, h);

      /* 正方形 */
      data.squares.forEach(function (sq, idx) {
        ctx.fillStyle = idx % 2 ? "rgba(255,255,255,.018)" : "rgba(216,184,120,.022)";
        ctx.fillRect(sx(sq.x), sy(sq.y + sq.s), sq.s * scale, sq.s * scale);
        ctx.strokeStyle = "rgba(216,184,120,.22)";
        ctx.lineWidth = 1;
        ctx.strokeRect(sx(sq.x), sy(sq.y + sq.s), sq.s * scale, sq.s * scale);

        if (sq.s * scale > 40) {
          ctx.save();
          ctx.fillStyle = "rgba(244,239,228,.22)";
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillText(String(sq.s), sx(sq.x + sq.s / 2), sy(sq.y + sq.s / 2) + 3);
          ctx.restore();
        }
      });

      /* 四分之一圆弧 */
      var lastEnd = null;
      ctx.save();
      ctx.strokeStyle = "rgba(240,217,168,.95)";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "rgba(216,184,120,.55)";
      ctx.shadowBlur = 10;

      for (var k = 2; k < data.squares.length; k++) {
        var sq = data.squares[k];
        var side = sq.side;
        var C, S, E;
        if (side === 0) { C = [sq.x, sq.y]; S = [sq.x + sq.s, sq.y]; E = [sq.x, sq.y + sq.s]; }
        else if (side === 1) { C = [sq.x + sq.s, sq.y]; S = [sq.x + sq.s, sq.y + sq.s]; E = [sq.x, sq.y]; }
        else if (side === 2) { C = [sq.x + sq.s, sq.y + sq.s]; S = [sq.x, sq.y + sq.s]; E = [sq.x + sq.s, sq.y]; }
        else { C = [sq.x, sq.y + sq.s]; S = [sq.x, sq.y]; E = [sq.x + sq.s, sq.y + sq.s]; }

        var cx = sx(C[0]), cy = sy(C[1]);
        var aS = Math.atan2(sy(S[1]) - cy, sx(S[0]) - cx);
        var aE = Math.atan2(sy(E[1]) - cy, sx(E[0]) - cx);
        var d = aE - aS;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;

        ctx.beginPath();
        ctx.arc(cx, cy, sq.s * scale, aS, aS + d, d < 0);
        ctx.stroke();
        lastEnd = [sx(E[0]), sy(E[1])];
      }
      ctx.restore();

      if (lastEnd) glowDot(ctx, lastEnd[0], lastEnd[1], 3, "#f0d9a8");

      if (outN) outN.textContent = String(s.n);
      if (outFn) outFn.textContent = String(data.fib[s.n - 1]);
      if (outRatio) outRatio.textContent = (data.fib[s.n] / data.fib[s.n - 1]).toFixed(4);
    }

    function sync() {
      if (elN) elN.value = String(s.n);
      if (outN) outN.textContent = String(s.n);
      draw();
    }

    if (elN) elN.addEventListener("input", function () {
      s.n = Number(elN.value);
      sync();
    });

    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (kit.resize()) draw();
      }).observe(kit.canvas.parentElement);
    }

    return {
      show: function () { if (kit.resize()) sync(); },
      stop: function () {},
      draw: draw
    };
  }

  /* ---------------------------------------------------------------- 实验调度 */
  var labRegistry = {};
  var activeLabId = "trig";

  function activateLab(id, shouldScroll) {
    var lab = labRegistry[id];
    if (!lab) return;
    activeLabId = id;

    $$(".lab-tab").forEach(function (t) {
      var on = t.dataset.lab === id;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.setAttribute("tabindex", on ? "0" : "-1");
    });
    $$(".lab-panel").forEach(function (p) {
      var on = p.id === "lab-panel-" + id;
      p.hidden = !on;
      p.classList.toggle("is-active", on);
    });

    Object.keys(labRegistry).forEach(function (k) {
      if (k !== id && labRegistry[k]) labRegistry[k].stop();
    });

    window.requestAnimationFrame(function () { lab.show(); });

    if (shouldScroll) {
      var sec = $("#lab");
      if (sec) sec.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    }
  }

  function initLabs() {
    labRegistry.trig = createTrigLab();
    labRegistry.deriv = createDerivLab();
    labRegistry.monte = createMonteLab();
    labRegistry.golden = createGoldenLab();

    var tabs = $$(".lab-tab");
    tabs.forEach(function (tab) {
      tab.setAttribute("tabindex", tab.classList.contains("is-active") ? "0" : "-1");
      tab.addEventListener("click", function () { activateLab(tab.dataset.lab); });
      tab.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
        var ids = tabs.map(function (t) { return t.dataset.lab; });
        var i = ids.indexOf(tab.dataset.lab);
        if (e.key === "ArrowRight") i = (i + 1) % ids.length;
        if (e.key === "ArrowLeft") i = (i - 1 + ids.length) % ids.length;
        if (e.key === "Home") i = 0;
        if (e.key === "End") i = ids.length - 1;
        e.preventDefault();
        activateLab(ids[i]);
        tabs[i].focus();
      });
    });

    window.requestAnimationFrame(function () {
      if (labRegistry.trig) labRegistry.trig.show();
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        var lab = labRegistry[activeLabId];
        if (lab) lab.show();
      });
    }

    var rt = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(function () {
        var lab = labRegistry[activeLabId];
        if (lab) lab.show();
      }, 160);
    });
  }

  /* ---------------------------------------------------------------- 启动 */
  function setContentCounts() {
    var counts = $$(".hero-stats strong[data-count]");
    if (counts[0]) counts[0].dataset.count = String(MODULES.length);
    if (counts[1]) counts[1].dataset.count = String(COURSES.length);
    var total = $("#progress-total");
    if (total) total.textContent = COURSES.length;
  }

  function init() {
    setContentCounts();
    initStarfield();
    initCursor();
    initChrome();
    initMenu();
    initReveal();
    initHero();
    initGalaxy();
    renderLibrary();
    initCardEvents();
    initModal();
    initQuotes();
    initThink();
    initLabs();
    initCounts();

    $$("[data-goto-module]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        openCourse(a.dataset.gotoModule);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
