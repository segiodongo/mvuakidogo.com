# Portfolio

Personal portfolio site — photography, film, writing.

Static HTML/CSS/JS. No build step. Deploy to GitHub Pages, Netlify, or Vercel.

## Setup

```bash
npm install
```

## Adding content

1. Drop full-res photos into `assets/images/<project-name>/`
2. Run `npm run thumbs` to generate WebP thumbnails (updates `content.json` automatically)
3. Add or edit entries in `content.json`
4. Add writing as `.md` files in `writing/`
5. Git push — site is live

## Commands

| Command | What it does |
|---|---|
| `npm run thumbs` | Generate thumbnails for new photos only |
| `npm run thumbs:force` | Regenerate all thumbnails |

## Structure

```
portfolio/
  index.html          ← homepage (nav image grid)
  content.json        ← all site data
  generate-thumbs.js  ← thumbnail script
  package.json
  .gitignore

  assets/
    css/style.css     ← all styles
    js/
      home.js         ← homepage
      gallery.js      ← photography / film / writing listings
      lightbox.js     ← photo lightbox
      piece.js        ← writing piece reader
      about.js        ← about page
    fonts/            ← your .woff2 font files
    images/           ← full-res photos (by project folder)
    thumbnails/       ← auto-generated WebP thumbs (by project folder)
    downloads/        ← PDFs for writing downloads

  nav-images/         ← your hand-made nav button images
  writing/            ← .md files for each piece
  photography/        ← index.html
  film/               ← index.html
  writing/            ← index.html + piece.html + .md files
  about/              ← index.html
  archive/            ← index.html (manually curated)
```

## Fonts

Add `@font-face` declarations to `assets/css/style.css` and place `.woff2` files in `assets/fonts/`.
Good sources: [Velvetyne](https://velvetyne.fr), [Fontshare](https://www.fontshare.com), [Google Fonts](https://fonts.google.com).

## Nav images

Place your nav button images (PNG or JPG) in `nav-images/` and reference them in the `"nav"` array in `content.json`.
Recommended size: ~200×120px. The `label` field is used as alt text.
