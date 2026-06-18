/**
 * home.js
 * Populates the homepage: site name, tagline, and nav image grid.
 */

function mediaUrl(base, path) {
  if (!path) return path;
  if (path.startsWith("http")) return path;
  if (!base) return path;
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

fetch("content.json")
  .then((r) => r.json())
  .then((data) => {
    const media = (path) => mediaUrl(data.mediaBase, path);

    document.querySelector(".site-name").textContent = data.site.name;
    document.querySelector(".site-tagline").textContent = data.site.tagline;
    document.title = data.site.name;

    const nav = document.querySelector(".nav-grid");
    data.nav.forEach((item) => {
      const a = document.createElement("a");
      a.href = item.href;

      const img = document.createElement("img");
      img.src = media(item.img);
      img.alt = item.label;

      if (item.imgHover) {
        img.addEventListener("mouseenter", () => { img.src = media(item.imgHover); });
        img.addEventListener("mouseleave", () => { img.src = media(item.img); });
      }

      a.appendChild(img);
      nav.appendChild(a);
    });

    document.querySelector(".site-footer p").textContent =
      `© ${new Date().getFullYear()} ${data.site.name}`;
  });
