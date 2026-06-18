/**
 * generate-thumbs.js
 *
 * Scans assets/images/ for photos, converts them to WebP thumbnails,
 * and writes them to assets/thumbnails/. Also updates content.json
 * with the correct thumb paths automatically.
 *
 * Usage:
 *   npm run thumbs            -- process new images only
 *   npm run thumbs:force      -- reprocess everything
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const CONFIG = {
  inputDir: "assets/images",
  outputDir: "assets/thumbnails",
  contentJson: "content.json",
  thumb: {
    width: 400,
    quality: 82,
  },
  extensions: [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"],
};

const force = process.argv.includes("--force");

function walkDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (CONFIG.extensions.includes(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

function thumbPath(srcPath) {
  const relative = path.relative(CONFIG.inputDir, srcPath);
  const parsed = path.parse(relative);
  return path.join(CONFIG.outputDir, parsed.dir, parsed.name + ".webp");
}

function needsUpdate(src, dest) {
  if (!fs.existsSync(dest)) return true;
  return fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs;
}

async function generateThumbnail(srcPath) {
  const dest = thumbPath(srcPath);

  if (!force && !needsUpdate(srcPath, dest)) {
    console.log(`  skip  ${path.relative(".", srcPath)}`);
    return { srcPath, dest, skipped: true };
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  await sharp(srcPath)
    .resize({ width: CONFIG.thumb.width, withoutEnlargement: true })
    .webp({ quality: CONFIG.thumb.quality })
    .toFile(dest);

  const srcSize = (fs.statSync(srcPath).size / 1024).toFixed(0);
  const destSize = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`  done  ${path.relative(".", srcPath)}  (${srcSize}KB → ${destSize}KB)`);

  return { srcPath, dest, skipped: false };
}

function updateContentJson(results) {
  if (!fs.existsSync(CONFIG.contentJson)) return;
  const data = JSON.parse(fs.readFileSync(CONFIG.contentJson, "utf8"));
  if (!Array.isArray(data.photography)) return;

  let changed = false;

  for (const project of data.photography) {
    if (project.cover) {
      const expected = thumbPath(project.cover);
      if (fs.existsSync(expected) && project.thumb !== expected) {
        project.thumb = expected;
        changed = true;
      }
    }
    if (Array.isArray(project.photos)) {
      for (const photo of project.photos) {
        const expected = thumbPath(photo.src);
        if (fs.existsSync(expected) && photo.thumb !== expected) {
          photo.thumb = expected;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(CONFIG.contentJson, JSON.stringify(data, null, 2));
    console.log("\n  content.json updated with new thumb paths");
  }
}

async function main() {
  console.log(`\nScanning ${CONFIG.inputDir}/ for images...\n`);
  const images = walkDir(CONFIG.inputDir);

  if (images.length === 0) {
    console.log("  No images found. Add photos to assets/images/ first.");
    return;
  }

  const results = [];
  for (const img of images) {
    try {
      results.push(await generateThumbnail(img));
    } catch (err) {
      console.error(`  error  ${img}: ${err.message}`);
    }
  }

  const done = results.filter((r) => !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`\nDone. ${done} generated, ${skipped} already up to date.`);
  updateContentJson(results);
  console.log();
}

main();
