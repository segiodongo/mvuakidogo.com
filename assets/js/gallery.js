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
      if (section === "audio")       renderAudio(entries, media, data.mediaBase);
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

// ── Film — DVR-guide UI (TiVo homage) ─────────────────────────────────────────

// Custom "mvua" emblem — original homage to the satellite-broadcaster mark:
// a skewed blue tile with white satellite arcs and the mvua wordmark beneath.
const MVUA_LOGO = `
  <svg class="tv-logo" viewBox="0 0 150 86" aria-label="mvua">
    <defs>
      <linearGradient id="mvuaBlue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8aa0ff"/>
        <stop offset="0.5" stop-color="#5560e0"/>
        <stop offset="1" stop-color="#2a2f9c"/>
      </linearGradient>
    </defs>
    <g transform="skewX(-10)">
      <rect x="26" y="3" width="92" height="50" rx="11" fill="url(#mvuaBlue)"/>
      <g fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round">
        <path d="M46 42 q22 -28 54 -16" opacity="0.95"/>
        <path d="M50 47 q18 -20 44 -12" opacity="0.8"/>
        <path d="M54 51 q14 -13 33 -8" opacity="0.6"/>
      </g>
      <circle cx="50" cy="46" r="4.5" fill="#fff"/>
    </g>
    <text x="62" y="80" text-anchor="middle" font-family="'Trebuchet MS',Verdana,sans-serif"
          font-size="20" font-weight="800" letter-spacing="3" fill="#e6ebff">mvua</text>
  </svg>`;

function renderFilm(films, media) {
  const root = document.getElementById("tivo");
  let view = "list";        // "list" | "detail" | "player"
  let selected = 0;
  let current = -1;
  let playing = false;
  let progress = 0, posSec = 0, durSec = 0;

  const filmMeta = (f) => [f.year, f.duration, ...(f.tags || [])].filter(Boolean).join("  ·  ");

  // ----- video player engine (created lazily in player view) -----
  let player = null;

  // ----- LIST (Now Playing) -----
  function renderList() {
    view = "list";
    root.className = "tivo view-list";
    root.innerHTML = `
      <header class="tv-header">
        ${MVUA_LOGO}
        <h1 class="tv-title">Now Playing List</h1>
        <div class="tv-watermarks" aria-hidden="true">
          <span class="tv-wm tv-wm-1">mvua</span>
          <span class="tv-wm tv-wm-2">mvua</span>
          <span class="tv-wm tv-wm-3">mvua</span>
        </div>
      </header>
      <div class="tv-panel">
        <span class="tv-scroll tv-scroll-up">&#9650;</span>
        <ul class="tivo-list" id="tivo-list">
          ${films.map((film, i) => `
            <li class="tivo-row${i === selected ? " selected" : ""}" data-i="${i}">
              <span class="row-chev row-chev-l">&#8249;</span>
              <span class="row-orb"></span>
              <span class="row-title">${film.title || "Untitled"}</span>
              <span class="row-date">${[film.year, film.duration].filter(Boolean).join("&nbsp;&nbsp;&nbsp;")}</span>
              <span class="row-chev row-chev-r">&#8250;</span>
            </li>`).join("")}
        </ul>
        <span class="tv-scroll tv-scroll-down">&#9660;</span>
      </div>
      <footer class="tv-status">Sorted by date&nbsp;&nbsp;(press SELECT / click to open)</footer>`;

    root.querySelectorAll(".tivo-row").forEach((row) => {
      row.addEventListener("mouseenter", () => { selected = +row.dataset.i; syncSelection(); });
      row.addEventListener("click", () => { selected = +row.dataset.i; openDetail(selected); });
    });
    const sel = root.querySelector(".tivo-row.selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  // Move the highlight without re-rendering the whole list (keeps it snappy)
  function syncSelection() {
    root.querySelectorAll(".tivo-row").forEach((r) => {
      r.classList.toggle("selected", +r.dataset.i === selected);
    });
    const sel = root.querySelector(".tivo-row.selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  // ----- DETAIL (program screen with Play button) -----
  function openDetail(i) {
    current = i; view = "detail";
    const f = films[i] || {};
    const thumb = media(f.thumb || f.cover || "");
    root.className = "tivo view-detail";
    root.innerHTML = `
      <header class="tivo-header">
        <button class="tivo-back" id="tivo-back">&#8249; Now Playing</button>
        <span class="tivo-header-sub">${f.title || ""}</span>
      </header>
      <div class="tivo-detail">
        <button class="detail-screen" id="detail-play" aria-label="Play ${f.title || ""}">
          ${thumb ? `<img src="${thumb}" alt="" onerror="this.style.display='none'">` : ""}
          <span class="preview-scan"></span>
          <span class="play-badge"><span class="play-tri"></span></span>
        </button>
        <div class="detail-info">
          <h2 class="detail-title">${f.title || "Untitled"}</h2>
          <p class="detail-meta">${filmMeta(f)}</p>
          <p class="detail-desc">${f.description || ""}</p>
          <button class="tivo-btn" id="detail-play-btn"><span class="play-tri sm"></span> Play</button>
        </div>
      </div>`;
    root.querySelector("#tivo-back").addEventListener("click", renderList);
    root.querySelector("#detail-play").addEventListener("click", () => openPlayer(i));
    root.querySelector("#detail-play-btn").addEventListener("click", () => openPlayer(i));
  }

  // ----- PLAYER (embedded video + transport) -----
  function openPlayer(i) {
    current = i; view = "player";
    const f = films[i] || {};
    root.className = "tivo view-player";
    root.innerHTML = `
      <header class="tivo-header">
        <button class="tivo-back" id="tivo-back">&#8249; Back</button>
        <span class="tivo-header-sub">${f.title || ""}</span>
      </header>
      <div class="tivo-player">
        <div class="player-screen"><div id="film-mount"></div><span class="preview-scan"></span></div>
        <div class="player-transport">
          <button class="trans-btn" id="t-rew" aria-label="Rewind 10s">&#9194;</button>
          <button class="trans-btn play" id="t-play" aria-label="Play / Pause">&#9199;</button>
          <button class="trans-btn" id="t-ff" aria-label="Forward 10s">&#9193;</button>
          <span class="trans-time" id="t-elapsed">0:00</span>
          <div class="tivo-progress"><div class="tivo-progress-fill" id="t-fill"></div></div>
          <span class="trans-time" id="t-total">${f.duration || ""}</span>
        </div>
        <p class="player-desc">${f.description || ""}</p>
      </div>`;
    root.querySelector("#tivo-back").addEventListener("click", () => { destroyPlayer(); openDetail(i); });
    root.querySelector("#t-play").addEventListener("click", togglePlay);
    root.querySelector("#t-rew").addEventListener("click", () => player && player.seek(-10));
    root.querySelector("#t-ff").addEventListener("click", () => player && player.seek(10));

    player = createFilmPlayer(document.getElementById("film-mount"), media, {
      onState: (p) => {
        playing = p; updateTransport();
        // A film starting takes audio priority — pause the background music.
        if (p && window.AudioService) window.AudioService.pauseForExternal();
      },
      onProgress: (frac, pos, dur) => { progress = frac; posSec = pos; durSec = dur; updateProgress(); },
      onEnded: () => { playing = false; updateTransport(); },
    });
    player.load(f);
  }

  function destroyPlayer() { if (player) { player.destroy(); player = null; } playing = false; }

  function togglePlay() { if (player) playing ? player.pause() : player.play(); }

  function updateTransport() {
    const btn = root.querySelector("#t-play");
    if (btn) btn.classList.toggle("is-playing", playing);
  }
  function updateProgress() {
    const fill = root.querySelector("#t-fill");
    const el = root.querySelector("#t-elapsed");
    const tot = root.querySelector("#t-total");
    if (fill) fill.style.width = (progress * 100).toFixed(1) + "%";
    if (el && durSec) el.textContent = fmtTime(posSec);
    if (tot && durSec) tot.textContent = fmtTime(durSec);
  }

  // ----- keyboard (remote; cleaned up by the shell on navigation) -----
  const onKey = (e) => {
    if (view === "list") {
      if (e.key === "ArrowUp")   { e.preventDefault(); selected = Math.max(0, selected - 1); syncSelection(); }
      if (e.key === "ArrowDown") { e.preventDefault(); selected = Math.min(films.length - 1, selected + 1); syncSelection(); }
      if (e.key === "Enter")     { openDetail(selected); }
    } else if (view === "detail") {
      if (e.key === "Enter")  { openPlayer(current); }
      if (e.key === "Escape" || e.key === "Backspace") { renderList(); }
    } else if (view === "player") {
      if (e.key === " ")      { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowLeft"  && player) player.seek(-10);
      if (e.key === "ArrowRight" && player) player.seek(10);
      if (e.key === "Escape" || e.key === "Backspace") { destroyPlayer(); openDetail(current); }
    }
  };
  if (window.MvuaApp) MvuaApp.onKey(onKey); else document.addEventListener("keydown", onKey);
  // Stop the film if we navigate away mid-playback.
  if (window.MvuaApp) MvuaApp.onCleanup(() => destroyPlayer());

  renderList();
}

// Embedded-video transport abstraction: YouTube IFrame API + Vimeo Player SDK
function createFilmPlayer(mount, media, cb) {
  let kind = null, yt = null, vimeo = null, vid = null, poll = null, dur = 0;

  function startPoll(getPos) {
    stopPoll();
    poll = setInterval(() => {
      Promise.resolve(getPos()).then((pos) => {
        if (dur) cb.onProgress(Math.min(1, pos / dur), pos, dur);
      });
    }, 250);
  }
  function stopPoll() { if (poll) { clearInterval(poll); poll = null; } }

  function load(film) {
    // Self-hosted video file (e.g. R2-hosted .mp4 / .mov)
    if (film.src) {
      kind = "self";
      vid = document.createElement("video");
      vid.src = media(film.src);
      vid.playsInline = true;
      vid.preload = "metadata";
      vid.addEventListener("loadedmetadata", () => { dur = vid.duration; });
      vid.addEventListener("play", () => cb.onState(true));
      vid.addEventListener("pause", () => cb.onState(false));
      vid.addEventListener("ended", () => cb.onEnded());
      vid.addEventListener("timeupdate", () => {
        if (vid.duration) cb.onProgress(vid.currentTime / vid.duration, vid.currentTime, vid.duration);
      });
      mount.appendChild(vid);
      vid.play().catch(() => {});
      return;
    }

    const e = film.embed || {};
    if (e.platform === "youtube") {
      kind = "yt";
      const div = document.createElement("div");
      mount.appendChild(div);
      ensureYT().then(() => {
        yt = new YT.Player(div, {
          videoId: e.id,
          playerVars: { controls: 0, modestbranding: 1, rel: 0, playsinline: 1 },
          events: {
            onReady: (ev) => { dur = ev.target.getDuration(); ev.target.playVideo(); startPoll(() => yt.getCurrentTime()); },
            onStateChange: (ev) => {
              if (ev.data === YT.PlayerState.PLAYING) { dur = yt.getDuration() || dur; cb.onState(true); }
              else if (ev.data === YT.PlayerState.PAUSED) cb.onState(false);
              else if (ev.data === YT.PlayerState.ENDED) cb.onEnded();
            },
          },
        });
      });
    } else if (e.platform === "vimeo") {
      kind = "vimeo";
      const div = document.createElement("div");
      mount.appendChild(div);
      ensureVimeo().then(() => {
        vimeo = new Vimeo.Player(div, { id: e.id, controls: false, responsive: true });
        vimeo.on("play", () => cb.onState(true));
        vimeo.on("pause", () => cb.onState(false));
        vimeo.on("ended", () => cb.onEnded());
        vimeo.on("timeupdate", (d) => { dur = d.duration; cb.onProgress(d.percent, d.seconds, d.duration); });
        vimeo.play().catch(() => {});
      });
    }
  }

  function play()  { if (vid) vid.play().catch(() => {}); else if (yt) yt.playVideo(); else if (vimeo) vimeo.play().catch(() => {}); }
  function pause() { if (vid) vid.pause(); else if (yt) yt.pauseVideo(); else if (vimeo) vimeo.pause().catch(() => {}); }
  function seek(delta) {
    if (vid) vid.currentTime = Math.max(0, Math.min(vid.duration || 1e9, vid.currentTime + delta));
    else if (yt) yt.seekTo(Math.max(0, yt.getCurrentTime() + delta), true);
    else if (vimeo) vimeo.getCurrentTime().then((t) => vimeo.setCurrentTime(Math.max(0, t + delta)));
  }
  function destroy() {
    stopPoll();
    if (vid) { vid.pause(); vid.removeAttribute("src"); vid.load(); }
    if (yt && yt.destroy) yt.destroy();
    if (vimeo && vimeo.destroy) vimeo.destroy();
    yt = vimeo = vid = null; mount.innerHTML = "";
  }

  return { load, play, pause, seek, destroy };
}

let _ytReady, _vimeoReady;
function ensureYT() {
  if (_ytReady) return _ytReady;
  _ytReady = new Promise((res) => {
    if (window.YT && window.YT.Player) return res();
    window.onYouTubeIframeAPIReady = () => res();
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return _ytReady;
}
function ensureVimeo() {
  if (_vimeoReady) return _vimeoReady;
  _vimeoReady = new Promise((res) => {
    if (window.Vimeo) return res();
    const s = document.createElement("script");
    s.src = "https://player.vimeo.com/api/player.js";
    s.onload = () => res();
    document.head.appendChild(s);
  });
  return _vimeoReady;
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

function renderAudio(rootItems, media, mediaBase) {
  const screen = document.getElementById("ipod-screen");
  const AS = window.AudioService;
  if (AS && mediaBase != null) AS.setMediaBase(mediaBase);

  // ----- state -----
  let view = "menu";                         // "menu" | "now"
  // Navigation stack of menus. Each: { title, items, selected }
  const stack = [{ title: "iPod", items: rootItems || [], selected: 0 }];

  const curMenu = () => stack[stack.length - 1];
  const isFolder = (node) => node && Array.isArray(node.items);

  // ----- reactive LED-equalizer backdrop (reads the AudioService analyser) -----
  const eqCanvas = document.getElementById("eq-canvas");
  if (eqCanvas) createEqualizer(eqCanvas);

  // ----- react to the shared AudioService (music persists across sections) -----
  const onAudio = (e) => {
    const type = e.detail && e.detail.type;
    if (type === "track") { view = "now"; render(); }
    else if (type === "state") updatePlayGlyph();
    else if (type === "progress") { if (view === "now") updateNowProgress(); }
  };
  window.addEventListener("mvua:audio", onAudio);
  if (window.MvuaApp) MvuaApp.onCleanup(() => window.removeEventListener("mvua:audio", onAudio));

  // ----- rendering -----
  function render() { view === "menu" ? renderMenu() : renderNow(); }

  function renderMenu() {
    const menu = curMenu();
    const items = menu.items || [];
    screen.className = "ipod-screen view-menu";
    screen.innerHTML = `
      <div class="screen-titlebar"><span class="tb-title">${menu.title}</span><span class="tb-battery"></span></div>
      <ul class="screen-list">
        ${items.length ? items.map((node, i) => `
          <li class="screen-row${i === menu.selected ? " selected" : ""}" data-i="${i}">
            <span class="row-label">${node.title || "Untitled"}</span>
            ${isFolder(node)
              ? `<span class="row-chevron">&rsaquo;</span>`
              : `<span class="row-note">&#9834;</span>`}
          </li>`).join("")
        : `<li class="screen-empty">— empty —</li>`}
      </ul>`;
    screen.querySelectorAll(".screen-row").forEach((row) => {
      row.addEventListener("click", () => { menu.selected = +row.dataset.i; selectCurrent(); });
    });
    const sel = screen.querySelector(".screen-row.selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  function renderNow() {
    const t = AS && AS.current;
    if (!t) { view = "menu"; renderMenu(); return; }
    const art = media(t.art || t.cover || "");
    screen.className = "ipod-screen view-now";
    screen.innerHTML = `
      <div class="screen-titlebar"><span class="tb-title">Now Playing</span><span class="tb-battery"></span></div>
      <div class="now-body">
        <div class="now-art">${art ? `<img src="${art}" alt="" onerror="this.parentNode.innerHTML=musicNoteSVG()">` : musicNoteSVG()}</div>
        <div class="now-meta">
          <div class="now-count">${AS.index + 1} of ${AS.length}</div>
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
    if (!AS) return;
    const { pos, dur } = AS.position();
    const fill = document.getElementById("now-fill");
    if (fill && dur) fill.style.width = (pos / dur * 100).toFixed(1) + "%";
    const el = screen.querySelector(".now-elapsed");
    const rem = screen.querySelector(".now-remaining");
    if (el && dur) el.textContent = fmtTime(pos);
    if (rem && dur) rem.textContent = "-" + fmtTime(Math.max(0, dur - pos));
  }

  function updatePlayGlyph() {
    const playing = AS && AS.isPlaying();
    const btn = document.getElementById("wheel-play");
    if (btn) btn.classList.toggle("is-playing", playing);
    screen.classList.toggle("is-paused", view === "now" && !playing);
  }

  // ----- navigation / actions -----
  function selectCurrent() {
    const menu = curMenu();
    const node = (menu.items || [])[menu.selected];
    if (!node || !AS) return;
    if (isFolder(node)) {
      stack.push({ title: node.title, items: node.items || [], selected: 0 });
      render();
    } else {
      // Build the play queue from the playable tracks in this folder
      const tracksHere = (menu.items || []).filter((n) => !isFolder(n) && n.src);
      const i = tracksHere.indexOf(node);
      if (i < 0) return;
      view = "now";
      AS.playQueue(tracksHere, i, mediaBase);
      render();
    }
  }

  function moveSelection(d) {
    const menu = curMenu();
    const n = (menu.items || []).length;
    if (!n) return;
    menu.selected = Math.max(0, Math.min(n - 1, menu.selected + d));
    renderMenu();
  }

  function goBack() {
    if (view === "now") { view = "menu"; render(); return; }
    if (stack.length > 1) { stack.pop(); render(); }
  }

  function togglePlay() {
    if (!AS) return;
    if (AS.index < 0) { selectCurrent(); return; }
    AS.toggle();
  }

  // ----- wheel buttons (elements live inside #app, removed on navigation) -----
  document.getElementById("wheel-menu").addEventListener("click", goBack);
  document.getElementById("wheel-play").addEventListener("click", togglePlay);
  document.getElementById("wheel-center").addEventListener("click", () => {
    if (view === "menu") selectCurrent(); else togglePlay();
  });
  document.getElementById("wheel-prev").addEventListener("click", () => {
    if (view === "menu") moveSelection(-1); else AS && AS.prev();
  });
  document.getElementById("wheel-next").addEventListener("click", () => {
    if (view === "menu") moveSelection(1); else AS && AS.next();
  });

  // ----- keyboard (registered via the shell so it is cleaned up on navigation) ----
  const onKey = (e) => {
    if (e.key === "ArrowUp")    { e.preventDefault(); view === "menu" ? moveSelection(-1) : AS && AS.prev(); }
    if (e.key === "ArrowDown")  { e.preventDefault(); view === "menu" ? moveSelection(1)  : AS && AS.next(); }
    if (e.key === "ArrowRight") { if (view === "menu") selectCurrent(); else AS && AS.next(); }
    if (e.key === "ArrowLeft")  { if (view === "menu") goBack(); else AS && AS.prev(); }
    if (e.key === "Enter")      { view === "menu" ? selectCurrent() : togglePlay(); }
    if (e.key === " ")          { e.preventDefault(); togglePlay(); }
    if (e.key === "Escape" || e.key === "Backspace") { goBack(); }
  };
  if (window.MvuaApp) MvuaApp.onKey(onKey); else document.addEventListener("keydown", onKey);

  // If music is already playing (returned to this section), show Now Playing.
  if (AS && AS.current) view = "now";
  render();
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
// Draws a grid of dots; columns rise like an equalizer driven by the shared
// AudioService's FFT data. The loop stops itself once the canvas is removed
// from the DOM (i.e. when navigating away from the audio section).
function createEqualizer(canvas) {
  const ctx = canvas.getContext("2d");
  const CELL = 15;           // dot grid spacing (px)
  let cols = 0, rows = 0, dpr = 1;
  let viewH = 0;             // viewport height (css px)
  let redLineY = 0;          // screen Y where dots turn red (just above the iPod)
  let heights = [];          // current column heights (0..1)
  let targets = [];          // eased-toward targets (0..1)
  let dim = null;            // offscreen dim-dot grid

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
    // Bars respond ONLY to real audio frequency data from the AudioService.
    const freq = window.AudioService ? window.AudioService.getFreq() : null;
    if (freq) {
      const usable = Math.floor(freq.length * 0.72);
      for (let x = 0; x < cols; x++) {
        const bin = Math.floor((x / cols) * usable);
        targets[x] = Math.min(1, (freq[bin] / 255) * 1.15);
      }
      return;
    }
    for (let x = 0; x < cols; x++) targets[x] = 0;
  }

  function frame() {
    if (!canvas.isConnected) return; // navigated away — stop the loop
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

  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  if (window.MvuaApp) MvuaApp.onCleanup(() => window.removeEventListener("resize", onResize));
  resize();
  requestAnimationFrame(frame);
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function makeTagButton(label, isActive, onClick) {
  const btn = document.createElement("button");
  btn.className = "tag-btn" + (isActive ? " active" : "");
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}
