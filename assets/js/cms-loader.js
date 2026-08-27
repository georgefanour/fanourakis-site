/* Pages CMS frontend loader. The existing static markup remains the fallback. */
(async function () {
  const get = async (path) => {
    const response = await fetch(path + '?v=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('CMS content unavailable: ' + path);
    return response.json();
  };
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sort = (items=[]) => [...items].sort((a,b) => (a.order ?? 999) - (b.order ?? 999));
  try {
    const [about, texts, music, videos, live, press, photos] = await Promise.all([
      get('content/el/about.json'), get('content/el/texts.json'), get('content/music.json'), get('content/videos.json'), get('content/live.json'), get('content/press.json'), get('content/photos.json')
    ]);
    const aboutText = document.querySelector('.about-text');
    if (aboutText && about.text) aboutText.textContent = about.text;
    const musicGrid = document.querySelector('.release-grid');
    if (musicGrid && Array.isArray(music.items)) musicGrid.innerHTML = sort(music.items).map(i => `<article class="release-card reveal show"><div class="release-art"><img src="${esc(i.cover)}" alt="${esc(i.title)}"></div><div class="release-body">${i.featured ? '<span class="badge">Πιο πρόσφατη</span>' : ''}<h3>${esc(i.title)}</h3><p>${esc(i.release_type)} · ${esc(i.year)}</p><div class="release-actions">${i.youtube_url ? `<a href="${esc(i.youtube_url)}" target="_blank" rel="noopener">Δες video ↗</a>` : ''}${i.spotify_url ? `<a href="${esc(i.spotify_url)}" target="_blank" rel="noopener">Άκουσε ↗</a>` : ''}</div></div></article>`).join('');
    const videoGrid = document.querySelector('.video-grid');
    if (videoGrid && Array.isArray(videos.items)) videoGrid.innerHTML = sort(videos.items).map(i => `<article class="video-card reveal show" data-category="${esc(i.category)}"><div class="embed"><iframe src="${esc(i.youtube_url)}" title="${esc(i.title)}" loading="lazy" allowfullscreen></iframe></div><div class="video-info"><p class="eyebrow">${esc(i.category)}</p><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p></div></article>`).join('');
    const liveGrid = document.querySelector('.live-grid');
    if (liveGrid && Array.isArray(live.items)) liveGrid.innerHTML = sort(live.items).map(i => `<article class="live-card reveal show"><img src="${esc(i.image)}" alt="${esc(i.alt || i.title)}"><div class="live-label">${esc(i.title)}<small>${esc(i.venue || i.status || 'Live')}</small></div></article>`).join('');
    const pressGrid = document.querySelector('.press-grid');
    if (pressGrid && Array.isArray(press.items)) pressGrid.innerHTML = sort(press.items).map(i => `<article class="press-card reveal show"><div><span class="press-type">${esc(i.type)}</span><h3>${esc(i.title)}</h3><p>${esc(i.excerpt)}</p></div>${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">Άνοιξε ↗</a>` : ''}</article>`).join('');
    const gallery = document.querySelector('.masonry');
    if (gallery && Array.isArray(photos.items)) gallery.innerHTML = sort(photos.items).map(i => `<button class="photo" data-full="${esc(i.image)}"><img loading="lazy" src="${esc(i.image)}" alt="${esc(i.alt || i.title)}"></button>`).join('');
    const lyricsList = document.getElementById('lyrics-list'), writingsList = document.getElementById('writings-list');
    const setTextList = (el, items=[]) => { if (!el) return; el.innerHTML = sort(items).map((i,n) => `<button data-cms-title="${esc(i.title)}" data-cms-body="${esc(i.body)}"><span>${esc(i.title)}</span><b>${String(n+1).padStart(2,'0')} ↗</b></button>`).join(''); };
    setTextList(lyricsList, texts.lyrics); setTextList(writingsList, texts.writings);
    document.querySelectorAll('[data-cms-title]').forEach(b => b.addEventListener('click', () => { const panel=document.getElementById('word-panel'); document.getElementById('word-title').textContent=b.dataset.cmsTitle; document.getElementById('word-body').textContent=b.dataset.cmsBody; panel.classList.add('open'); panel.scrollIntoView({behavior:'smooth',block:'start'}); }));
    document.querySelectorAll('.photo').forEach(p => p.addEventListener('click', () => { const box=document.getElementById('lightbox'); const image=box.querySelector('img'); image.src=p.dataset.full; image.alt=p.querySelector('img').alt; box.classList.add('open'); }));
  } catch (error) { console.warn('Pages CMS loader is using the built-in fallback content.', error); }
})();
