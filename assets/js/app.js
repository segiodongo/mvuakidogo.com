/**
 * app.js — persistent shell for the site.
 *
 * Loaded once in <head> on every page (before gallery.js). It provides:
 *   1. AudioService — a single <audio> element + Web Audio analyser that lives
 *      outside the swappable content, so music keeps playing across sections.
 *   2. A lightweight client-side router (pjax) that swaps the #app region
 *      without a full page reload, so the audio element is never destroyed.
 *   3. MvuaApp.onKey / onCleanup — per-navigation lifecycle hooks so section
 *      code can register keyboard handlers and teardown without leaking.
 *
 * Each page stays a valid standalone document: on first load the page's own
 * inline init runs normally; the router only takes over on in-site navigation.
 */
(function () {
  "use strict";

  // ── Site base (absolute), derived from this script's own URL ──────────────
  const meScript =
    document.currentScript ||
    [...document.scripts].find((s) => /\/app\.js(\?|$)/.test(s.src));
  const SITE_BASE = meScript
    ? meScript.src.replace(/assets\/js\/app\.js.*$/, "")
    : location.href.replace(/[^/]*$/, "");

  // ── Lifecycle registry (cleared before each navigation) ───────────────────
  const MvuaApp = {
    SITE_BASE,
    _cleanups: [],
    _keyHandlers: [],
    onCleanup(fn) { this._cleanups.push(fn); },
    onKey(fn) {
      this._keyHandlers.push(fn);
      this.onCleanup(() => {
        this._keyHandlers = this._keyHandlers.filter((h) => h !== fn);
      });
    },
    cleanup() {
      this._cleanups.forEach((f) => { try { f(); } catch (e) {} });
      this._cleanups = [];
    },
  };
  window.MvuaApp = MvuaApp;
  window.addEventListener("keydown", (e) => {
    MvuaApp._keyHandlers.slice().forEach((h) => { try { h(e); } catch (err) {} });
  });

  // ── AudioService — persistent music player (self-hosted audio) ────────────
  const AudioService = (function () {
    let el = null, ctx = null, analyser = null, freq = null, srcNode = null;
    let queue = [], index = -1, mediaBase = "";

    function emit(type) {
      window.dispatchEvent(new CustomEvent("mvua:audio", { detail: { type } }));
    }
    function ensureEl() {
      if (el) return el;
      el = document.createElement("audio");
      el.id = "mvua-audio";
      el.crossOrigin = "anonymous";
      el.preload = "metadata";
      el.style.display = "none";
      document.body.appendChild(el);
      el.addEventListener("timeupdate", () => emit("progress"));
      el.addEventListener("play", () => emit("state"));
      el.addEventListener("pause", () => emit("state"));
      el.addEventListener("ended", () => {
        if (index >= 0 && index < queue.length - 1) playIndex(index + 1);
        else emit("state");
      });
      return el;
    }
    function ensureCtx() {
      if (ctx) return;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        srcNode = ctx.createMediaElementSource(el);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        freq = new Uint8Array(analyser.frequencyBinCount);
        srcNode.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) { analyser = null; }
    }
    function resolve(src) {
      if (!src) return src;
      if (/^https?:/.test(src)) return src;
      if (!mediaBase) return src;
      return mediaBase.replace(/\/$/, "") + "/" + src.replace(/^\//, "");
    }
    function resume() {
      ensureCtx();
      if (ctx && ctx.state === "suspended") ctx.resume();
    }
    function playIndex(i) {
      const t = queue[i];
      if (!t || !t.src) return;
      ensureEl();
      index = i;
      el.src = resolve(t.src);
      resume();
      el.play().catch(() => {});
      emit("track");
    }

    return {
      get current() { return queue[index] || null; },
      get index() { return index; },
      get length() { return queue.length; },
      setMediaBase(b) { mediaBase = b || ""; },
      playQueue(tracks, i, base) {
        if (base != null) mediaBase = base;
        queue = tracks || [];
        playIndex(i);
      },
      play() { if (el) { resume(); el.play().catch(() => {}); } },
      pause() { if (el) el.pause(); },
      toggle() { if (el) (el.paused ? this.play() : this.pause()); },
      isPlaying() { return !!el && !el.paused; },
      next() { if (index < queue.length - 1) playIndex(index + 1); },
      prev() { if (index > 0) playIndex(index - 1); },
      seek(d) { if (el && el.duration) el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + d)); },
      position() { return el ? { pos: el.currentTime || 0, dur: el.duration || 0 } : { pos: 0, dur: 0 }; },
      getFreq() { if (analyser) { analyser.getByteFrequencyData(freq); return freq; } return null; },
      // Called when another media source (e.g. a film) starts — pause the music.
      pauseForExternal() { this.pause(); },
    };
  })();
  window.AudioService = AudioService;

  // ── Router (pjax) ─────────────────────────────────────────────────────────
  function isInternal(a) {
    if (!a || !a.href) return false;
    if (a.target === "_blank" || a.hasAttribute("download")) return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (!url.href.startsWith(SITE_BASE)) return false;
    // Only route HTML routes (directories or .html), not media/assets
    const path = url.pathname;
    return path.endsWith("/") || path.endsWith(".html");
  }

  async function navigate(url, push) {
    let html;
    try {
      const res = await fetch(url, { headers: { "X-Pjax": "1" } });
      if (!res.ok) throw new Error(res.status);
      html = await res.text();
    } catch (e) {
      location.href = url; // fall back to a real navigation
      return;
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    const newApp = doc.querySelector("#app");
    const cur = document.querySelector("#app");
    if (!newApp || !cur) { location.href = url; return; }

    MvuaApp.cleanup();
    if (push) history.pushState({}, "", url);

    document.title = doc.title || document.title;
    document.body.className = doc.body.className;

    const imported = document.importNode(newApp, true);
    cur.replaceWith(imported);
    window.scrollTo(0, 0);

    // Execute inline scripts inside the new #app (functions already loaded in <head>)
    imported.querySelectorAll("script").forEach((old) => {
      if (old.src) return; // external libs live in <head>; never re-run here
      const s = document.createElement("script");
      s.textContent = old.textContent;
      document.body.appendChild(s);
      s.remove();
    });
  }

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a");
    if (!a || !isInternal(a)) return;
    e.preventDefault();
    const url = new URL(a.href, location.href).href;
    if (url === location.href) return;
    navigate(url, true);
  });

  window.addEventListener("popstate", () => navigate(location.href, false));
})();
