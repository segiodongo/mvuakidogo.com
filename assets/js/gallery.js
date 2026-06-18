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

// ── Photography ───────────────────────────────────────────────────────────────

function renderPhotography(projects, media) {
  const grid = document.querySelector(".gallery-grid");
  const filterContainer = document.querySelector(".tag-filters");

  const allTags = [...new Set(projects.flatMap((p) => p.tags || []))];
  let activeTag = null;

  function applyFilter() {
    const filtered = activeTag
      ? projects.filter((p) => p.tags && p.tags.includes(activeTag))
      : projects;
    grid.innerHTML = "";
    filtered.forEach((project) => grid.appendChild(makeProjectCard(project, media)));
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

function makeProjectCard(project, media) {
  const a = document.createElement("a");
  a.className = "gallery-card";
  a.href = `?project=${project.id}`;

  const img = document.createElement("img");
  img.src = media(project.thumb || project.cover || "");
  img.alt = project.title;
  img.loading = "lazy";

  const title = document.createElement("p");
  title.className = "gallery-card-title";
  title.textContent = project.title;

  const meta = document.createElement("p");
  meta.className = "gallery-card-meta";
  meta.textContent = [project.year, ...(project.tags || [])].join(" · ");

  a.append(img, title, meta);

  a.addEventListener("click", (e) => {
    e.preventDefault();
    if (project.photos && project.photos.length > 0) {
      const resolved = project.photos.map((p) => ({
        ...p,
        src: media(p.src),
        thumb: media(p.thumb),
      }));
      openLightbox(resolved, 0);
    }
  });

  return a;
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

// ── Audio ─────────────────────────────────────────────────────────────────────

function renderAudio(tracks, media) {
  const list = document.querySelector(".audio-list");
  const filterContainer = document.querySelector(".tag-filters");

  const allTags = [...new Set(tracks.flatMap((t) => t.tags || []))];
  let activeTag = null;

  function applyFilter() {
    const filtered = activeTag
      ? tracks.filter((t) => t.tags && t.tags.includes(activeTag))
      : tracks;
    list.innerHTML = "";
    filtered.forEach((track) => list.appendChild(makeAudioEntry(track, media)));
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

function makeAudioEntry(track, media) {
  const entry = document.createElement("div");
  entry.className = "audio-entry";

  const metaParts = [track.year, track.duration, ...(track.tags || [])].filter(Boolean);

  let playerHTML = "";

  if (track.embed) {
    if (track.embed.platform === "soundcloud") {
      playerHTML = `<iframe class="audio-embed" scrolling="no" frameborder="no" allow="autoplay"
        src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${track.embed.id}&color=%23000000&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
        title="${track.title}"></iframe>`;
    } else if (track.embed.platform === "bandcamp") {
      playerHTML = `<iframe class="audio-embed audio-embed--bandcamp" src="https://bandcamp.com/EmbeddedPlayer/track=${track.embed.id}/size=large/bgcol=ffffff/linkcol=000000/tracklist=false/artwork=small/transparent=true/"
        seamless title="${track.title}"></iframe>`;
    }
  } else if (track.src) {
    const src = media(track.src);
    const type = track.src.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg";
    playerHTML = `<audio class="audio-player" controls preload="none">
      <source src="${src}" type="${type}">
    </audio>`;
  }

  entry.innerHTML = `
    ${playerHTML}
    <h2 class="audio-title">${track.title}</h2>
    <p class="audio-meta">${metaParts.join(" · ")}</p>
    ${track.description ? `<p class="audio-description">${track.description}</p>` : ""}
  `;

  return entry;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function makeTagButton(label, isActive, onClick) {
  const btn = document.createElement("button");
  btn.className = "tag-btn" + (isActive ? " active" : "");
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}
