/* Resilient Pages CMS loader: each content collection loads independently. */
(async function () {
  const get = async (path) => {
    const response = await fetch(path + '?v=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('CMS content unavailable: ' + path);
    return response.json();
  };
  const load = async (path) => {
    try { return await get(path); }
    catch (error) { console.warn('CMS skipped unavailable content:', path, error); return null; }
  };
  const esc = (v = '') => String(v).replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const sort = (items = []) => [...items].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const html = (selector, content) => { const node = document.querySelector(selector); if (node && content) node.innerHTML = content; };
  const one = (selector) => document.querySelector(selector);

  const [about, texts, music, videos, live, press, photos] = await Promise.all([
    load('content/el/about.json'),
    load('content/el/texts.json'),
    load('content/music.json'),
    load('content/videos.json'),
    load('content/live.json'),
    load('content/press.json'),
    load('content/photos.json')
  ]);

  if (about?.text) { const node = one('.about-text'); if (node) node.textContent = about.text; }

  if (Array.isArray(music?.items)) html('.release-grid', sort(music.items).map(i => `
    <article class=\"release-card reveal show\">
      <div class=\"release-art\"><img src=\"${esc(i.cover)}\" alt=\"${esc(i.title)}\"></div>
      <div class=\"release-body\">
        ${i.featured ? '<span class=\"badge\">Πιο πρόσφατη</span>' : ''}
        <h3>${esc(i.title)}</h3><p>${esc(i.release_type)} · ${esc(i.year)}</p>
        <div class=\"release-actions\">
          ${i.youtube_url ? `<a href=\"${esc(i.youtube_url)}\" target=\"_blank\" rel=\"noopener\">Δες video ↗</a>` : ''}
          ${i.spotify_url ? `<a href=\"${esc(i.spotify_url)}\" target=\"_blank\" rel=\"noopener\">Άκουσε ↗</a>` : ''}
        </div>
      </div>
    </article>`).join(''));

  if (Array.isArray(videos?.items)) html('.video-grid', sort(videos.items).map(i => `
    <article class=\"video-card reveal show\" data-category=\"${esc(i.category)}\">
      <div class=\"embed\"><iframe src=\"${esc(i.youtube_url)}\" title=\"${esc(i.title)}\" loading=\"lazy\" allowfullscreen></iframe></div>
      <div class=\"video-info\"><p class=\"eyebrow\">${esc(i.category)}</p><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p></div>
    </article>`).join(''));

  if (Array.isArray(live?.items)) html('.live-grid', sort(live.items).map(i => `
    <article class=\"live-card reveal show\">
      <img src=\"${esc(i.image)}\" alt=\"${esc(i.alt || i.title)}\">
      <div class=\"live-label\">${esc(i.title)}<small>${esc(i.venue || i.city || i.status || 'Live')}</small></div>
    </article>`).join(''));

  if (Array.isArray(press?.items)) html('.press-grid', sort(press.items).map(i => `
    <article class=\"press-card reveal show\">
      <div><span class=\"press-type\">${esc(i.type)}</span><h3>${esc(i.title)}</h3><p>${esc(i.excerpt)}</p></div>
      ${i.url ? `<a href=\"${esc(i.url)}\" target=\"_blank\" rel=\"noopener\">Άνοιξε ↗</a>` : ''}
    </article>`).join(''));

  if (Array.isArray(photos?.items)) {
    html('.masonry', sort(photos.items).map(i => `<button class=\"photo\" data-full=\"${esc(i.image)}\"><img loading=\"lazy\" src=\"${esc(i.image)}\" alt=\"${esc(i.alt || i.title)}\"></button>`).join(''));
    document.querySelectorAll('.photo').forEach(p => p.addEventListener('click', () => {
      const box = one('#lightbox');
      const image = box?.querySelector('img');
      if (!box || !image) return;
      image.src = p.dataset.full;
      image.alt = p.querySelector('img')?.alt || '';
      box.classList.add('open');
    }));
  }

  const setTextList = (element, items = []) => {
    if (!element || !Array.isArray(items)) return;
    element.innerHTML = sort(items).map((i, n) => `<button data-cms-title=\"${esc(i.title)}\" data-cms-body=\"${esc(i.body)}\"><span>${esc(i.title)}</span><b>${String(n + 1).padStart(2, '0')} ↗</b></button>`).join('');
  };
  setTextList(document.getElementById('lyrics-list'), texts?.lyrics);
  setTextList(document.getElementById('writings-list'), texts?.writings);
  document.querySelectorAll('[data-cms-title]').forEach(button => button.addEventListener('click', () => {
    const panel = one('#word-panel');
    const title = one('#word-title');
    const body = one('#word-body');
    if (!panel || !title || !body) return;
    title.textContent = button.dataset.cmsTitle || '';
    body.textContent = button.dataset.cmsBody || '';
    panel.classList.add('open');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
})();
