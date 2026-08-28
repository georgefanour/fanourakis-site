/* cms-enhancements.js
   Adds:
   1) Release-filter chips above the lyrics/writings list (#lyrics-list),
      built from distinct music titles. Clicking a chip filters the
      buttons inside #lyrics-list by their [data-cms-release] attribute.
   2) buildCarousel(): injects prev/next arrow buttons and a position
      dot-indicator into .release-grid, .press-grid and .masonry
      containers, enabling horizontal scroll-snap navigation without
      hiding the existing grid view. Item sizing is fully responsive
      (controlled via CSS clamp() in responsive-fixes.css), and the
      carousel recalculates its dot count / arrow state on resize so
      it adapts correctly between phone, tablet and laptop widths.

   Loaded AFTER cms-loader.js. Does not modify or replace it.
   Safe no-ops if expected elements are not found.
*/
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function initLyricsFilters() {
    var list = document.getElementById("lyrics-list");
    if (!list || list.dataset.filtersInit === "true") return;

    var items = Array.prototype.slice.call(
      list.querySelectorAll("[data-cms-release]")
    );
    if (!items.length) return;

    list.dataset.filtersInit = "true";

    var seen = new Set();
    var releases = [];
    items.forEach(function (el) {
      var val = el.getAttribute("data-cms-release");
      if (val && !seen.has(val)) {
        seen.add(val);
        releases.push(val);
      }
    });
    if (!releases.length) return;

    var chipBar = document.createElement("div");
    chipBar.className = "release-filter-chips";
    chipBar.setAttribute("role", "tablist");
    chipBar.setAttribute("aria-label", "Filter lyrics by release");

    function setActive(chip) {
      chipBar.querySelectorAll(".release-chip").forEach(function (c) {
        c.classList.remove("is-active");
        c.setAttribute("aria-selected", "false");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-selected", "true");
    }

    function applyFilter(release) {
      items.forEach(function (el) {
        var match = release === "all" || el.getAttribute("data-cms-release") === release;
        el.hidden = !match;
        el.style.display = match ? "" : "none";
      });
    }

    var allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = "release-chip is-active";
    allChip.textContent = "Όλα";
    allChip.setAttribute("role", "tab");
    allChip.setAttribute("aria-selected", "true");
    allChip.setAttribute("data-release-value", "all");
    allChip.addEventListener("click", function () {
      setActive(allChip);
      applyFilter("all");
    });
    chipBar.appendChild(allChip);

    releases.forEach(function (release) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "release-chip";
      chip.textContent = release;
      chip.setAttribute("role", "tab");
      chip.setAttribute("aria-selected", "false");
      chip.setAttribute("data-release-value", release);
      chip.addEventListener("click", function () {
        setActive(chip);
        applyFilter(release);
      });
      chipBar.appendChild(chip);
    });

    list.parentNode.insertBefore(chipBar, list);
  }

  function buildCarousel(container) {
    if (!container) return;

    var children = Array.prototype.slice.call(container.children);
    if (children.length < 2) return;

    var wrapper, prevBtn, nextBtn, dots;

    if (container.dataset.carouselInit === "true") {
      wrapper = container.parentElement;
      prevBtn = wrapper.querySelector(".carousel-arrow--prev");
      nextBtn = wrapper.querySelector(".carousel-arrow--next");
      dots = wrapper.parentElement.querySelector(".carousel-dots");
    } else {
      container.dataset.carouselInit = "true";
      container.classList.add("has-carousel-nav");

      wrapper = document.createElement("div");
      wrapper.className = "carousel-wrapper";

      prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "carousel-arrow carousel-arrow--prev";
      prevBtn.setAttribute("aria-label", "Προηγούμενο");
      prevBtn.innerHTML = "&#8249;";

      nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "carousel-arrow carousel-arrow--next";
      nextBtn.setAttribute("aria-label", "Επόμενο");
      nextBtn.innerHTML = "&#8250;";

      dots = document.createElement("div");
      dots.className = "carousel-dots";

      container.parentNode.insertBefore(wrapper, container);
      wrapper.appendChild(prevBtn);
      wrapper.appendChild(container);
      wrapper.appendChild(nextBtn);
      wrapper.parentNode.insertBefore(dots, wrapper.nextSibling);

      children.forEach(function (child) {
        child.style.scrollSnapAlign = "start";
      });

      prevBtn.addEventListener("click", function () {
        scrollToIndex(currentIndex() - 1);
      });
      nextBtn.addEventListener("click", function () {
        scrollToIndex(currentIndex() + 1);
      });

      var scrollTimeout;
      container.addEventListener("scroll", function () {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateActiveDot, 80);
      });
    }

    function currentIndex() {
      var scrollLeft = container.scrollLeft;
      var closestIdx = 0;
      var closestDist = Infinity;
      children.forEach(function (child, idx) {
        var dist = Math.abs(child.offsetLeft - scrollLeft);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = idx;
        }
      });
      return closestIdx;
    }

    function scrollToIndex(idx) {
      var clamped = Math.max(0, Math.min(idx, children.length - 1));
      container.scrollTo({
        left: children[clamped].offsetLeft,
        behavior: "smooth"
      });
    }

    function updateActiveDot() {
      var dotEls = Array.prototype.slice.call(dots.children);
      var idx = currentIndex();
      dotEls.forEach(function (d, i) {
        d.classList.toggle("is-active", i === idx);
      });
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === children.length - 1;
    }

    function rebuildDots() {
      dots.innerHTML = "";
      var containerWidth = container.clientWidth;
      var itemWidth = children[0].getBoundingClientRect().width || 1;
      var gap = parseFloat(getComputedStyle(container).gap) || 0;
      var perView = Math.max(1, Math.round(containerWidth / (itemWidth + gap)));
      var pageCount = Math.max(1, Math.ceil(children.length / perView));

      for (var i = 0; i < pageCount; i++) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("aria-label", "Μετάβαση σε σελίδα " + (i + 1));
        (function (pageIdx) {
          dot.addEventListener("click", function () {
            scrollToIndex(pageIdx * perView);
          });
        })(i);
        dots.appendChild(dot);
      }
      updateActiveDot();
    }

    rebuildDots();

    if (!container.dataset.resizeBound) {
      container.dataset.resizeBound = "true";
      window.addEventListener("resize", debounce(rebuildDots, 200));
    }
  }

  function initCarousels() {
    var selectors = [".release-grid", ".press-grid", ".masonry"];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (container) {
        buildCarousel(container);
      });
    });
  }

  function initAll() {
    initLyricsFilters();
    initCarousels();
  }

  ready(initAll);

  window.addEventListener("cms:content-loaded", initAll);

  var mo = new MutationObserver(function () {
    clearTimeout(window.__cmsEnhTimeout);
    window.__cmsEnhTimeout = setTimeout(initAll, 300);
  });
  ready(function () {
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
