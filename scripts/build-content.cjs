const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let hadErrors = false;

function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    hadErrors = true;
    console.warn('Skipping invalid JSON:', filePath, '-', error.message);
    return null;
  }
}

function collect(dirRelative) {
  const dir = path.join(root, dirRelative);
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  } catch (error) {
    console.warn('Skipping missing directory:', dirRelative);
    return [];
  }
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith('.json'));
  } catch (error) {
    hadErrors = true;
    console.warn('Could not read directory:', dirRelative, '-', error.message);
    return [];
  }
  const items = [];
  files.forEach((name) => {
    const filePath = path.join(dir, name);
    try {
      if (!fs.statSync(filePath).isFile()) return;
    } catch (error) {
      return;
    }
    const data = readJsonSafe(filePath);
    if (data && typeof data === 'object' && !Array.isArray(data)) items.push(data);
  });
  return items;
}

function writeJson(fileRelative, data) {
  try {
    const target = path.join(root, fileRelative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
    const count = Array.isArray(data.items) ? data.items.length : Array.isArray(data.lyrics) ? data.lyrics.length + (data.writings ? data.writings.length : 0) : 0;
    console.log('Wrote', fileRelative, 'with', count, 'entries');
  } catch (error) {
    hadErrors = true;
    console.warn('Failed to write:', fileRelative, '-', error.message);
  }
}

function buildCollection(sourceDir, targetFile) {
  const items = collect(sourceDir);
  writeJson(targetFile, { items });
}

try {
  buildCollection('content/music', 'content/music.json');
  buildCollection('content/videos', 'content/videos.json');
  buildCollection('content/live', 'content/live.json');
  buildCollection('content/press', 'content/press.json');
  buildCollection('content/photos', 'content/photos.json');

  const lyrics = collect('content/el/lyrics');
  const writings = collect('content/el/writings');
  writeJson('content/el/texts.json', { lyrics, writings });
} catch (error) {
  hadErrors = true;
  console.warn('Unexpected build error:', error.message);
}

if (hadErrors) {
  console.warn('CMS content build finished with warnings (non-fatal).');
} else {
  console.log('CMS content build complete.');
}

process.exit(0);
