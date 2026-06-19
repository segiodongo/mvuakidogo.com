/**
 * home.js — populates the homepage nav grid.
 * Exposes initHome(contentPath); called by the page's inline init / the router.
 */
function initHome(contentPath) {
  fetch(contentPath || "content.json")
    .then((r) => r.json())
    .then((data) => {
      const media = (path) => mediaUrl(data.mediaBase, path);

      document.querySelector(".site-name").textContent = data.site.name;
      document.querySelector(".site-tagline").textContent = data.site.tagline;
      document.title = data.site.name;

      const nav = document.querySelector(".nav-grid");
      nav.innerHTML = "";
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
}
window.initHome = initHome;
