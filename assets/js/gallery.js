/**
 * gallery.js
 * Shared script for photography, film, writing, and audio index pages.
 * Called with: initGallery({ section: "photography", contentPath: "../content.json" })
 */

function initGallery({ section, contentPath }) {
  fetch(contentPath)
    .then((r) => r.json())
    .then((data) => {
      document.title = `${section.charAt(0).toUpperCase() + section.slice(1)} — ${data.site.name}`;

      const media = (path) => mediaUrl(data.mediaBase, path);
      const entries = data[section] || [];

      if (section === "photography") renderPhotography(entries, media);
      if (section === "film")        renderFilm(entries, media);
      if (section === "writing")     renderWriting(entries);
      if (section === "audio")       renderAudio(entries, media);
    });
}

// ── Media URL helper ──────────────────────────────────────────────────────────

function mediaUrl(base, path) {
  if (!path) return path;
  if (path.startsWith("http")) return path;   // already absolute (embed URLs, etc.)
  if (!base) return path;                      // no base set — local dev, use path as-is
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

// ── Photography (old-windows-ui aesthetic) ────────────────────────────────────

function renderPhotography(projects, media) {
  const area = document.getElementById("desktop-area");
  const params = new URLSearchParams(location.search);
  const projectId = params.get("project");

  if (projectId) {
    const project = projects.find((p) => p.id === projectId);
    renderSeriesView(area, project, media);
  } else {
    renderSeriesGrid(area, projects, media);
  }
}

// When an image 404s or fails to decode, swap in the placeholder icon
function handleImgError(img) {
  const well = img.closest(".img-placeholder");
  if (well) well.innerHTML = imagePlaceholderSVG();
}
window.handleImgError = handleImgError;

// Small pixel "image" icon used for blank placeholders
function imagePlaceholderSVG() {
  return `<svg class="ph-icon" viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
    <rect x="2" y="2" width="44" height="44" fill="#fff" stroke="#808080"/>
    <rect x="2" y="2" width="44" height="10" fill="#000080"/>
    <circle cx="13" cy="22" r="4" fill="#ffd23f"/>
    <path d="M4 44 L18 28 L26 36 L34 24 L44 44 Z" fill="#3a7d3a"/>
  </svg>`;
}

// Reusable window-chrome title bar (icon + title + min/max/close buttons)
function winTitleBar(title, { iconSVG = null } = {}) {
  return `
    <div class="win-titlebar">
      ${iconSVG ? `<span class="win-titlebar-icon">${iconSVG}</span>` : ""}
      <span class="win-titlebar-text">${title}</span>
      <span class="win-titlebar-buttons">
        <span class="win-btn" aria-hidden="true">_</span>
        <span class="win-btn" aria-hidden="true">□</span>
        <span class="win-btn" aria-hidden="true">✕</span>
      </span>
    </div>`;
}

const FOLDER_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 4h5l1 1h8v8H1z" fill="#ffd23f" stroke="#000"/><path d="M1 4h5l1 1h8" fill="none" stroke="#000"/></svg>`;

// ── Main grid: one window per series, 5 per row ───────────────────────────────

function renderSeriesGrid(area, projects, media) {
  const grid = document.createElement("div");
  grid.className = "series-grid";

  projects.forEach((project) => {
    const card = document.createElement("a");
    card.className = "win-window series-window";
    card.href = `?project=${project.id}`;

    const count = (project.photos || []).length;
    // Thumbnail priority: explicit thumb → cover → first photo's src → placeholder
    const firstPhoto = (project.photos || []).find((p) => p.src);
    const thumb = media(project.thumb || project.cover || (firstPhoto && firstPhoto.src) || "");
    const meta = [project.year, count ? `${count} photo${count === 1 ? "" : "s"}` : null]
      .filter(Boolean)
      .join(" · ");

    card.innerHTML = `
      ${winTitleBar(project.title, { iconSVG: FOLDER_ICON })}
      <div class="win-body">
        <div class="img-placeholder">
          ${thumb ? `<img src="${thumb}" alt="${project.title}" loading="lazy" onerror="handleImgError(this)">` : imagePlaceholderSVG()}
        </div>
        <p class="series-meta">${meta}</p>
      </div>`;

    grid.appendChild(card);
  });

  area.innerHTML = "";
  area.appendChild(grid);
}

// ── Series subpage: each photo in its own window with a caption ───────────────

function renderSeriesView(area, project, media) {
  if (!project) {
    area.innerHTML = `<div class="win-window error-window">
      ${winTitleBar("Error")}
      <div class="win-body"><p>Series not found.</p>
      <p><a class="win-button" href="./">OK</a></p></div>
    </div>`;
    return;
  }

  document.querySelector(".app-titlebar-text").textContent = `${project.title} — Photography`;

  const photos = project.photos || [];

  const toolbar = `
    <div class="win-window series-toolbar">
      ${winTitleBar(project.title, { iconSVG: FOLDER_ICON })}
      <div class="win-body win-toolbar-body">
        <a class="win-button" href="./">← Back</a>
        <span class="win-toolbar-meta">${photos.length} item${photos.length === 1 ? "" : "s"}</span>
      </div>
    </div>`;

  const grid = document.createElement("div");
  grid.className = "photo-stack";

  photos.forEach((photo, i) => {
    const full = media(photo.src);
    const thumb = media(photo.thumb || photo.src);
    const win = document.createElement("div");
    win.className = "win-window photo-window";
    win.innerHTML = `
      ${winTitleBar(photo.title || `Image ${String(i + 1).padStart(2, "0")}`)}
      <div class="win-body">
        <div class="img-placeholder photo-placeholder" data-index="${i}">
          ${thumb ? `<img src="${thumb}" alt="${photo.alt || ""}" loading="lazy" onerror="handleImgError(this)">` : imagePlaceholderSVG()}
        </div>
        <p class="photo-caption">${photo.caption || photo.alt || "&nbsp;"}</p>
      </div>`;

    win.querySelector(".img-placeholder").addEventListener("click", () => {
      openWinLightbox(photos.map((p) => ({ ...p, full: media(p.src) })), i);
    });

    grid.appendChild(win);
  });

  area.innerHTML = toolbar;
  area.appendChild(grid);
}

// ── Windows-framed lightbox ───────────────────────────────────────────────────

let winLbPhotos = [];
let winLbIndex = 0;

function openWinLightbox(photos, index) {
  winLbPhotos = photos;
  winLbIndex = index;

  let overlay = document.getElementById("win-lightbox");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "win-lightbox";
    overlay.className = "win-lightbox";
    overlay.innerHTML = `
      <div class="win-window win-lightbox-window">
        <div class="win-titlebar">
          <span class="win-titlebar-text" id="wlb-title"></span>
          <span class="win-titlebar-buttons">
            <span class="win-btn" aria-hidden="true">_</span>
            <span class="win-btn" aria-hidden="true">□</span>
            <button class="win-btn" id="wlb-close" aria-label="Close">✕</button>
          </span>
        </div>
        <div class="win-body win-lightbox-body">
          <div class="img-placeholder win-lightbox-img" id="wlb-img"></div>
          <p class="photo-caption" id="wlb-caption"></p>
        </div>
        <div class="win-statusbar">
          <span id="wlb-status"></span>
          <span class="win-statusbar-nav">
            <button class="win-button" id="wlb-prev">‹ Prev</button>
            <button class="win-button" id="wlb-next">Next ›</button>
          </span>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeWinLightbox(); });
    overlay.querySelector("#wlb-close").addEventListener("click", closeWinLightbox);
    overlay.querySelector("#wlb-prev").addEventListener("click", () => stepWinLightbox(-1));
    overlay.querySelector("#wlb-next").addEventListener("click", () => stepWinLightbox(1));
    document.addEventListener("keydown", (e) => {
      if (overlay.hidden) return;
      if (e.key === "Escape") closeWinLightbox();
      if (e.key === "ArrowLeft") stepWinLightbox(-1);
      if (e.key === "ArrowRight") stepWinLightbox(1);
    });
  }

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  showWinLightbox();
}

function showWinLightbox() {
  const photo = winLbPhotos[winLbIndex];
  document.getElementById("wlb-title").textContent =
    photo.title || `Image ${String(winLbIndex + 1).padStart(2, "0")}`;
  document.getElementById("wlb-img").innerHTML = photo.full
    ? `<img src="${photo.full}" alt="${photo.alt || ""}" onerror="handleImgError(this)">`
    : imagePlaceholderSVG();
  document.getElementById("wlb-caption").innerHTML = photo.caption || photo.alt || "&nbsp;";
  document.getElementById("wlb-status").textContent =
    `${winLbIndex + 1} of ${winLbPhotos.length}`;
}

function stepWinLightbox(dir) {
  winLbIndex = (winLbIndex + dir + winLbPhotos.length) % winLbPhotos.length;
  showWinLightbox();
}

function closeWinLightbox() {
  const overlay = document.getElementById("win-lightbox");
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = "";
}

// ── Film ──────────────────────────────────────────────────────────────────────

function renderFilm(films, media) {
  const list = document.querySelector(".film-list");

  films.forEach((film) => {
    const entry = document.createElement("div");
    entry.className = "film-entry";

    let embedSrc = "";
    if (film.embed) {
      if (film.embed.platform === "vimeo") {
        embedSrc = `https://player.vimeo.com/video/${film.embed.id}`;
      } else if (film.embed.platform === "youtube") {
        embedSrc = `https://www.youtube.com/embed/${film.embed.id}`;
      }
    }

    entry.innerHTML = `
      <iframe src="${embedSrc}" allowfullscreen title="${film.title}"></iframe>
      <h2 class="film-title">${film.title}</h2>
      <p class="film-meta">${[film.year, film.duration, ...(film.tags || [])].filter(Boolean).join(" · ")}</p>
      ${film.description ? `<p class="film-description">${film.description}</p>` : ""}
    `;

    list.appendChild(entry);
  });
}

// ── Writing ───────────────────────────────────────────────────────────────────

function renderWriting(pieces) {
  const list = document.querySelector(".writing-list");
  const filterContainer = document.querySelector(".tag-filters");

  const allTags = [...new Set(pieces.flatMap((p) => p.tags || []))];
  let activeTag = null;

  function applyFilter() {
    const filtered = activeTag
      ? pieces.filter((p) => p.tags && p.tags.includes(activeTag))
      : pieces;
    list.innerHTML = "";
    filtered.forEach((piece) => list.appendChild(makeWritingEntry(piece)));
  }

  const allBtn = makeTagButton("all", true, () => {
    activeTag = null;
    filterContainer.querySelectorAll(".tag-btn").forEach((b) => b.classList.remove("active"));
    allBtn.classList.add("active");
    applyFilter();
  });
  filterContainer.appendChild(allBtn);

  allTags.forEach((tag) => {
    const btn = makeTagButton(tag, false, () => {
      activeTag = tag;
      filterContainer.querySelectorAll(".tag-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilter();
    });
    filterContainer.appendChild(btn);
  });

  applyFilter();
}

function makeWritingEntry(piece) {
  const li = document.createElement("li");
  li.className = "writing-entry";

  const meta = [piece.year, ...(piece.tags || [])].join(" · ");
  const readingTime = piece.readingTime ? ` · ${piece.readingTime} min read` : "";

  li.innerHTML = `
    <a href="piece.html?id=${piece.id}">
      <h2 class="writing-title">${piece.title}</h2>
      <p class="writing-meta">${meta}${readingTime}</p>
      ${piece.excerpt ? `<p class="writing-excerpt">${piece.excerpt}</p>` : ""}
    </a>
  `;

  return li;
}

// ── Audio — 2000s iPod UI ─────────────────────────────────────────────────────

function renderAudio(tracks, media) {
  const screen = document.getElementById("ipod-screen");
  const audioEl = document.getElementById("ipod-audio");

  // ----- state -----
  let view = "menu";       // "menu" | "now"
  let selected = 0;        // highlighted row in the menu
  let current = -1;        // track that is loaded/playing
  let playing = false;
  let progress = 0;        // 0..1
  let posSec = 0, durSec = 0;

  // ----- reactive LED-equalizer backdrop -----
  const eqCanvas = document.getElementById("eq-canvas");
  const eq = eqCanvas ? createEqualizer(eqCanvas, audioEl) : null;

  // ----- playback engine (HTML5 audio + SoundCloud widget) -----
  const player = createAudioPlayer(audioEl, media, {
    onProgress: (frac, pos, dur) => { progress = frac; posSec = pos; durSec = dur; if (view === "now") updateNowProgress(); },
    onState:    (isPlaying) => { playing = isPlaying; updatePlayGlyph(); if (eq) eq.setActive(isPlaying); },
    onEnded:    () => nextTrack(),
  });

  // ----- rendering -----
  function render() {
    if (view === "menu") renderMenu();
    else renderNow();
  }

  function renderMenu() {
    screen.className = "ipod-screen view-menu";
    screen.innerHTML = `
      <div class="screen-titlebar"><span class="tb-title">iPod</span><span class="tb-battery"></span></div>
      <ul class="screen-list">
        ${tracks.map((t, i) => `
          <li class="screen-row${i === selected ? " selected" : ""}" data-i="${i}">
            <span class="row-label">${t.title || "Untitled"}</span>
            <span class="row-chevron">&rsaquo;</span>
          </li>`).join("")}
      </ul>`;
    screen.querySelectorAll(".screen-row").forEach((row) => {
      row.addEventListener("click", () => { selected = +row.dataset.i; playTrack(selected); });
    });
    const sel = screen.querySelector(".screen-row.selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  function renderNow() {
    const t = tracks[current] || {};
    const art = media(t.art || t.cover || "");
    screen.className = "ipod-screen view-now";
    screen.innerHTML = `
      <div class="screen-titlebar"><span class="tb-title">Now Playing</span><span class="tb-battery"></span></div>
      <div class="now-body">
        <div class="now-art">${art ? `<img src="${art}" alt="" onerror="this.parentNode.innerHTML=musicNoteSVG()">` : musicNoteSVG()}</div>
        <div class="now-meta">
          <div class="now-count">${current + 1} of ${tracks.length}</div>
          <div class="now-title">${t.title || "Untitled"}</div>
          <div class="now-sub">${t.artist || ""}</div>
          <div class="now-sub now-album">${t.album || (t.tags ? t.tags.join(", ") : "")}</div>
        </div>
      </div>
      <div class="now-progress">
        <span class="now-time now-elapsed">0:00</span>
        <div class="now-bar"><div class="now-fill" id="now-fill"></div></div>
        <span class="now-time now-remaining">${t.duration ? "-" + t.duration : ""}</span>
      </div>`;
    updateNowProgress();
    updatePlayGlyph();
  }

  function updateNowProgress() {
    const fill = document.getElementById("now-fill");
    if (fill) fill.style.width = (progress * 100).toFixed(1) + "%";
    const el = screen.querySelector(".now-elapsed");
    const rem = screen.querySelector(".now-remaining");
    if (el && durSec) el.textContent = fmtTime(posSec);
    if (rem && durSec) rem.textContent = "-" + fmtTime(Math.max(0, durSec - posSec));
  }

  function updatePlayGlyph() {
    const btn = document.getElementById("wheel-play");
    if (btn) btn.classList.toggle("is-playing", playing);
    screen.classList.toggle("is-paused", view === "now" && !playing);
  }

  // ----- actions -----
  function playTrack(i) {
    current = i;
    view = "now";
    player.load(tracks[i], true);
    render();
  }
  function nextTrack() { if (tracks.length) playTrack((current + 1) % tracks.length); }
  function prevTrack() { if (tracks.length) playTrack((current - 1 + tracks.length) % tracks.length); }
  function togglePlay() {
    if (current < 0) { playTrack(selected); return; }
    if (playing) player.pause(); else player.play();
  }
  function moveSelection(d) {
    selected = Math.max(0, Math.min(tracks.length - 1, selected + d));
    renderMenu();
  }
  function goMenu() { view = "menu"; render(); }

  // ----- wheel buttons -----
  document.getElementById("wheel-menu").addEventListener("click", goMenu);
  document.getElementById("wheel-play").addEventListener("click", togglePlay);
  document.getElementById("wheel-center").addEventListener("click", () => {
    if (view === "menu") playTrack(selected); else togglePlay();
  });
  document.getElementById("wheel-prev").addEventListener("click", () => {
    if (view === "menu") moveSelection(-1); else prevTrack();
  });
  document.getElementById("wheel-next").addEventListener("click", () => {
    if (view === "menu") moveSelection(1); else nextTrack();
  });

  // ----- keyboard -----
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp")    { e.preventDefault(); view === "menu" ? moveSelection(-1) : prevTrack(); }
    if (e.key === "ArrowDown")  { e.preventDefault(); view === "menu" ? moveSelection(1)  : nextTrack(); }
    if (e.key === "ArrowLeft")  { view === "menu" ? null : prevTrack(); }
    if (e.key === "ArrowRight") { view === "menu" ? null : nextTrack(); }
    if (e.key === "Enter")      { view === "menu" ? playTrack(selected) : togglePlay(); }
    if (e.key === " ")          { e.preventDefault(); togglePlay(); }
    if (e.key === "Escape")     { goMenu(); }
  });

  render();
}

// Dual-engine player: HTML5 <audio> for self-hosted, SoundCloud Widget for embeds
function createAudioPlayer(audioEl, media, cb) {
  let mode = "none";       // "html5" | "sc" | "none"
  let scWidget = null, scIframe = null, scDur = 0;

  function clearSC() { if (scIframe) { scIframe.remove(); scIframe = null; scWidget = null; } scDur = 0; }

  function load(track, autoplay) {
    audioEl.pause();
    clearSC();

    if (track.embed && track.embed.platform === "soundcloud" && window.SC) {
      mode = "sc";
      scIframe = document.createElement("iframe");
      scIframe.allow = "autoplay";
      scIframe.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0;";
      scIframe.src = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${track.embed.id}&auto_play=${autoplay ? "true" : "false"}`;
      document.body.appendChild(scIframe);
      scWidget = SC.Widget(scIframe);
      scWidget.bind(SC.Widget.Events.READY, () => {
        scWidget.getDuration((d) => { scDur = d / 1000; });
        if (autoplay) scWidget.play();
      });
      scWidget.bind(SC.Widget.Events.PLAY,  () => cb.onState(true));
      scWidget.bind(SC.Widget.Events.PAUSE, () => cb.onState(false));
      scWidget.bind(SC.Widget.Events.FINISH, () => cb.onEnded());
      scWidget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) =>
        cb.onProgress(e.relativePosition, e.currentPosition / 1000, scDur));
    } else if (track.src) {
      mode = "html5";
      audioEl.src = media(track.src);
      if (autoplay) audioEl.play().catch(() => {});
    } else {
      mode = "none";
      cb.onState(false);
    }
  }

  function play()  { if (mode === "sc" && scWidget) scWidget.play(); else if (mode === "html5") audioEl.play().catch(() => {}); }
  function pause() { if (mode === "sc" && scWidget) scWidget.pause(); else if (mode === "html5") audioEl.pause(); }

  audioEl.addEventListener("play",  () => { if (mode === "html5") cb.onState(true); });
  audioEl.addEventListener("pause", () => { if (mode === "html5") cb.onState(false); });
  audioEl.addEventListener("ended", () => { if (mode === "html5") cb.onEnded(); });
  audioEl.addEventListener("timeupdate", () => {
    if (mode === "html5" && audioEl.duration)
      cb.onProgress(audioEl.currentTime / audioEl.duration, audioEl.currentTime, audioEl.duration);
  });

  return { load, play, pause };
}

function musicNoteSVG() {
  return `<svg class="note-icon" viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
    <path d="M34 8 L18 12 V32 a6 5 0 1 1 -3 -4.6 V16 l13 -3.2 V28 a6 5 0 1 1 -3 -4.6 V8 Z" fill="#888"/>
  </svg>`;
}
window.musicNoteSVG = musicNoteSVG;

function fmtTime(s) {
  s = Math.floor(s || 0);
  const m = Math.floor(s / 60);
  return m + ":" + String(s % 60).padStart(2, "0");
}

// ── Reactive dot-matrix LED equalizer ────────────────────────────────────────
// Draws a grid of dots; columns rise like an equalizer. Uses real FFT data from
// the audio element when the browser allows it (same-origin or CORS-enabled),
// otherwise falls back to an animated simulation while audio is playing.
function createEqualizer(canvas, audioEl) {
  const ctx = canvas.getContext("2d");
  const CELL = 15;           // dot grid spacing (px)
  let cols = 0, rows = 0, dpr = 1;
  let viewH = 0;             // viewport height (css px)
  let redLineY = 0;          // screen Y where dots turn red (just above the iPod)
  let heights = [];          // current column heights (0..1)
  let targets = [];          // eased-toward targets (0..1)
  let dim = null;            // offscreen dim-dot grid
  let active = false;

  // Web Audio analyser (best-effort)
  let audioCtx = null, analyser = null, freqData = null, srcMade = false;

  function ensureAnalyser() {
    if (srcMade) return;
    srcMade = true;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaElementSource(audioEl);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (e) { analyser = null; }
  }

  // Colour depends on the dot's absolute screen height: green at the bottom,
  // through yellow, to red at/above the red line (just above the iPod).
  function colorAtY(py) {
    const span = Math.max(1, viewH - redLineY);
    let frac = (viewH - py) / span;     // 0 at bottom … 1 at the red line
    if (frac < 0) frac = 0;
    if (frac > 1) frac = 1;
    const hue = 130 - frac * 130;       // 130 green → 65 yellow → 0 red
    return `hsl(${hue.toFixed(0)}, 92%, 51%)`;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    viewH = h;
    const ipod = document.querySelector(".ipod");
    redLineY = ipod ? ipod.getBoundingClientRect().top - 6 : h * 0.28;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / CELL) + 1;
    rows = Math.ceil(h / CELL) + 1;
    heights = new Array(cols).fill(0);
    targets = new Array(cols).fill(0);

    // Pre-render the static dim grid once
    dim = document.createElement("canvas");
    dim.width = w; dim.height = h;
    const dc = dim.getContext("2d");
    const d = CELL * 0.5;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        dc.fillStyle = "rgba(120,150,130,0.10)";
        dc.fillRect(x * CELL + (CELL - d) / 2, y * CELL + (CELL - d) / 2, d, d);
      }
    }
  }

  function updateTargets() {
    // Bars respond ONLY to real audio frequency data. When nothing is playing
    // (or the audio can't be analysed) they settle flat.
    if (active && analyser) {
      analyser.getByteFrequencyData(freqData);
      const usable = Math.floor(freqData.length * 0.72);
      for (let x = 0; x < cols; x++) {
        const bin = Math.floor((x / cols) * usable);
        targets[x] = Math.min(1, (freqData[bin] / 255) * 1.15);
      }
      return;
    }
    for (let x = 0; x < cols; x++) targets[x] = 0;
  }

  function frame() {
    updateTargets();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (dim) ctx.drawImage(dim, 0, 0);

    const d = CELL * 0.5;
    const baseY = rows - 1;
    for (let x = 0; x < cols; x++) {
      // ease current height toward target
      heights[x] += (targets[x] - heights[x]) * 0.25;
      const lit = Math.round(heights[x] * (rows * 0.92));
      for (let r = 0; r < lit; r++) {
        const px = x * CELL + (CELL - d) / 2;
        const py = (baseY - r) * CELL + (CELL - d) / 2;
        ctx.fillStyle = colorAtY(py);
        ctx.fillRect(px, py, d, d);
      }
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  return {
    setActive(on) {
      active = on;
      if (on) {
        ensureAnalyser();
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      }
    },
  };
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function makeTagButton(label, isActive, onClick) {
  const btn = document.createElement("button");
  btn.className = "tag-btn" + (isActive ? " active" : "");
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}
