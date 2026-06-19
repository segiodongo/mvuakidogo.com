/**
 * piece.js — renders a single writing piece (markdown via marked.js).
 * Exposes initPiece(contentPath). Loads marked.js on demand.
 */
function ensureMarked() {
  if (window.__markedReady) return window.__markedReady;
  window.__markedReady = new Promise((res) => {
    if (window.marked) return res();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    s.onload = () => res();
    document.head.appendChild(s);
  });
  return window.__markedReady;
}

function initPiece(contentPath) {
  const id = new URLSearchParams(location.search).get("id");
  const bodyEl = document.getElementById("piece-body");
  if (!id) { if (bodyEl) bodyEl.textContent = "No piece selected."; return; }

  const contentURL = new URL(contentPath || "../content.json", location.href);

  ensureMarked()
    .then(() => fetch(contentURL).then((r) => r.json()))
    .then((data) => {
      const piece = (data.writing || []).find((p) => p.id === id);
      if (!piece) { bodyEl.textContent = "Piece not found."; return; }

      const media = (p) => mediaUrl(data.mediaBase, p);
      document.title = `${piece.title} — ${data.site.name}`;
      document.getElementById("piece-title").textContent = piece.title;
      document.getElementById("piece-meta").textContent =
        [piece.year, ...(piece.tags || [])].join(" · ");

      if (piece.downloadPdf) {
        const dl = document.getElementById("download-link");
        if (dl) { dl.href = media(piece.downloadPdf); dl.hidden = false; }
      }

      // .md files live in the repo, resolved relative to content.json
      const mdURL = new URL(piece.content, contentURL);
      return fetch(mdURL)
        .then((r) => { if (!r.ok) throw new Error("Could not load content file."); return r.text(); })
        .then((md) => { bodyEl.innerHTML = marked.parse(md); });
    })
    .catch((err) => { if (bodyEl) bodyEl.textContent = "Could not load this piece. " + err.message; });
}
window.initPiece = initPiece;
