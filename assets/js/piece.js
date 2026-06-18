/**
 * piece.js
 * Loads a single writing piece from content.json, fetches its .md file,
 * and renders it using marked.js (loaded in piece.html).
 */

function mediaUrl(base, path) {
  if (!path) return path;
  if (path.startsWith("http")) return path;
  if (!base) return path;
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (!id) {
  window.location.href = "./";
}

fetch("../content.json")
  .then((r) => r.json())
  .then((data) => {
    const media = (path) => mediaUrl(data.mediaBase, path);
    const piece = (data.writing || []).find((p) => p.id === id);

    if (!piece) {
      document.querySelector(".piece-body").textContent = "Piece not found.";
      return;
    }

    document.title = `${piece.title} — ${data.site.name}`;
    document.getElementById("piece-title").textContent = piece.title;

    const meta = [piece.year, ...(piece.tags || [])].join(" · ");
    document.getElementById("piece-meta").textContent = meta;

    if (piece.downloadPdf) {
      const dl = document.getElementById("download-link");
      dl.href = media(piece.downloadPdf);
      dl.hidden = false;
    }

    // .md content files stay in the repo — fetched relative to the page
    return fetch(`../${piece.content}`)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load content file.");
        return r.text();
      })
      .then((md) => {
        document.getElementById("piece-body").innerHTML = marked.parse(md);
      });
  })
  .catch((err) => {
    document.getElementById("piece-body").textContent =
      "Could not load this piece. " + err.message;
  });
