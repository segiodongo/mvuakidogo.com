/**
 * lightbox.js
 * Simple keyboard- and click-navigable lightbox for photography pages.
 * openLightbox(photos, startIndex) is called by gallery.js.
 */

let currentPhotos = [];
let currentIndex = 0;

const lightbox  = document.getElementById("lightbox");
const imgEl     = document.getElementById("lightbox-img");
const captionEl = document.getElementById("lightbox-caption");
const closeBtn  = document.querySelector(".lightbox-close");
const prevBtn   = document.querySelector(".lightbox-prev");
const nextBtn   = document.querySelector(".lightbox-next");

function openLightbox(photos, index) {
  currentPhotos = photos;
  currentIndex = index;
  showPhoto(index);
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  closeBtn.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = "";
}

function showPhoto(index) {
  const photo = currentPhotos[index];
  imgEl.src = photo.src;
  imgEl.alt = photo.alt || "";
  captionEl.textContent = photo.caption || "";
  prevBtn.style.visibility = index === 0 ? "hidden" : "visible";
  nextBtn.style.visibility = index === currentPhotos.length - 1 ? "hidden" : "visible";
}

function prev() {
  if (currentIndex > 0) {
    currentIndex--;
    showPhoto(currentIndex);
  }
}

function next() {
  if (currentIndex < currentPhotos.length - 1) {
    currentIndex++;
    showPhoto(currentIndex);
  }
}

// Controls
closeBtn.addEventListener("click", closeLightbox);
prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

// Click outside image to close
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
});
