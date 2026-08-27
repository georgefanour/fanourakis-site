/* CMS loader for fanourakis-site markup. */
(function () {
  'use strict';

  function normalizePath(value) {
    if (!value) return value;
    var str = String(value).trim();
    if (!str) return str;
    if (/^https?:\/\//i.test(str)) return str;
    if (str.indexOf('/') === 0) return str.slice(1);
    return str;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>\"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char];
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

  function bindWordPanels() {
    var panel = document.getElementById('word-panel');
    var title = document.getElementById('word-title');
    var body = document.getElementById('word-body');
    var entries = document.querySelectorAll('[data-cms-title]');
    for (var i = 0; i < entries.length; i += 1) {
      entries[i].addEventListener('click', function () {
        if (!panel || !title || !body) return;
        title.textContent = this.getAttribute('data-cms-title') || '';
        body.textContent = this.getAttribute('data-cms-body') || '';
        panel.classList.add('open');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  console.info('[CMS] Loader started');

  load('content/music.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.release-grid', ordered(data.items).map(function (item) {
      var cover = normalizePath(item.cover) || 'assets/images/placeholder-cover.jpg';
      var youtube = normalizePath(item.youtube_url);
      var spotify = normalizePath(item.spotify_url);
      var links = [];
      if (spotify) links.push('<a href="' + escapeHtml(spotify) + '" target="_blank" rel="noopener">Άκουσε ↗</a>');
      if (youtube) links.push('<a href="' + escapeHtml(youtube) + '" target="_blank" rel="noopener">Δες video ↗</a>');
      if (!links.length) links.push('<span style="opacity:.55">Ερχονται links</span>');
      return '<article class="release-card reveal show">' +
        '<div class="release-art"><img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(item.title || '') + '" loading="lazy" onerror="this.src=&quot;assets/images/placeholder-cover.jpg&quot;"></div>' +
        '<div class="release-body">' +
        (item.featured ? '<span class="badge">Πιο πρόσφατη</span>' : '') +
        '<h3>' + escapeHtml(item.title || '') + '</h3>' +
        '<p>' + escapeHtml(item.release_type || '') + (item.year ? ' · ' + escapeHtml(item.year) : '') + '</p>' +
        '<div class="release-actions">' + links.join('') + '</div></div></article>';
    }).join(''), 'music');
  });

  load('content/videos.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.video-grid', ordered(data.items).map(function (item) {
      var rawUrl = normalizePath(item.youtube_url);
      var videoId = extractYouTubeId(rawUrl);
      var embed = videoId ? 'https://www.youtube-nocookie.com/embed/' + videoId : '';
      var category = escapeHtml(item.category || 'all');
      var body = embed
        ? '<div class="embed"><iframe src="' + escapeHtml(embed) + '" title="' + escapeHtml(item.title || '') + '" loading="lazy" allowfullscreen></iframe></div>'
        : '<div class="placeholder"><div><b>' + escapeHtml(item.title || 'Προσθήκη σύντομα') + '</b><code>Πρόσθεσε νέο YouTube URL από το CMS</code></div></div>';
      return '<article class="video-card reveal show" data-category="' + category + '">' +
        body +
        '<div class="video-info"><p class="eyebrow">' + escapeHtml(item.category || '') + '</p><h3>' + escapeHtml(item.title || '') + '</h3><p>' + escapeHtml(item.description || '') + '</p></div></article>';
    }).join(''), 'videos');
    bindVideoFilters();
  });

  load('content/live.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.live-grid', ordered(data.items).map(function (item) {
      var detail = item.venue || item.city || item.date || item.status || 'Live';
      var image = normalizePath(item.image);
      return '<article class="live-card reveal show"><img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.alt || item.title || '') + '" loading="lazy"><div class="live-label">' + escapeHtml(item.title || '') + '<small>' + escapeHtml(detail) + '</small></div></article>';
    }).join(''), 'live');
  });

  load('content/press.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.press-grid', ordered(data.items).map(function (item) {
      var url = normalizePath(item.url);
      var thumb = normalizePath(item.image || item.logo);
      var link = url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Άνοιξε ↗</a>' : '';
      var thumbMarkup = thumb ? '<img src="' + escapeHtml(thumb) + '" alt="' + escapeHtml(item.title || '') + '" loading="lazy" style="width:100%;border-radius:12px;margin-bottom:14px;object-fit:cover;aspect-ratio:16/9">' : '';
      return '<article class="press-card reveal show"><div>' + thumbMarkup + '<span class="press-type">' + escapeHtml(item.type || '') + '</span><h3>' + escapeHtml(item.title || '') + '</h3><p>' + escapeHtml(item.excerpt || '') + '</p></div>' + link + '</article>';
    }).join(''), 'press');
  });

  load('content/photos.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.masonry', ordered(data.items).map(function (item) {
      var image = normalizePath(item.image);
      var caption = item.caption || item.alt || item.title || '';
      var captionMarkup = caption ? '<span class="photo-caption">' + escapeHtml(caption) + '</span>' : '';
      return '<button class="photo" type="button" data-full="' + escapeHtml(image) + '"><img loading="lazy" src="' + escapeHtml(image) + '" alt="' + escapeHtml(caption) + '">' + captionMarkup + '</button>';
    }).join(''), 'photos');
    if (!document.getElementById('cms-photo-caption-style')) {
      var style = document.createElement('style');
      style.id = 'cms-photo-caption-style';
      style.textContent = '.photo{position:relative}.photo-caption{display:block;padding:10px 12px;font-size:.72rem;font-weight:700;text-align:left;color:var(--paper,#fff8ed);background:rgba(10,7,18,.72)}';
      document.head.appendChild(style);
    }
    bindPhotoLightbox();
  });

  load('content/el/about.json', function (data) {
    if (!data.text) return;
    var target = document.querySelector('.about-text');
    if (target) { target.textContent = data.text; console.info('[CMS] Rendered about'); }
  });

  load('content/el/texts.json', function (data) {
    function list(selector, items) {
      if (!Array.isArray(items) || !items.length) return;
      var target = document.querySelector(selector);
      if (!target) return;
      target.innerHTML = ordered(items).map(function (item, index) {
        return '<button type="button" data-cms-title="' + escapeHtml(item.title) + '" data-cms-body="' + escapeHtml(item.body) + '"><span>' + escapeHtml(item.title) + '</span><b>' + String(index + 1).padStart(2, '0') + ' ↗</b></button>';
      }).join('');
    }
    list('#lyrics-list', data.lyrics);
    list('#writings-list', data.writings);
    bindWordPanels();
    console.info('[CMS] Rendered texts');
  });
})();
