const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn('Skipping invalid JSON:', filePath, error.message);
    return null;
  }
}

function collect(dirRelative) {
  const dir = path.join(root, dirRelative);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
  const items = [];
  files.forEach((name) => {
    const data = readJsonSafe(path.join(dir, name));
    if (data && typeof data === 'object') items.push(data);
  });
  return items;
}

function writeJson(fileRelative, data) {
  const target = path.join(root, fileRelative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
  console.log('Wrote', fileRelative, 'with', Array.isArray(data.items) ? data.items.length : 0, 'items');
}

function buildCollection(sourceDir, targetFile) {
  const items = collect(sourceDir);
  writeJson(targetFile, { items });
}

buildCollection('content/music', 'content/music.json');
buildCollection('content/videos', 'content/videos.json');
buildCollection('content/live', 'content/live.json');
buildCollection('content/press', 'content/press.json');
buildCollection('content/photos', 'content/photos.json');

function buildTexts() {
  const lyrics = collect('content/el/lyrics');
  const writings = collect('content/el/writings');
  writeJson('content/el/texts.json', { lyrics, writings });
}

buildTexts();

console.log('CMS content build complete.');
