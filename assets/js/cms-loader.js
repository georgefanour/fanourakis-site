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
      panel.innerHTML = '<div class="panel-blur-bg" aria-hidden="true"></div><div class="container"><button class="close-panel" data-release-info-close>← Επιστροφή στη δισκογραφία</button><div class="panel-grid"><div class="panel-art"><img id="release-info-img" alt=""></div><div class="panel-copy"><p class="eyebrow" id="release-info-eyebrow"></p><h2 id="release-info-title"></h2><div id="release-info-desc"></div><a href="#words" class="btn dark" id="release-info-lyrics-btn">Δες στίχους ↗</a></div></div></div>';
      document.body.appendChild(panel);
      panel.querySelector('[data-release-info-close]').addEventListener('click', function () {
        panel.classList.remove('open');
        var music = document.getElementById('music');
        if (music) music.scrollIntoView({ behavior: 'smooth' });
      });
      panel.querySelector('#release-info-lyrics-btn').addEventListener('click', function (e) {
        e.preventDefault();
        var releaseTitle = this.dataset.release || '';
        var wordsSection = document.getElementById('words');
        var lyricsTab = document.querySelector('.tab[data-tab="lyrics"]');
        if (lyricsTab) lyricsTab.click();
        if (wordsSection) wordsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var chip = document.querySelector('.release-chip[data-release="' + CSS.escape(releaseTitle) + '"]');
        if (chip) setTimeout(function () { chip.click(); }, 200);
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

  function bindWordPanels() {
    var panel = document.getElementById('word-panel');
    var title = document.getElementById('word-title');
    var body = document.getElementById('word-body');
    var entries = document.querySelectorAll('[data-cms-title]');
    for (var i = 0; i < entries.length; i += 1) {
      entries[i].addEventListener('click', function () {
        if (!panel || !title || !body) return;
        title.textContent = this.getAttribute('data-cms-title') || '';
        body.innerHTML = this.getAttribute('data-cms-body-html') || '';
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

  function bindLyricsJump() {
    document.querySelectorAll('[data-jump-lyrics]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var wordsSection = document.getElementById('words');
        var lyricsTab = document.querySelector('.tab[data-tab="lyrics"]');
        if (lyricsTab) lyricsTab.click();
        if (wordsSection) wordsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var releaseTitle = this.getAttribute('data-jump-lyrics');
        var chip = document.querySelector('.release-chip[data-release="' + CSS.escape(releaseTitle) + '"]');
        if (chip) setTimeout(function () { chip.click(); }, 150);
      });
    });
  }

  function bindReleaseChips() {
    var chips = document.querySelectorAll('.release-chip');
    if (!chips.length) return;
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var chosen = chip.getAttribute('data-release');
        var lyricsList = document.getElementById('lyrics-list');

        document.querySelectorAll('#lyrics-list button').forEach(function (btn) {
          var rel = btn.getAttribute('data-cms-release') || '';
          btn.hidden = rel !== chosen;
        });

        if (lyricsList) {
          lyricsList.hidden = false;
          lyricsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
  }

  function renderReleaseChips(lyricsItems) {
    var host = document.querySelector('#words .tabs');
    if (!host) return;
    var titles = [];
    (lyricsItems || []).forEach(function (item) {
      if (item.release && titles.indexOf(item.release) === -1) titles.push(item.release);
    });
    if (!titles.length) return;

    var existingPrompt = document.getElementById('words-release-prompt');
    if (existingPrompt) existingPrompt.remove();
    var existing = document.querySelector('.release-chips');
    if (existing) existing.remove();

    var promptText = window.__wordsReleasePrompt || (lang === 'en' ? 'Choose a release to read its lyrics and credits.' : 'Διάλεξε από ποιον δίσκο θα ήθελες να διαβάσεις τους στίχους και τους συντελεστές.');
    var prompt = document.createElement('p');
    prompt.id = 'words-release-prompt';
    prompt.className = 'words-release-prompt';
    prompt.textContent = promptText;

    var wrap = document.createElement('div');
    wrap.className = 'release-chips';
    var chipsHtml = titles.map(function (title) {
      return '<button type="button" class="release-chip" data-release="' + escapeHtml(title) + '">' + escapeHtml(title) + '</button>';
    }).join('');
    wrap.innerHTML = chipsHtml;

    host.insertAdjacentElement('afterend', prompt);
    prompt.insertAdjacentElement('afterend', wrap);

    if (!document.getElementById('cms-release-chip-style')) {
      var style = document.createElement('style');
      style.id = 'cms-release-chip-style';
      style.textContent =
        '.words-release-prompt{margin:18px 0 12px;font-family:var(--serif,Georgia,serif);font-style:italic;font-size:clamp(1rem,1.6vw,1.25rem);color:var(--ink,#0a0712);opacity:.85}' +
        '.release-chips{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 30px}' +
        '.release-chip{border:1.5px solid rgba(10,7,18,.35);background:transparent;color:var(--ink,#0a0712);border-radius:999px;padding:11px 20px;font-size:.8rem;font-weight:700;font-family:var(--sans,Arial,sans-serif);letter-spacing:.01em;cursor:pointer;transition:.2s}' +
        '.release-chip:hover{border-color:var(--ink,#0a0712);transform:translateY(-2px)}' +
        '.release-chip.active{background:var(--ink,#0a0712)!important;color:var(--paper,#fff8ed)!important;border-color:var(--ink,#0a0712)!important}';
      document.head.appendChild(style);
    }
    bindReleaseChips();
    bindWordsTabVisibility();
  }

  function bindWordsTabVisibility() {
    var tabs = document.querySelectorAll('#words .tab');
    if (!tabs.length) return;

    function refresh() {
      var activeTab = document.querySelector('#words .tab.active');
      var isLyrics = activeTab ? activeTab.dataset.tab === 'lyrics' : true;
      var promptEl = document.getElementById('words-release-prompt');
      var chipsEl = document.querySelector('.release-chips');
      if (promptEl) promptEl.hidden = !isLyrics;
      if (chipsEl) chipsEl.hidden = !isLyrics;
    }

    var wordsSectionEl = document.getElementById('words');
    if (wordsSectionEl && !wordsSectionEl._tabVisBound) {
      wordsSectionEl._tabVisBound = true;
      tabs.forEach(function (t) {
        t.addEventListener('click', function () { setTimeout(refresh, 0); });
      });
    }

    refresh();
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
        '@media (max-width:720px){.cms-carousel-arrow{width:38px;height:38px;font-size:1.05rem}}';
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

    var navMap = { nav_music: 'a[href="#music"]', nav_videos: 'a[href="#videos"]', nav_live: 'a[href="#live"]', nav_words: 'a[href="#words"]', nav_press: 'a[href="#press"]', nav_photos: 'a[href="#photos"]', nav_about: 'a[href="#about"]', nav_contact: 'a[href="#contact"]' };
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

    var wordsSection = document.querySelector('#words');
    if (wordsSection) {
      setText(wordsSection.querySelector('.eyebrow'), data.words_eyebrow);
      setHtml(wordsSection.querySelector('.quote'), data.words_quote);
      if (!document.getElementById('words-explore-music-btn')) {
        var exploreBtn = document.createElement('a');
        exploreBtn.id = 'words-explore-music-btn';
        exploreBtn.className = 'btn dark';
        exploreBtn.href = '#music';
        exploreBtn.textContent = lang === 'en' ? 'Explore the discography ↗' : 'Εξερεύνησε τη δισκογραφία ↗';
        exploreBtn.style.marginTop = '22px';
        exploreBtn.style.display = 'inline-flex';
        var quoteEl = wordsSection.querySelector('.quote');
        if (quoteEl) quoteEl.insertAdjacentElement('afterend', exploreBtn);
      }
    }
    window.__wordsReleasePrompt = data.words_release_prompt || '';
    var existingWordsPrompt = document.getElementById('words-release-prompt');
    if (existingWordsPrompt && data.words_release_prompt) existingWordsPrompt.textContent = data.words_release_prompt;
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
      if (spotify) links.push('<a href="' + escapeHtml(spotify) + '" target="_blank" rel="noopener">Άκουσε ↗</a>');
      if (youtube) links.push('<a href="' + escapeHtml(youtube) + '" target="_blank" rel="noopener">Δες video ↗</a>');
      if (bandcamp) links.push('<a href="' + escapeHtml(bandcamp) + '" target="_blank" rel="noopener">Bandcamp ↗</a>');
      links.push('<a href="#words" data-jump-lyrics="' + escapeHtml(item.title || '') + '">Δες στίχους ↗</a>');

      window.__releaseInfoStore = window.__releaseInfoStore || {};
           window.__releaseInfoStore[idx] = { title: item.title || '', desc: item.description || '', note: item.artist_note || '', credits: item.credits || '', cover: cover, releaseType: item.release_type || '', year: item.year || '' };
      if (item.description || item.artist_note) {
        links.unshift('<a href="#" class="release-info-btn" data-release-idx="' + idx + '">Λίγα λόγια για τον δίσκο ↗</a>');
      }

      return '<article class="release-card reveal show">' +
        '<div class="release-art"><img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(item.title || '') + '" loading="lazy" onerror="this.src=&quot;assets/images/placeholder-cover.jpg&quot;"></div>' +
        '<div class="release-body">' +
        (item.featured ? '<span class="badge">Πιο πρόσφατη</span>' : '') +
        '<h3>' + escapeHtml(item.title || '') + '</h3>' +
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
      var link = url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Άνοιξε ↗</a>' : '';
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

    function renderTextList(selector, items, type) {
    var target = document.querySelector(selector);
    if (!target || !Array.isArray(items)) return;

  if (type === 'lyrics') target.hidden = true;

target.innerHTML = ordered(items).map(function (item, index) {
      var meta = type === 'lyrics' ? (item.release || '') : (item.date || '');
      var release = type === 'lyrics' ? (item.release || '') : '';

      window.__lyricsCreditsStore = window.__lyricsCreditsStore || {};
      window.__lyricsByRelease = window.__lyricsByRelease || {};
      if (item.title) window.__lyricsCreditsStore[item.title.trim().toLowerCase()] = item.credits || [];
      if (item.release && !window.__lyricsByRelease[item.release.trim().toLowerCase()]) {
        window.__lyricsByRelease[item.release.trim().toLowerCase()] = item.credits || [];
      }

      var orderNum = (item.order != null && item.order !== '') ? Number(item.order) : (index + 1);

      return '<button type="button" ' +
        'data-cms-title="' + escapeHtml(item.title || '') + '" ' +
        'data-cms-meta="' + escapeHtml(meta) + '" ' +
        'data-cms-release="' + escapeHtml(release) + '" ' +
        'data-cms-credits="' + escapeHtml(JSON.stringify(item.credits || [])) + '" ' +
        'data-cms-body-html="' + escapeHtml(renderMultiline(item.body || '')) + '">' +
        '<span>' + escapeHtml(item.title || '') +
        (meta ? ' <small style="opacity:.6;font-size:.65em">· ' + escapeHtml(meta) + '</small>' : '') +
        '</span>' +
        '<b>' + String(orderNum).padStart(2, '0') + ' ↗</b>' +
        '</button>';
    }).join('');
  }

  function renderWordMetaStyle() {
    if (document.getElementById('cms-word-meta-style')) return;

    var style = document.createElement('style');
    style.id = 'cms-word-meta-style';
    style.textContent =
      '#word-meta{' +
      'margin:0 0 20px;' +
      'font-family:var(--sans,Arial,sans-serif);' +
      'font-size:.72rem;' +
      'font-weight:700;' +
      'letter-spacing:.11em;' +
      'text-transform:uppercase;' +
      'color:var(--acid,#d8ff3e)' +
      '}' +
      '#word-meta[hidden]{display:none!important}';
    document.head.appendChild(style);
  }

  function renderWordToggleStyle() {
    if (document.getElementById('cms-word-toggle-style')) return;

    var style = document.createElement('style');
    style.id = 'cms-word-toggle-style';
    style.textContent =
      '.word-toggle{' +
      'display:inline-block;' +
      'margin-top:16px;' +
      'background:none;' +
      'border:0;' +
      'padding:0;' +
      'font-family:var(--sans,Arial,sans-serif);' +
      'font-size:.82rem;' +
      'font-weight:700;' +
      'letter-spacing:.02em;' +
      'color:var(--acid,#d8ff3e);' +
      'cursor:pointer' +
      '}' +
      '.word-toggle:hover{text-decoration:underline}' +
      '.word-toggle[hidden]{display:none!important}' +
      '.close-panel-bottom{margin-top:40px;padding-top:22px;border-top:1px solid rgba(255,255,255,.16);display:inline-block}';
    document.head.appendChild(style);
  }

  function bindSeparatedWordPanels() {
    var panel = document.getElementById('word-panel');
    var title = document.getElementById('word-title');
    var body = document.getElementById('word-body');

    if (!panel || !title || !body) return;

    var meta = document.getElementById('word-meta');
    if (!meta) {
      meta = document.createElement('p');
      meta.id = 'word-meta';
      title.insertAdjacentElement('afterend', meta);
    }

    var toggle = document.getElementById('word-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.id = 'word-toggle';
      toggle.className = 'word-toggle';
      toggle.hidden = true;
      body.insertAdjacentElement('afterend', toggle);
    }

    var bottomClose = document.getElementById('close-word-bottom');
    if (!bottomClose) {
      bottomClose = document.createElement('button');
      bottomClose.type = 'button';
      bottomClose.id = 'close-word-bottom';
      bottomClose.className = 'close-panel close-panel-bottom';
      bottomClose.style.color = 'var(--acid)';
      toggle.insertAdjacentElement('afterend', bottomClose);
    }

    bottomClose.textContent = lang === 'en' ? '← Back to list' : '← Επιστροφή στη λίστα';

    bottomClose.onclick = function () {
      panel.classList.remove('open');
      var wordsSection = document.getElementById('words');
      if (wordsSection) wordsSection.scrollIntoView({ behavior: 'smooth' });
    };

    renderWordToggleStyle();

    function updateToggleLabel(expanded) {
      toggle.textContent = expanded
        ? (lang === 'en' ? 'Read less ↑' : 'Διάβασε λιγότερα ↑')
        : (lang === 'en' ? 'Read more ↗' : 'Διάβασε περισσότερα ↗');
    }

    var clampedHeight = 0;

    function refreshClamp() {
      var lineHeight = parseFloat(getComputedStyle(body).lineHeight);
      if (!lineHeight || isNaN(lineHeight)) lineHeight = 28;
      clampedHeight = lineHeight * 5;

      body.style.maxHeight = clampedHeight + 'px';
      body.style.overflow = 'hidden';
      body.dataset.expanded = 'false';
      toggle.hidden = true;

      requestAnimationFrame(function () {
        var overflowing = body.scrollHeight > clampedHeight + 2;

        if (overflowing) {
          toggle.hidden = false;
          updateToggleLabel(false);
        } else {
          body.style.maxHeight = '';
          body.style.overflow = '';
        }
      });
    }

    toggle.onclick = function () {
      var expanded = body.dataset.expanded === 'true';

      if (expanded) {
        body.style.maxHeight = clampedHeight + 'px';
        body.style.overflow = 'hidden';
        body.dataset.expanded = 'false';
        updateToggleLabel(false);
        title.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        body.style.maxHeight = '';
        body.style.overflow = '';
        body.dataset.expanded = 'true';
        updateToggleLabel(true);
      }
    };

    function bindWordEntries(selector) {
      document.querySelectorAll(selector + ' [data-cms-title]').forEach(function (entry) {
        entry.addEventListener('click', function () {
          title.textContent = this.getAttribute('data-cms-title') || '';
          body.innerHTML = this.getAttribute('data-cms-body-html') || '';

                    var value = this.getAttribute('data-cms-meta') || '';
          if (value) {
            meta.textContent = value;
            meta.hidden = false;
          } else {
            meta.textContent = '';
            meta.hidden = true;
          }

          var creditsRaw = this.getAttribute('data-cms-credits');
          var creditsList = [];
          try { creditsList = creditsRaw ? JSON.parse(creditsRaw) : []; } catch (e) { creditsList = []; }
          var creditsEl = document.getElementById('word-credits');
          if (!creditsEl) {
            creditsEl = document.createElement('ul');
            creditsEl.className = 'credits';
            creditsEl.id = 'word-credits';
            panel.appendChild(creditsEl);
          }
          creditsEl.innerHTML = creditsList.map(function (c) {
            return '<li><b>' + escapeHtml(c.title || '') + '</b>' + escapeHtml(c.content || '') + '</li>';
          }).join('');
          creditsEl.hidden = !creditsList.length;

          body.style.maxHeight = '';
          body.style.overflow = '';
          refreshClamp();

          panel.classList.add('open');
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    bindWordEntries('#lyrics-list');
    bindWordEntries('#writings-list');
  }

  function loadCollection(path, callback) {
    var url = 'https://api.github.com/repos/georgefanour/fanourakis-site/contents/' + path + '?ref=main&t=' + Date.now();

    fetch(url, { headers: { Accept: 'application/vnd.github.v3+json' } })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status + ' ' + path);
        return res.json();
      })
      .then(function (files) {
        var jsonFiles = (Array.isArray(files) ? files : []).filter(function (f) {
          return f.type === 'file' && /\.json$/i.test(f.name);
        });

        return Promise.all(jsonFiles.map(function (f) {
          return fetch(f.download_url + (f.download_url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now())
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
        }));
      })
      .then(function (items) {
        callback((items || []).filter(Boolean));
      })
      .catch(function (error) {
        console.warn('[CMS] Failed to load collection ' + path, error);
        callback([]);
      });
  }

  loadCollection(base + 'lyrics', function (items) {
    renderTextList('#lyrics-list', items, 'lyrics');
    renderReleaseChips(items);
    bindReleaseChips();
    bindSeparatedWordPanels();
    bindLyricsJump();

    console.info('[CMS] Rendered lyrics (' + lang + '), ' + items.length + ' entries');
  });

  loadCollection(base + 'writings', function (items) {
    renderTextList('#writings-list', items, 'writings');
    renderWordMetaStyle();
    bindSeparatedWordPanels();

    console.info('[CMS] Rendered writings (' + lang + '), ' + items.length + ' entries');
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
