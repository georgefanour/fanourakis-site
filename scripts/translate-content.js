const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const DEST_DIR = path.join(ROOT, 'content', 'en');
const CACHE_PATH = path.join(ROOT, 'content', '.translation-cache.json');

const SOURCE_DIRS = [
  { dir: CONTENT_DIR, exclude: new Set(['en', 'el']) },
  { dir: path.join(CONTENT_DIR, 'el'), exclude: new Set() }
];

const SKIP_KEYS = new Set([
  'url', 'link', 'href', 'src', 'path', 'image', 'cover', 'thumbnail', 'logo', 'logoimage',
  'slug', 'id', 'order', 'date', 'type', 'releasetype', 'category', 'email', 'alt',
  'instagramurl', 'youtubeurl', 'spotifyurl', 'facebookurl', 'tiktokurl', 'bandcampurl', 'ticketurl', 'contactemail', 'featured'
]);

function loadJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}
function saveJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

let cache = loadJSON(CACHE_PATH, {});

function isUrlLike(str) {
  return /^https?:\/\//i.test(str) ||
    /^\/?(fanourakis-site\/)?assets\//i.test(str) ||
    /\.(jpg|jpeg|png|gif|svg|webp|mp4|mp3|json)(\?.*)?$/i.test(str);
}

function isTranslatable(key, value) {
  if (typeof value !== 'string') return false;
  if (!value.trim()) return false;
  if (SKIP_KEYS.has(String(key).toLowerCase())) return false;
  if (isUrlLike(value)) return false;
  if (!/[a-zA-Z\u0370-\u03ff\u1f00-\u1fff]/.test(value)) return false;
  return true;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function translateChunk(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=el|en`;
  const res = await fetch(url);
  const data = await res.json();
  const translated = data && data.responseData && data.responseData.translatedText;
  if (!translated) throw new Error('No translation returned');
  return translated;
}

function splitIntoChunks(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const parts = text.split(/(?<=[.!?;\n])\s+/);
  const chunks = [];
  let cur = '';
  for (const part of parts) {
    if ((cur + ' ' + part).trim().length > maxLen && cur) {
      chunks.push(cur.trim());
      cur = part;
    } else {
      cur = (cur ? cur + ' ' : '') + part;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function translateText(text) {
  const paragraphs = text.split('\n');
  const translatedParagraphs = [];
  for (const para of paragraphs) {
    if (!para.trim()) { translatedParagraphs.push(para); continue; }
    const chunks = splitIntoChunks(para, 450);
    const translatedChunks = [];
    for (const chunk of chunks) {
      let attempt = 0;
      let done = false;
      while (attempt < 3 && !done) {
        try {
          const t = await translateChunk(chunk);
          translatedChunks.push(t);
          done = true;
        } catch (e) {
          attempt++;
          await sleep(600);
        }
      }
      if (!done) translatedChunks.push(chunk);
      await sleep(300);
    }
    translatedParagraphs.push(translatedChunks.join(' '));
  }
  return translatedParagraphs.join('\n');
}

const stats = { translated: 0, reused: 0, preserved: 0, copied: 0 };

async function processNode(fieldPath, elNode, enNode) {
  if (Array.isArray(elNode)) {
    const result = [];
    for (let i = 0; i < elNode.length; i++) {
      const childEn = Array.isArray(enNode) ? enNode[i] : undefined;
      result.push(await processNode(`${fieldPath}[${i}]`, elNode[i], childEn));
    }
    return result;
  }
  if (elNode && typeof elNode === 'object') {
    const result = {};
    for (const key of Object.keys(elNode)) {
      const childEn = enNode && typeof enNode === 'object' ? enNode[key] : undefined;
      result[key] = await processNode(`${fieldPath}.${key}`, elNode[key], childEn);
    }
    return result;
  }
  const key = fieldPath.split(/[.\[]/).pop();
  if (!isTranslatable(key, elNode)) {
    stats.copied++;
    return elNode;
  }
  const cacheEntry = cache[fieldPath];
  if (cacheEntry && cacheEntry.el === elNode) {
    if (enNode === undefined || enNode === null || enNode === '' || enNode === cacheEntry.en) {
      stats.reused++;
      return cacheEntry.en;
    }
    cache[fieldPath] = { el: elNode, en: enNode };
    stats.preserved++;
    return enNode;
  }
  try {
    const translated = await translateText(elNode);
    cache[fieldPath] = { el: elNode, en: translated };
    stats.translated++;
    return translated;
  } catch (e) {
    console.error('Translation failed for', fieldPath, e.message);
    if (enNode) return enNode;
    return elNode;
  }
}

function walkJsonFilesFlat(dir, excludeTopDirs, isTop) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isTop && excludeTopDirs && excludeTopDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walkJsonFilesFlat(full, excludeTopDirs, false));
    else if (entry.isFile() && entry.name.endsWith('.json')) results.push(full);
  }
  return results;
}

function collectSources() {
  const map = new Map();
  for (const { dir, exclude } of SOURCE_DIRS) {
    const files = walkJsonFilesFlat(dir, exclude, true);
    for (const f of files) {
      const rel = path.relative(dir, f).split(path.sep).join('/');
      map.set(rel, f);
    }
  }
  return map;
}

async function main() {
  const sourceMap = collectSources();
  console.log(`Found ${sourceMap.size} source JSON files to sync`);
  for (const [relPath, srcFile] of sourceMap) {
    const destFile = path.join(DEST_DIR, relPath);
    const elData = loadJSON(srcFile, null);
    if (elData === null) { console.warn('Skipping unreadable file', srcFile); continue; }
    const enData = loadJSON(destFile, {});
    const fileKey = relPath.replace(/\.json$/, '');
    const translated = await processNode(fileKey, elData, enData);
    saveJSON(destFile, translated);
    console.log('Processed', relPath);
  }
  saveJSON(CACHE_PATH, cache);
  console.log('Stats:', stats);
}

main().catch(e => { console.error(e); process.exit(1); });
