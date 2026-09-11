/* CMS loader for fanourakis-site markup. EL/EN via .lang with localStorage. Newsletter removed. Adds release chips + arrow carousels. */
(function () {
  'use strict';

  var LANG_KEY = 'site_lang';

  function currentLang() {
    try {
      var stored = localStorage.getItem(LANG_KEY);
      if (stored === 'en' || stored === 'el') return stored;
    } catch (e) {}
    return 'el';
  }

  function applyActiveLangButton(lang) {
    document.querySelectorAll('.lang').forEach(function (btn) {
      var isEn = /en/i.test(btn.textContent || '') || btn.getAttribute('data-lang') === 'en';
      var isThis = lang === 'en' ? isEn : !isEn;
      btn.classList.toggle('active', isThis);
    });
  }

  function normalizePath(value) {
    if (!value) return value;
    var str = String(value).trim();
    if (!str) return str;
    if (/^https?:\/\//i.test(str)) return str;
    if (str.indexOf('/') === 0) return str.slice(1);
    return str;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function renderMultiline(value) {
    var escaped = escapeHtml(value);
    escaped = escaped.replace(/  /g, ' &nbsp;');
    escaped = escaped.replace(/\r\n|\r|\n/g, '<br>');
    return escaped;
  }
    function applyClamp5(el) {
    if (!el || el.dataset.clampBound === '1') return;
    el.dataset.clampBound = '1';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'word-toggle';
    toggle.hidden = true;
    el.insertAdjacentElement('afterend', toggle);

    var clampedHeight = 0;
    var expanded = false;

    function updateLabel() {
      toggle.textContent = expanded
        ? (lang === 'en' ? 'Read less ↑' : 'Διάβασε λιγότερα ↑')
        : (lang === 'en' ? 'Read more ↗' : 'Διάβασε περισσότερα ↗');
    }

    function collapse() {
      el.style.maxHeight = clampedHeight + 'px';
      el.style.overflow = 'hidden';
      expanded = false;
      updateLabel();
    }

    function expand() {
      el.style.maxHeight = '';
      el.style.overflow = '';
      expanded = true;
      updateLabel();
    }

    toggle.addEventListener('click', function () {
      if (expanded) collapse();
      else expand();
    });

    requestAnimationFrame(function () {
      var lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      if (!lineHeight || isNaN(lineHeight)) lineHeight = 22;
      clampedHeight = lineHeight * 5;

      if (el.scrollHeight > clampedHeight + 2) {
        toggle.hidden = false;
        collapse();
      }
    });
  }

  function bindReleaseInfoPanel() {
    var panel = document.getElementById('release-info-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'panel';
      panel.id = 'release-info-panel';
      panel.innerHTML = '<div class="panel-blur-bg" aria-hidden="true"></div><div class="container"><button class="close-panel" data-release-info-close>' + (lang === 'en' ? '← Back to discography' : '← Επιστροφή στη δισκογραφία') + '</button><div class="panel-grid"><div class="panel-art"><img id="release-info-img" alt=""></div><div class="panel-copy"><p class="release-meta" id="release-info-eyebrow"></p><h2 class="section-title" id="release-info-title"></h2><div class="copy" id="release-info-desc"></div><a href="#lyrics" class="btn dark" id="release-info-lyrics-btn">' + (lang === 'en' ? 'See lyrics ↗' : 'Δες στίχους ↗') + '</a></div></div></div>';
      document.body.appendChild(panel);
      panel.querySelector('[data-release-info-close]').addEventListener('click', function () {
        panel.classList.remove('open');
        var music = document.getElementById('music');
        if (music) music.scrollIntoView({ behavior: 'smooth' });
      });
      panel.querySelector('#release-info-lyrics-btn').addEventListener('click', function (e) {
        e.preventDefault();
        var releaseTitle = this.dataset.release || '';
        jumpToLyricsRelease(releaseTitle);
      });
    }

    document.querySelectorAll('.release-info-btn').forEach(function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var data = (window.__releaseInfoStore || {})[btn.dataset.releaseIdx];
        if (!data) return;
                panel.querySelector('#release-info-eyebrow').textContent = [data.releaseType, data.year].filter(Boolean).join(' · ') || (lang === 'en' ? 'Release' : 'Κυκλοφορία');
        panel.querySelector('#release-info-title').textContent = data.title;
        var lyricsBtn = panel.querySelector('#release-info-lyrics-btn');
        if (lyricsBtn) lyricsBtn.dataset.release = data.title || '';
        panel.querySelector('#release-info-img').src = data.cover;
        var blurBg = panel.querySelector('.panel-blur-bg');
        if (blurBg) blurBg.style.backgroundImage = 'url(' + data.cover + ')';
        var descHtml = '';
        if (data.desc) descHtml += '<p>' + renderMultiline(data.desc) + '</p>';
        if (data.note) descHtml += '<p>' + renderMultiline(data.note) + '</p>';
        panel.querySelector('#release-info-desc').innerHTML = descHtml;
        panel.classList.add('open');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function ordered(items) {
    return (Array.isArray(items) ? items.slice() : []).sort(function (a, b) {
      return (Number(a.order) || 999) - (Number(b.order) || 999);
    });
  }

  function request(path) {
    return fetch(path + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error(response.status + ' ' + path);
        return response.json();
      });
  }

  function render(selector, markup, label) {
    var target = document.querySelector(selector);
    if (!target) {
      console.warn('[CMS] Target not found:', selector);
      return null;
    }
    target.innerHTML = markup;
    console.info('[CMS] Rendered ' + label);
    return target;
  }

  function setText(el, value) {
    if (el && value != null && value !== '') el.textContent = value;
  }

  function setHtml(el, value) {
    if (el && value != null && value !== '') el.innerHTML = renderMultiline(value);
  }

  function load(path, callback) {
    request(path)
      .then(function (data) { callback(data || {}); })
      .catch(function (error) { console.warn('[CMS] Keeping static fallback for ' + path, error); });
  }

  function extractYouTubeId(url) {
    if (!url) return '';
    var match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i);
    return match ? match[1] : '';
  }

  function bindPhotoLightbox() {
    var box = document.getElementById('lightbox');
    var image = box ? box.querySelector('img') : null;
    var photos = document.querySelectorAll('.masonry .photo');
    for (var i = 0; i < photos.length; i += 1) {
      photos[i].addEventListener('click', function () {
        if (!box || !image) return;
        image.src = this.getAttribute('data-full') || '';
        image.alt = this.querySelector('img') ? this.querySelector('img').alt : '';
        box.classList.add('open');
      });
    }
  }

  function bindVideoFilters() {
    var filters = document.querySelectorAll('.filter');
    var cards = document.querySelectorAll('.video-card');
    if (!filters.length) return;
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filters.forEach(function (x) { x.classList.remove('active'); });
        btn.classList.add('active');
        var chosen = btn.dataset.filter;
        document.querySelectorAll('.video-card').forEach(function (card) {
          card.hidden = chosen !== 'all' && card.dataset.category !== chosen;
        });
      });
    });
    var activeFilter = document.querySelector('.filter.active');
    var chosen = activeFilter ? activeFilter.dataset.filter : 'all';
    cards.forEach(function (card) {
      card.hidden = chosen !== 'all' && card.dataset.category !== chosen;
    });
  }

  function bindLyricsJump() {
    document.querySelectorAll('[data-jump-lyrics]').forEach(function (link) {
      if (link.dataset.jumpBound === '1') return;
      link.dataset.jumpBound = '1';
      link.addEventListener('click', function (e) {
        e.preventDefault();
        jumpToLyricsRelease(this.getAttribute('data-jump-lyrics'));
      });
    });
  }

  function jumpToLyricsRelease(releaseTitle) {
    selectLyricsRelease(releaseTitle);
    var lyricsSection = document.getElementById('lyrics');
    if (lyricsSection) lyricsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderLyricsSection() {
    var listEl = document.getElementById('lyrics-list');
    if (!listEl) return;
    if (!window.__lyricsItems) return;

    var items = window.__lyricsItems || [];
    var releases = [];
    var seen = {};
    items.forEach(function (item) {
      var key = (item.release || '').trim().toLowerCase();
      if (!key || seen[key]) return;
      seen[key] = true;
      releases.push(item.release);
    });

    if (!releases.length) {
      listEl.innerHTML = '';
      return;
    }

    var pending = window.__pendingLyricsRelease;
    window.__pendingLyricsRelease = null;
    var target = pending && releases.some(function (r) { return r.trim().toLowerCase() === pending.trim().toLowerCase(); }) ? pending : releases[0];
    selectLyricsRelease(target);
  }

  function getLyricsSelectedCover() {
    var header = document.querySelector('.lyrics-selected-release');
    if (!header) return null;
    var img = header.querySelector('.lyrics-selected-cover');
    if (!img) {
      img = document.createElement('img');
      img.className = 'lyrics-selected-cover';
      img.loading = 'lazy';
      header.insertBefore(img, header.firstChild);
    }
    return img;
  }

  function selectLyricsRelease(releaseName) {
    var items = window.__lyricsItems;
    if (!releaseName) return;
    if (!items) { window.__pendingLyricsRelease = releaseName; return; }

    var key = releaseName.trim().toLowerCase();
    var matches = ordered(items.filter(function (i) { return (i.release || '').trim().toLowerCase() === key; }));
    if (!matches.length) { window.__pendingLyricsRelease = releaseName; return; }

    var meta = (window.__musicByTitle || {})[key] || {};
    var eyebrowEl = document.getElementById('lyrics-selected-eyebrow');
    var titleEl = document.getElementById('lyrics-selected-title');
    if (eyebrowEl) eyebrowEl.textContent = [meta.releaseType, meta.year].filter(Boolean).join(' · ');
    if (titleEl) titleEl.textContent = releaseName;

    var coverImg = getLyricsSelectedCover();
    if (coverImg) {
      coverImg.src = meta.cover || 'assets/images/placeholder-cover.jpg';
      coverImg.alt = releaseName;
    }

    var actionsEl = document.getElementById('lyrics-external-actions');
    if (actionsEl) {
      var actions = [];
      if (meta.spotify_url) actions.push('<a href="' + escapeHtml(meta.spotify_url) + '" target="_blank" rel="noopener">' + (lang === 'en' ? 'Listen on Spotify ↗' : 'Άκουσε στο Spotify ↗') + '</a>');
      if (meta.youtube_url) actions.push('<a href="' + escapeHtml(meta.youtube_url) + '" target="_blank" rel="noopener">' + (lang === 'en' ? 'Watch on YouTube ↗' : 'Δες στο YouTube ↗') + '</a>');
      actionsEl.innerHTML = actions.join('');
    }

    var listEl = document.getElementById('lyrics-list');
    if (listEl) {
      listEl.innerHTML = matches.map(function (item, index) {
        var orderNum = (item.order != null && item.order !== '') ? Number(item.order) : (index + 1);
        return '<button type="button" data-cms-title="' + escapeHtml(item.title || '') + '" data-cms-body-html="' + escapeHtml(renderMultiline(item.body || '')) + '" data-cms-credits="' + escapeHtml(JSON.stringify(item.credits || [])) + '" data-cms-spotify="' + escapeHtml(item.spotify_url || '') + '" data-cms-youtube="' + escapeHtml(item.youtube_url || '') + '"><span>' + escapeHtml(item.title || '') + '</span><b>' + String(orderNum).padStart(2, '0') + ' ↗</b></button>';
      }).join('');
    }

    bindLyricEntries();
  }

  function bindLyricEntries() {
    var panel = document.getElementById('lyric-panel');
    var titleEl = document.getElementById('lyric-title');
    var bodyEl = document.getElementById('lyric-body');
    var metaEl = document.getElementById('lyric-meta');
    var creditsEl = document.getElementById('lyric-credits');
    if (!panel || !titleEl || !bodyEl) return;

    document.querySelectorAll('#lyrics-list [data-cms-title]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        titleEl.textContent = this.getAttribute('data-cms-title') || '';
        bodyEl.innerHTML = this.getAttribute('data-cms-body-html') || '';

        var spotify = this.getAttribute('data-cms-spotify') || '';
        var youtube = this.getAttribute('data-cms-youtube') || '';
        var metaLinks = [];
        if (spotify) metaLinks.push('<a href="' + escapeHtml(spotify) + '" target="_blank" rel="noopener">Spotify ↗</a>');
        if (youtube) metaLinks.push('<a href="' + escapeHtml(youtube) + '" target="_blank" rel="noopener">YouTube ↗</a>');
        if (metaEl) { metaEl.innerHTML = metaLinks.join(' · '); metaEl.hidden = !metaLinks.length; }

        var creditsRaw = this.getAttribute('data-cms-credits');
        var creditsList = [];
        try { creditsList = creditsRaw ? JSON.parse(creditsRaw) : []; } catch (e) { creditsList = []; }
        if (creditsEl) {
          creditsEl.innerHTML = creditsList.map(function (c) {
            return '<li><b>' + escapeHtml(c.title || '') + '</b>' + escapeHtml(c.content || '') + '</li>';
          }).join('');
          creditsEl.hidden = !creditsList.length;
        }

        panel.classList.add('open');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    var closeBtn = document.getElementById('close-lyric');
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', function () {
        panel.classList.remove('open');
        var lyricsSection = document.getElementById('lyrics');
        if (lyricsSection) lyricsSection.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  function renderWritingsSection() {
    var grid = document.getElementById('writings-list');
    var pager = document.getElementById('writings-pagination');
    if (!grid) return;
    if (!window.__writingsItems) return;

    var items = ordered(window.__writingsItems || []);
    if (!items.length) {
      grid.innerHTML = '';
      if (pager) pager.innerHTML = '';
      return;
    }

    var perPage = window.innerWidth <= 560 ? 3 : 6;
    var totalPages = Math.max(1, Math.ceil(items.length / perPage));
    var currentPage = Math.min(window.__writingsPage || 1, totalPages);

    function excerpt(text) {
      var plain = String(text || '').replace(/\s+/g, ' ').trim();
      return plain.length > 140 ? plain.slice(0, 140).trim() + '…' : plain;
    }

    function renderPage(page) {
      currentPage = page;
      window.__writingsPage = page;
      var start = (page - 1) * perPage;
      var pageItems = items.slice(start, start + perPage);

      grid.innerHTML = pageItems.map(function (item) {
        return '<button type="button" class="writing-card" data-cms-title="' + escapeHtml(item.title || '') + '" data-cms-body-html="' + escapeHtml(renderMultiline(item.body || '')) + '" data-cms-meta="' + escapeHtml(item.date || '') + '">' +
          (item.date ? '<b>' + escapeHtml(item.date) + '</b>' : '') +
          '<h4>' + escapeHtml(item.title || '') + '</h4>' +
          '<p>' + escapeHtml(excerpt(item.body)) + '</p>' +
          '<span>' + (lang === 'en' ? 'Read the text →' : 'Διάβασε το κείμενο →') + '</span>' +
          '</button>';
      }).join('');

      if (pager) {
        var pageBtns = [];
        pageBtns.push('<button type="button" data-page="prev"' + (page === 1 ? ' disabled' : '') + ' aria-label="' + (lang === 'en' ? 'Previous' : 'Προηγούμενο') + '">‹</button>');
        for (var i = 1; i <= totalPages; i++) {
          pageBtns.push('<button type="button" data-page="' + i + '" class="' + (i === page ? 'active' : '') + '">' + i + '</button>');
        }
        pageBtns.push('<button type="button" data-page="next"' + (page === totalPages ? ' disabled' : '') + ' aria-label="' + (lang === 'en' ? 'Next' : 'Επόμενο') + '">›</button>');
        pager.innerHTML = pageBtns.join('');

        pager.querySelectorAll('button[data-page]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var val = this.getAttribute('data-page');
            var targetPage = val === 'prev' ? currentPage - 1 : (val === 'next' ? currentPage + 1 : Number(val));
            if (targetPage < 1 || targetPage > totalPages) return;
            renderPage(targetPage);
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }

      bindWritingEntries();
    }

    renderPage(currentPage);
  }

  function bindWritingEntries() {
    var panel = document.getElementById('writing-panel');
    var titleEl = document.getElementById('writing-title');
    var bodyEl = document.getElementById('writing-body');
    var metaEl = document.getElementById('writing-meta');
    if (!panel || !titleEl || !bodyEl) return;

    document.querySelectorAll('#writings-list [data-cms-title]').forEach(function (card) {
      card.addEventListener('click', function () {
        titleEl.textContent = this.getAttribute('data-cms-title') || '';
        bodyEl.innerHTML = this.getAttribute('data-cms-body-html') || '';
        var meta = this.getAttribute('data-cms-meta') || '';
        if (metaEl) { metaEl.textContent = meta; metaEl.hidden = !meta; }
        panel.classList.add('open');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    var closeBtn = document.getElementById('close-writing');
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', function () {
        panel.classList.remove('open');
        var writingsSection = document.getElementById('writings');
        if (writingsSection) writingsSection.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  function decoratePressCarousel() {
    var track = document.querySelector('.press-grid');
    if (!track || track.dataset.pressDecorated === '1') return;
    track.dataset.pressDecorated = '1';

    var cards = Array.prototype.slice.call(track.querySelectorAll('.press-card'));
    if (!cards.length) return;

    var glow = document.createElement('div');
    glow.className = 'press-carousel-blur';
    glow.setAttribute('aria-hidden', 'true');
    track.parentNode.insertBefore(glow, track);

    function nearestCard() {
      var center = track.scrollLeft + track.clientWidth / 2;
      var closest = cards[0];
      var smallest = Infinity;

      cards.forEach(function (card) {
        var cardCenter = card.offsetLeft + card.offsetWidth / 2;
        var distance = Math.abs(cardCenter - center);
        if (distance < smallest) {
          smallest = distance;
          closest = card;
        }
      });

      return closest;
    }

    function updatePressFocus() {
      var active = nearestCard();

      cards.forEach(function (card) {
        card.classList.toggle('press-focus', card === active);
      });

      var image = active ? active.querySelector('img') : null;
      var source = image ? image.currentSrc || image.src : '';

      if (source) {
        glow.style.backgroundImage = 'url("' + source.replace(/"/g, '\\"') + '")';
        glow.classList.add('has-image');
      } else {
        glow.style.backgroundImage = '';
        glow.classList.remove('has-image');
      }
    }

    var timer;
    track.addEventListener('scroll', function () {
      clearTimeout(timer);
      timer = setTimeout(updatePressFocus, 70);
    }, { passive: true });

    requestAnimationFrame(function () {
      updatePressFocus();
      setTimeout(updatePressFocus, 120);
    });
  }
  function buildCarousel(containerSelector, itemSelector) {
    var container = document.querySelector(containerSelector);
    if (!container || container.dataset.carouselReady) return;
    var items = Array.prototype.slice.call(container.querySelectorAll(itemSelector));
    if (items.length < 2) return;
    container.dataset.carouselReady = '1';
    container.classList.add('cms-carousel-track');
    var wrap = document.createElement('div');
    wrap.className = 'cms-carousel-wrap';
    container.parentNode.insertBefore(wrap, container);
    wrap.appendChild(container);

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'cms-carousel-arrow cms-carousel-prev';
    prev.setAttribute('aria-label', 'Προηγούμενο');
    prev.innerHTML = '←';
    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'cms-carousel-arrow cms-carousel-next';
    next.setAttribute('aria-label', 'Επόμενο');
    next.innerHTML = '→';
    wrap.appendChild(prev);
    wrap.appendChild(next);

    var dots = document.createElement('div');
    dots.className = 'cms-carousel-dots';
    items.forEach(function (_, i) {
      var dot = document.createElement('span');
      dot.className = 'cms-carousel-dot' + (i === 0 ? ' active' : '');
      dots.appendChild(dot);
    });
    wrap.parentNode.insertBefore(dots, wrap.nextSibling);

    var activeIndex = 0;

    function nearestIndex() {
      var center = container.scrollLeft + container.clientWidth / 2;
      var closest = 0;
      var closestDist = Infinity;
      items.forEach(function (item, i) {
        var itemCenter = item.offsetLeft + item.offsetWidth / 2;
        var dist = Math.abs(itemCenter - center);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      return closest;
    }

    function applyDepth() {
      activeIndex = nearestIndex();
      items.forEach(function (item, i) {
        var dist = Math.abs(i - activeIndex);
        if (dist === 0) {
          item.style.transform = 'scale(1)';
          item.style.opacity = '1';
          item.style.zIndex = '3';
        } else if (dist === 1) {
          item.style.transform = 'scale(.9)';
          item.style.opacity = '.5';
          item.style.zIndex = '2';
        } else {
          item.style.transform = 'scale(.82)';
          item.style.opacity = '.25';
          item.style.zIndex = '1';
        }
      });
      dots.querySelectorAll('.cms-carousel-dot').forEach(function (d, i) {
        d.classList.toggle('active', i === activeIndex);
      });
      prev.disabled = activeIndex === 0;
      next.disabled = activeIndex === items.length - 1;
    }

    function goTo(index) {
      var clamped = Math.max(0, Math.min(index, items.length - 1));
      var target = items[clamped];
      container.scrollTo({
        left: target.offsetLeft - (container.clientWidth - target.offsetWidth) / 2,
        behavior: 'smooth'
      });
    }

    prev.addEventListener('click', function () { goTo(activeIndex - 1); });
    next.addEventListener('click', function () { goTo(activeIndex + 1); });
    dots.querySelectorAll('.cms-carousel-dot').forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); });
    });

    var scrollTimeout;
    container.addEventListener('scroll', function () {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(applyDepth, 60);
    }, { passive: true });

    if (!document.getElementById('cms-carousel-style')) {
      var style = document.createElement('style');
      style.id = 'cms-carousel-style';
      style.textContent =
        '.cms-carousel-wrap{position:relative;display:flex;align-items:center;gap:10px}' +
        '.cms-carousel-track{display:flex !important;grid-template-columns:none !important;' +
        'align-items:flex-start;overflow-x:auto;scroll-snap-type:x mandatory;' +
        '-webkit-overflow-scrolling:touch;gap:26px;padding:20px calc(50% - 110px) 30px;' +
        'scrollbar-width:none}' +
        '.cms-carousel-track::-webkit-scrollbar{display:none}' +
        '.cms-carousel-track>*{scroll-snap-align:center;flex:0 0 auto;' +
        'width:min(78vw,300px);transition:transform .45s cubic-bezier(.22,.9,.32,1),opacity .45s ease;' +
        'transform-origin:center center}' +
        '@media (min-width:640px){.cms-carousel-track{padding:24px calc(50% - 140px) 34px}' +
        '.cms-carousel-track>*{width:min(58vw,300px)}}' +
        '@media (min-width:1024px){.cms-carousel-track{padding:30px calc(50% - 160px) 40px}' +
        '.cms-carousel-track>*{width:320px}}' +
        '.cms-carousel-track .release-art{aspect-ratio:1;border-radius:16px;overflow:hidden}' +
        '.cms-carousel-track.masonry .photo{aspect-ratio:1;border-radius:16px}' +
        '.cms-carousel-track .press-card{min-height:280px}' +
        '.cms-carousel-arrow{flex:0 0 auto;position:relative;width:44px;height:44px;' +
        'border-radius:50%;border:0;background:var(--acid,#d8ff3e);color:var(--ink,#0a0712);' +
        'font-size:1.2rem;cursor:pointer;display:grid;place-items:center;z-index:5;' +
        'box-shadow:0 6px 16px rgba(0,0,0,.35);transition:transform .2s ease}' +
        '.cms-carousel-arrow:hover:not(:disabled){transform:scale(1.1)}' +
        '.cms-carousel-arrow:disabled{opacity:.25;cursor:default}' +
        '.cms-carousel-dots{display:flex;gap:7px;justify-content:center;margin-top:6px}' +
        '.cms-carousel-dot{width:8px;height:8px;border-radius:50%;background:rgba(10,7,18,.25);' +
        'cursor:pointer;transition:transform .2s ease,background .2s ease}' +
        '.cms-carousel-dot.active{background:var(--acid,#d8ff3e);transform:scale(1.35)}' +
        '@media (max-width:720px){.cms-carousel-arrow{width:38px;height:38px;font-size:1.05rem}' +
        '.cms-carousel-wrap{flex-wrap:wrap;justify-content:center;row-gap:14px}' +
        '.cms-carousel-track{flex:1 1 100%;order:1;padding-left:6vw;padding-right:6vw}' +
        '.cms-carousel-prev{order:2}' +
        '.cms-carousel-next{order:3}}';
      document.head.appendChild(style);
    }

    requestAnimationFrame(function () {
      goTo(0);
      setTimeout(applyDepth, 60);
    });
    window.addEventListener('resize', function () {
      clearTimeout(window.__cmsCarouselResize);
      window.__cmsCarouselResize = setTimeout(applyDepth, 150);
    });
  }

  function removeNewsletterUI() {
    var form = document.querySelector('#contact .form');
    if (form) form.remove();
    var msg = document.getElementById('message');
    if (msg) msg.remove();
    document.querySelectorAll('#contact p').forEach(function (p) {
      if (/booking|press/i.test(p.textContent || '') && p.querySelector('b')) p.remove();
    });
  }

  var lang = currentLang();
  var base = lang === 'en' ? 'content/en/' : 'content/el/';
  var rootBase = lang === 'en' ? 'content/en/' : 'content/';

  applyActiveLangButton(lang);
  document.documentElement.setAttribute('lang', lang);
  removeNewsletterUI();

  console.info('[CMS] Loader started, lang=' + lang);
  var featuredEyebrow = document.getElementById('featured-eyebrow');
var featuredExplore = document.getElementById('featured-explore-btn');
if (featuredEyebrow) featuredEyebrow.textContent = lang === 'en' ? 'Latest release' : 'Πιο πρόσφατη κυκλοφορία';
if (featuredExplore) featuredExplore.textContent = lang === 'en' ? 'Explore the discography ↗' : 'Εξερεύνησε τη δισκογραφία ↗';
  load(base + 'site.json', function (data) {
    if (!data || !Object.keys(data).length) return;
        var logoImg = document.getElementById('site-logo-img');
    var logoText = document.getElementById('site-logo-text');
    if (logoImg && logoText) {
      var logoPath = normalizePath(data.logo_image);
      if (logoPath) {
        logoImg.src = logoPath;
        logoImg.hidden = false;
        logoText.hidden = true;
      } else {
        logoImg.hidden = true;
        logoText.hidden = false;
      }
    }

    var heroSection = document.getElementById('home');
    var heroSection = document.getElementById('home');
    if (heroSection) {
      setText(heroSection.querySelector('.tag'), data.hero_tag);
      var heading = heroSection.querySelector('h1');
      if (heading && (data.hero_title_first || data.hero_title_last)) {
        heading.innerHTML = escapeHtml(data.hero_title_first || '') + (data.hero_title_last ? ' <em>' + escapeHtml(data.hero_title_last) + '</em>' : '');
      }
      setHtml(heroSection.querySelector('.hero-phrase'), data.hero_phrase);
      var actionLinks = heroSection.querySelectorAll('.actions a.btn');
      setText(actionLinks[0], data.hero_music_cta);
      setText(actionLinks[1], data.hero_live_cta);
    }
    if (data.ticker) {
      document.querySelectorAll('.ticker div span').forEach(function (span) { span.textContent = data.ticker; });
    }

    var navMap = { nav_music: 'a[href="#music"]', nav_videos: 'a[href="#videos"]', nav_live: 'a[href="#live"]', nav_writings: 'a[href="#writings"]', nav_press: 'a[href="#press"]', nav_photos: 'a[href="#photos"]', nav_about: 'a[href="#about"]', nav_contact: 'a[href="#contact"]' };
    Object.keys(navMap).forEach(function (key) {
      if (!data[key]) return;
      document.querySelectorAll('#links ' + navMap[key]).forEach(function (link) { link.textContent = data[key]; });
    });

    var sectionMap = [
      ['#music', 'music_eyebrow', 'music_title', 'music_intro'],
      ['#videos', 'videos_eyebrow', 'videos_title', 'videos_intro'],
      ['#live', 'live_eyebrow', 'live_title', 'live_intro'],
      ['#press', 'press_eyebrow', 'press_title', 'press_intro'],
      ['#photos', 'photos_eyebrow', 'photos_title', 'photos_intro']
    ];
    sectionMap.forEach(function (entry) {
      var section = document.querySelector(entry[0]);
      if (!section) return;
      var head = section.querySelector('.head, .galleryhead');
      if (!head) return;
      setText(head.querySelector('.eyebrow'), data[entry[1]]);
      setText(head.querySelector('.section-title'), data[entry[2]]);
      setHtml(head.querySelector('.copy'), data[entry[3]]);
    });

    if (data.press_note) setHtml(document.querySelector('.press-note'), data.press_note);
    else { var pn = document.querySelector('.press-note'); if (pn) pn.remove(); }

    var aboutSection = document.querySelector('#about');
    if (aboutSection) {
      setText(aboutSection.querySelector('.eyebrow'), data.about_eyebrow);
      setText(aboutSection.querySelector('a.btn'), data.about_button);
    }

   var contactSection = document.querySelector('#contact');
if (contactSection) {
  setText(contactSection.querySelector('.eyebrow'), data.contact_eyebrow);
  setText(contactSection.querySelector('h2'), data.contact_title);

  var contactRight = contactSection.querySelector('.contact-grid > div:last-child');
  var contactIntro = contactRight ? contactRight.querySelector(':scope > p') : null;
  setHtml(contactIntro, data.contact_intro);

  if (contactRight) {
    var invitation = contactRight.querySelector('.contact-message');
    if (!invitation) {
      invitation = document.createElement('p');
      invitation.className = 'contact-message';
      if (contactIntro) contactIntro.insertAdjacentElement('afterend', invitation);
      else contactRight.insertAdjacentElement('afterbegin', invitation);
    }

    if (data.contact_message) {
      invitation.innerHTML = renderMultiline(data.contact_message);
      invitation.hidden = false;
    } else {
      invitation.hidden = true;
    }

    var social = contactRight.querySelector('.social');
    if (social) {
      social.setAttribute(
        'aria-label',
        lang === 'en' ? 'Contact and social media' : 'Επικοινωνία και social media'
      );

      var emailLink = social.querySelector('.contact-email');
      if (!emailLink) {
        emailLink = document.createElement('a');
        emailLink.className = 'contact-email';
        emailLink.textContent = lang === 'en' ? 'Email ↗' : 'Email ↗';
        social.insertAdjacentElement('afterbegin', emailLink);
      }

      var email = String(data.contact_email || '').trim();
      if (email) {
        emailLink.href = 'mailto:' + email;
        emailLink.hidden = false;
      } else {
        emailLink.removeAttribute('href');
        emailLink.hidden = true;
      }

      var socialMap = {
        instagram_url: 'Instagram',
        youtube_url: 'YouTube',
        spotify_url: 'Spotify',
        facebook_url: 'Facebook',
        tiktok_url: 'TikTok'
      };

      Object.keys(socialMap).forEach(function (key) {
        var label = socialMap[key];
        var link = Array.prototype.slice.call(social.querySelectorAll('a')).filter(function (item) {
          return item.textContent.trim() === label;
        })[0];

        if (!link) return;

        var url = normalizePath(data[key]);
        if (url) {
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.removeAttribute('onclick');
          link.hidden = false;
        } else {
          link.removeAttribute('href');
          link.removeAttribute('target');
          link.removeAttribute('rel');
          link.hidden = true;
        }
      });
    }
  }

  if (!document.getElementById('cms-contact-style')) {
    var contactStyle = document.createElement('style');
    contactStyle.id = 'cms-contact-style';
    contactStyle.textContent =
      '.contact-message{' +
      'margin:clamp(24px,3vw,38px) 0 0;' +
      'max-width:620px;' +
      'padding:4px 0 4px clamp(17px,2vw,25px);' +
      'border-left:2px solid rgba(10,7,18,.72);' +
      'font-family:var(--serif,Georgia,serif);' +
      'font-size:clamp(1.35rem,2.4vw,2.1rem);' +
      'font-style:italic;' +
      'font-weight:500;' +
      'letter-spacing:-.035em;' +
      'line-height:1.15;' +
      'color:var(--ink,#0a0712)' +
      '}' +
      '.contact .social{margin-top:clamp(26px,3vw,38px)}' +
      '.contact .social a[hidden]{display:none!important}' +
      '.contact .contact-email{background:var(--ink,#0a0712);color:var(--acid,#d8ff3e);border-color:var(--ink,#0a0712)}' +
      '.contact .contact-email:hover{background:transparent;color:var(--ink,#0a0712)}';
    document.head.appendChild(contactStyle);
  }
}
    console.info('[CMS] Rendered site text (' + lang + ')');
  });

  load(base + 'about.json', function (data) {
    if (!data || !data.text) return;
    setHtml(document.querySelector('.about-text'), data.text);
    var photo = document.querySelector('.about-photo img');
    if (photo && data.image) photo.src = normalizePath(data.image);
    console.info('[CMS] Rendered about');
  });

  loadCollection(rootBase + 'music', function (items) {
    if (!items.length) return;

      render('.release-grid', ordered(items).map(function (item, idx) {
      var cover = normalizePath(item.cover) || 'assets/images/placeholder-cover.jpg';
      var youtube = normalizePath(item.youtube_url);
      var spotify = normalizePath(item.spotify_url);
      var bandcamp = normalizePath(item.bandcamp_url);
      var links = [];
links.push('<a href="#lyrics" data-jump-lyrics="' + escapeHtml(item.title || '') + '">' + (lang === 'en' ? 'See lyrics ↗' : 'Δες στίχους ↗') + '</a>');
      window.__releaseInfoStore = window.__releaseInfoStore || {};
           window.__releaseInfoStore[idx] = { title: item.title || '', desc: item.description || '', note: item.artist_note || '', credits: item.credits || '', cover: cover, releaseType: item.release_type || '', year: item.year || '' };
      window.__musicByTitle = window.__musicByTitle || {};
      if (item.title) window.__musicByTitle[item.title.trim().toLowerCase()] = { cover: cover, title: item.title || '', releaseType: item.release_type || '', year: item.year || '', spotify_url: spotify || '', youtube_url: youtube || '' };
      if (item.description || item.artist_note) {
        links.unshift('<a href="#" class="release-info-btn" data-release-idx="' + idx + '">' + (lang === 'en' ? 'About this release ↗' : 'Λίγα λόγια για τον δίσκο ↗') + '</a>');
      }

      return '<article class="release-card reveal show">' +
        '<div class="release-art" style="cursor:pointer" data-jump-lyrics="' + escapeHtml(item.title || '') + '"><img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(item.title || '') + '" loading="lazy" onerror="this.src=&quot;assets/images/placeholder-cover.jpg&quot;"></div>' +
        '<div class="release-body">' +
(item.featured ? '<span class="badge">' + (lang === 'en' ? 'Latest release' : 'Πιο πρόσφατη') + '</span>' : '') +
        '<h3 style="cursor:pointer" data-jump-lyrics="' + escapeHtml(item.title || '') + '">' + escapeHtml(item.title || '') + '</h3>' +
        '<p>' + escapeHtml(item.release_type || '') + (item.year ? ' · ' + escapeHtml(item.year) : '') + '</p>' +
        '<div class="release-actions">' + links.join('') + '</div></div></article>';
    }).join(''), 'music');

    var featuredItem = ordered(items).filter(function (item) { return item.featured; })[0] || ordered(items)[0];
    if (featuredItem) {
      var featuredSection = document.querySelector('.featured');
      if (featuredSection) {
        var fCover = normalizePath(featuredItem.cover) || 'assets/images/placeholder-cover.jpg';
        var coverImg = featuredSection.querySelector('.cover img');
        if (coverImg) { coverImg.src = fCover; coverImg.alt = featuredItem.title || ''; }

        var fTitle = featuredSection.querySelector('.section-title');
        if (fTitle) fTitle.textContent = featuredItem.title || '';

        var fMeta = featuredSection.querySelector('.release-meta');
        if (fMeta) fMeta.textContent = (featuredItem.release_type || '') + (featuredItem.year ? ' · ' + featuredItem.year : '');

        var fCopy = featuredSection.querySelector('.copy');
        if (fCopy) fCopy.innerHTML = renderMultiline(featuredItem.description || featuredItem.artist_note || '');

        var fYoutube = normalizePath(featuredItem.youtube_url);
        if (fYoutube) {
          featuredSection.querySelectorAll('a[href*="youtube.com"], a.play').forEach(function (a) {
            a.href = fYoutube;
            if (a.classList.contains('play')) a.setAttribute('aria-label', (featuredItem.title || '') + ' YouTube');
          });
        }
        var fTrack = featuredSection.querySelector('.track');
        if (fTrack) fTrack.textContent = featuredItem.title || '';
      }
    }

    bindLyricsJump();
    buildCarousel('.release-grid', '.release-card');
    bindReleaseInfoPanel();
    renderLyricsSection();
  });

    loadCollection(rootBase + 'videos', function (items) {
    if (!items.length) return;
    render('.video-grid', ordered(items).map(function (item) {
      var rawUrl = normalizePath(item.youtube_url);
      var videoId = extractYouTubeId(rawUrl);
      var embed = videoId ? 'https://www.youtube-nocookie.com/embed/' + videoId : '';
      var category = escapeHtml(item.category || 'all');
      var body = embed
        ? '<div class="embed"><iframe src="' + escapeHtml(embed) + '" title="' + escapeHtml(item.title || '') + '" loading="lazy" allowfullscreen></iframe></div>'
        : (item.thumbnail
          ? '<div class="embed"><img src="' + escapeHtml(normalizePath(item.thumbnail)) + '" alt="' + escapeHtml(item.title || '') + '" style="width:100%;height:100%;object-fit:cover"></div>'
          : '<div class="placeholder"><div><b>' + escapeHtml(item.title || 'Προσθήκη σύντομα') + '</b><code>Πρόσθεσε νέο YouTube URL από το CMS</code></div></div>');
      return '<article class="video-card reveal show" data-category="' + category + '">' +
        body +
        '<div class="video-info"><p class="eyebrow">' + escapeHtml(item.category || '') + '</p><h3>' + escapeHtml(item.title || '') + '</h3><p class="clamp-text">' + renderMultiline(item.description || '') + '</p></div></article>';
    }).join(''), 'videos');
    bindVideoFilters();
    document.querySelectorAll('.video-info .clamp-text').forEach(applyClamp5);
  });

  loadCollection(rootBase + 'live', function (items) {
    if (!items.length) return;
    render('.live-grid', ordered(items).map(function (item) {
      var detail = item.venue || item.city || item.date || item.status || 'Live';
      var image = normalizePath(item.image);
      var card = '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.alt || item.title || '') + '" loading="lazy"><div class="live-label">' + escapeHtml(item.title || '') + '<small>' + escapeHtml(detail) + '</small></div>';
      var url = normalizePath(item.ticket_url);
      return url
        ? '<a class="live-card reveal show" href="' + escapeHtml(url) + '" target="_blank" rel="noopener" style="display:block">' + card + '</a>'
        : '<article class="live-card reveal show">' + card + '</article>';
    }).join(''), 'live');
  });

   loadCollection(rootBase + 'press', function (items) {
    if (!items.length) return;
    render('.press-grid', ordered(items).map(function (item) {
      var url = normalizePath(item.url);
      var thumb = normalizePath(item.image);
    var link = url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + (lang === 'en' ? 'Open ↗' : 'Άνοιξε ↗') + '</a>' : '';
      var thumbMarkup = thumb ? '<img src="' + escapeHtml(thumb) + '" alt="' + escapeHtml(item.title || '') + '" loading="lazy" style="width:100%;border-radius:12px;margin-bottom:14px;object-fit:cover;aspect-ratio:16/9">' : '';
      var meta = [item.outlet, item.date].filter(Boolean).map(escapeHtml).join(' · ');
      return '<article class="press-card reveal show"><div>' + thumbMarkup + '<span class="press-type">' + escapeHtml(item.type || '') + (meta ? ' · ' + meta : '') + '</span><h3>' + escapeHtml(item.title || '') + '</h3><p class="clamp-text">' + renderMultiline(item.excerpt || '') + '</p></div>' + link + '</article>';
    }).join(''), 'press');
    buildCarousel('.press-grid', '.press-card');
    decoratePressCarousel();
    document.querySelectorAll('.press-card .clamp-text').forEach(applyClamp5);
  });

   loadCollection(rootBase + 'photos', function (items) {
    if (!items.length) return;
    render('.masonry', ordered(items).map(function (item) {
      var image = normalizePath(item.image);
      var captionSource = item.alt || item.title || '';
      var captionHtml = captionSource ? renderMultiline(captionSource) : '';
      var captionMarkup = captionHtml ? '<span class="photo-caption">' + captionHtml + '</span>' : '';
      return '<button class="photo" type="button" data-full="' + escapeHtml(image) + '" data-category="' + escapeHtml(item.category || '') + '"><img loading="lazy" src="' + escapeHtml(image) + '" alt="' + escapeHtml(captionSource) + '">' + captionMarkup + '</button>';
    }).join(''), 'photos');
    if (!document.getElementById('cms-photo-caption-style')) {
      var style = document.createElement('style');
      style.id = 'cms-photo-caption-style';
      style.textContent = '.photo{position:relative}.photo-caption{display:block;padding:10px 12px;font-size:.72rem;font-weight:700;text-align:left;color:var(--paper,#fff8ed);background:rgba(10,7,18,.72);white-space:pre-wrap}';
      document.head.appendChild(style);
    }
    bindPhotoLightbox();
    buildCarousel('.masonry', '.photo');
  });

  function loadCollection(path, callback) {
    var jsonPath = /\.json$/i.test(path) ? path : path + '.json';

    fetch(jsonPath + (jsonPath.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status + ' ' + jsonPath);
        return res.json();
      })
      .then(function (data) {
        var items = Array.isArray(data) ? data : (Array.isArray(data && data.items) ? data.items : []);
        callback(items);
      })
      .catch(function (error) {
        console.warn('[CMS] Failed to load collection ' + jsonPath, error);
        callback([]);
      });
  }

  fetch(base + 'texts.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error(res.status + ' texts.json');
      return res.json();
    })
    .then(function (data) {
      window.__lyricsItems = Array.isArray(data && data.lyrics) ? data.lyrics : [];
      window.__writingsItems = Array.isArray(data && data.writings) ? data.writings : [];
      window.__writingsPage = 1;
      renderLyricsSection();
      bindLyricsJump();
      renderWritingsSection();
      console.info('[CMS] Rendered lyrics (' + lang + '), ' + window.__lyricsItems.length + ' entries');
      console.info('[CMS] Rendered writings (' + lang + '), ' + window.__writingsItems.length + ' entries');
    })
    .catch(function (error) {
      console.warn('[CMS] Failed to load texts.json', error);
      window.__lyricsItems = [];
      window.__writingsItems = [];
      window.__writingsPage = 1;
      renderLyricsSection();
      renderWritingsSection();
    });

  document.querySelectorAll('.lang').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var isEn = /en/i.test(btn.textContent || '') || btn.getAttribute('data-lang') === 'en';
      var newLang = isEn ? 'en' : 'el';
      try { localStorage.setItem(LANG_KEY, newLang); } catch (e) {}
      location.reload();
    });
  });
})();
