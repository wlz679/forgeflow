// P149: source-file mtime lookup for Last-Modified + sitemap lastmod injection.
// Walks src/ once to build {htmlPath: sourcePath} mapping; queries at build time.
// For dynamic routes ([lang], [letter], [topic]), one source file maps to many
// dist HTML files (e.g., src/pages/[lang]/about.astro produces dist/en/about/index.html
// AND dist/zh/about/index.html).
//
// Path normalization: keys are RELATIVE paths ("dist/en/about/index.html"),
// input paths may be absolute ("D:/E/.../dist/en/about/index.html") or relative;
// we strip the repoRoot prefix if present, then use forward slashes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let _map = null;
let _repoRoot = null;

function buildMap(repoRoot) {
  const map = new Map();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else {
        const ext = path.extname(e.name);
        if (full.includes(`${path.sep}src${path.sep}pages${path.sep}`) && ext === ".astro") {
          const rel = path.relative(path.join(repoRoot, "src", "pages"), full);
          const parts = rel.split(path.sep);
          if (parts.length >= 2 && (parts[0] === "en" || parts[0] === "zh" || parts[0] === "[lang]")) {
            const fileStem = parts[parts.length - 1].replace(".astro", "");
            const subDirs = parts.slice(1, -1);
            const langs = (parts[0] === "[lang]") ? ["en", "zh"] : [parts[0]];
            for (const lang of langs) {
              const htmlPath = path.join("dist", lang, ...subDirs, fileStem, "index.html").replace(/\\/g, "/");
              map.set(htmlPath, full);
            }
          }
        } else if (full.includes(`${path.sep}src${path.sep}content${path.sep}blog${path.sep}`) && ext === ".md") {
          const slug = path.basename(full, ".md");
          for (const lang of ["en", "zh"]) {
            const htmlPath = path.join("dist", lang, "blog", slug, "index.html").replace(/\\/g, "/");
            map.set(htmlPath, full);
          }
        }
      }
    }
  }
  walk(path.join(repoRoot, "src"));
  return map;
}

function normalizePath(p, repoRoot) {
  if (!p) return null;
  let normalized = p.replace(/\\/g, "/");
  // Strip repoRoot prefix if present
  const root = repoRoot.replace(/\\/g, "/");
  if (normalized.startsWith(root)) {
    normalized = normalized.slice(root.length).replace(/^\/+/, "");
  }
  return normalized;
}

export function getMtimeForHtmlPath(htmlPath) {
  if (!_map) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    _repoRoot = path.resolve(here, "..", "..");
    _map = buildMap(_repoRoot);
  }
  const normalized = normalizePath(htmlPath, _repoRoot);
  if (!normalized) return null;
  const srcPath = _map.get(normalized);
  if (!srcPath) return null;
  try {
    return fs.statSync(srcPath).mtime;
  } catch {
    return null;
  }
}

export function _resetMap() {
  _map = null;
  _repoRoot = null;
}

export function _mapSize() {
  if (!_map) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    _repoRoot = path.resolve(here, "..", "..");
    _map = buildMap(_repoRoot);
  }
  return _map.size;
}