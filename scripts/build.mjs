import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const photosDir = path.resolve('content/photos');
const indexPath = path.resolve('index.html');
const startMarker = '<!-- CMS_GALLERY_START -->';
const endMarker = '<!-- CMS_GALLERY_END -->';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

let files = [];
try { files = (await readdir(photosDir)).filter(file => file.endsWith('.json')); } catch {}
const photos = await Promise.all(files.sort().map(async file => JSON.parse(await readFile(path.join(photosDir, file), 'utf8'))));
const gallery = photos.map(photo => {
  const image = escapeHtml(photo.image);
  const alt = escapeHtml(photo.alt || photo.title || 'Φωτογραφία');
  return `<button class=\"photo cms-photo\" data-full=\"${image}\"><img loading=\"lazy\" src=\"${image}\" alt=\"${alt}\"></button>`;
}).join('');

const html = await readFile(indexPath, 'utf8');
if (!html.includes(startMarker) || !html.includes(endMarker)) {
  throw new Error('CMS gallery markers were not found in index.html');
}
const updated = html.replace(new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`), `${startMarker}${gallery}${endMarker}`);
await writeFile(indexPath, updated);
