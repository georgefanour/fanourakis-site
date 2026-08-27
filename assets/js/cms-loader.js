/* CMS loader for fanourakis-site markup. */
(function () {
  'use strict';

  function normalizePath(value) {
    if (!value) return value;
    var str = String(value);
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
      return;
    }
    target.innerHTML = markup;
    console.info('[CMS] Rendered ' + label);
  }

  function load(path, callback) {
    request(path)
      .then(function (data) { callback(data || {}); })
      .catch(function (error) { console.warn('[CMS] Keeping static fallback for ' + path, error); });
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

  console.info('[CMS] Loader started');

  load('content/music.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.release-grid', ordered(data.items).map(function (item) {
      var cover = normalizePath(item.cover);
      var youtube = normalizePath(item.youtube_url);
      var spotify = normalizePath(item.spotify_url);
      var video = youtube ? '<a href=\"' + escapeHtml(youtube) + '\" target=\"_blank\" rel=\"noopener\">Δες video ↗</a>' : '';
      var listen = spotify ? '<a href=\"' + escapeHtml(spotify) + '\" target=\"_blank\" rel=\"noopener\">Άκουσε ↗</a>' : '';
      return '<article class=\"release-card reveal show\">' +
        '<div class=\"release-art\"><img src=\"' + escapeHtml(cover) + '\" alt=\"' + escapeHtml(item.title) + '\"></div>' +
        '<div class=\"release-body\">' +
        (item.featured ? '<span class=\"badge\">Πιο πρόσφατη</span>' : '') +
        '<h3>' + escapeHtml(item.title) + '</h3>' +
        '<p>' + escapeHtml(item.release_type) + ' · ' + escapeHtml(item.year) + '</p>' +
        '<div class=\"release-actions\">' + video + listen + '</div></div></article>';
    }).join(''), 'music');
  });

  load('content/videos.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.video-grid', ordered(data.items).map(function (item) {
      var embed = normalizePath(item.youtube_url);
      return '<article class=\"video-card reveal show\" data-category=\"' + escapeHtml(item.category || 'all') + '\">' +
        '<div class=\"embed\"><iframe src=\"' + escapeHtml(embed) + '\" title=\"' + escapeHtml(item.title) + '\" loading=\"lazy\" allowfullscreen></iframe></div>' +
        '<div class=\"video-info\"><p class=\"eyebrow\">' + escapeHtml(item.category || '') + '</p><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description || '') + '</p></div></article>';
    }).join(''), 'videos');
  });

  load('content/live.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.live-grid', ordered(data.items).map(function (item) {
      var detail = item.venue || item.city || item.date || item.status || 'Live';
      var image = normalizePath(item.image);
      return '<article class=\"live-card reveal show\"><img src=\"' + escapeHtml(image) + '\" alt=\"' + escapeHtml(item.alt || item.title) + '\"><div class=\"live-label\">' + escapeHtml(item.title) + '<small>' + escapeHtml(detail) + '</small></div></article>';
    }).join(''), 'live');
  });

  load('content/press.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.press-grid', ordered(data.items).map(function (item) {
      var url = normalizePath(item.url);
      var link = url ? '<a href=\"' + escapeHtml(url) + '\" target=\"_blank\" rel=\"noopener\">Άνοιξε ↗</a>' : '';
      return '<article class=\"press-card reveal show\"><div><span class=\"press-type\">' + escapeHtml(item.type || '') + '</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.excerpt || '') + '</p></div>' + link + '</article>';
    }).join(''), 'press');
  });

  load('content/photos.json', function (data) {
    if (!Array.isArray(data.items) || !data.items.length) return;
    render('.masonry', ordered(data.items).map(function (item) {
      var image = normalizePath(item.image);
      return '<button class=\"photo\" type=\"button\" data-full=\"' + escapeHtml(image) + '\"><img loading=\"lazy\" src=\"' + escapeHtml(image) + '\" alt=\"' + escapeHtml(item.alt || item.title) + '\"></button>';
    }).join(''), 'photos');
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
        return '<button type=\"button\" data-cms-title=\"' + escapeHtml(item.title) + '\" data-cms-body=\"' + escapeHtml(item.body) + '\"><span>' + escapeHtml(item.title) + '</span><b>' + String(index + 1).padStart(2, '0') + ' ↗</b></button>';
      }).join('');
    }
    list('#lyrics-list', data.lyrics);
    list('#writings-list', data.writings);
    bindWordPanels();
    console.info('[CMS] Rendered texts');
  });
})();
