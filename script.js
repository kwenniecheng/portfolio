/**
 * PORTFOLIO & BLOG DYNAMIC RENDERER
 */

/* Random hover dot color: blue, pink or yellow (new color each time you hover a link) */
const DOT_COLORS = ["--cat-datavis", "--cat-journalism", "--cat-illustration"];

document.addEventListener("mouseover", (e) => {
  const link = e.target.closest(".nav-links a, .highlight-link, .project-description a, .read-more, .grid-item");
  if (!link || link.contains(e.relatedTarget)) return;
  const pick = DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];
  link.style.setProperty("--dot-color", `var(${pick})`);

  // Random horizontal position of the dot behind thumbnails
  if (link.classList.contains("grid-item")) {
    link.style.setProperty("--dot-x", (10 + Math.random() * 50).toFixed(1) + "%");
  }
});

/* Random selection color: blue, pink or yellow (new color for each new selection) */
const SELECTION_COLORS = ["blue", "pink", "yellow"];

document.addEventListener("selectstart", () => {
  const pick = SELECTION_COLORS[Math.floor(Math.random() * SELECTION_COLORS.length)];
  document.documentElement.setAttribute("data-sel", pick);
});

document.addEventListener("DOMContentLoaded", () => {
  // Check which page we are currently on
  if (document.getElementById("project-grid")) {
    initPortfolio();
  } else if (document.getElementById("blog-stream")) {
    initBlog();
  }
});

/* ==========================================================================
   1. PORTFOLIO ENGINE (Projects)
   ========================================================================== */
let allProjects = [];
let activeCategory = "all";
let openProjectId = null;

// Measures the real height of the category bar (used for scroll offsets)
function updateStickyOffsets() {
  const bar = document.querySelector(".category-bar");
  if (bar) {
    document.documentElement.style.setProperty("--cat-bar-h", bar.offsetHeight + "px");
  }
}

async function initPortfolio() {
  updateStickyOffsets();
  window.addEventListener("resize", updateStickyOffsets);

  try {
    const response = await fetch("data/projects.json");
    allProjects = await response.json();

    renderGrid();
    setupCategoryFilters();
    window.addEventListener("scroll", updateCategoryBarMode, { passive: true });
  } catch (error) {
    console.error("Error loading projects.json:", error);
  }
}

/* ---------- VIDEO HELPERS ---------- */
const PLAY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;

// Returns {id, hash} if the link is a Vimeo link, otherwise null
function parseVimeo(url) {
  const s = String(url);
  const m = s.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (!m) return null;
  const q = s.match(/[?&]h=([a-zA-Z0-9]+)/);
  return { id: m[1], hash: m[2] || (q ? q[1] : "") };
}

function vimeoPageUrl(v) {
  return `https://vimeo.com/${v.id}${v.hash ? "/" + v.hash : ""}`;
}

function vimeoEmbedUrl(v) {
  return `https://player.vimeo.com/video/${v.id}?dnt=1${v.hash ? "&h=" + v.hash : ""}`;
}

// Returns the video id if the link is a YouTube link, otherwise null
function parseYouTube(url) {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function isVideo(src) {
  return !!(parseVimeo(src) || parseYouTube(src));
}

// HTML for one carousel slide: a video player or an image
function mediaHtml(src, title) {
  const safeTitle = String(title).replace(/"/g, "&quot;");
  const v = parseVimeo(src);
  if (v) {
    return `
      <div class="video-wrap">
        <iframe src="${vimeoEmbedUrl(v)}" title="${safeTitle}"
          allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>`;
  }
  const yt = parseYouTube(src);
  if (yt) {
    return `
      <div class="video-wrap">
        <iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="${safeTitle}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>`;
  }
  const placeholder = `https://via.placeholder.com/1200x800?text=${encodeURIComponent(title)}`;
  return `<img class="carousel-main" src="${src}" alt="${safeTitle}" onerror="this.src='${placeholder}'">`;
}

/* ---------- CAROUSEL ---------- */
function buildCarousel(proj) {
  const items = proj.images || [];
  if (!items.length) return "";
  const multi = items.length > 1;

  const arrows = multi ? `
    <button class="carousel-arrow prev" aria-label="Previous">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 4 7 12 15 20"/></svg>
    </button>
    <button class="carousel-arrow next" aria-label="Next">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 4 17 12 9 20"/></svg>
    </button>` : "";

  const thumbs = multi ? `
    <div class="carousel-thumbs">
      ${items.map((src, i) => {
        const active = i === 0 ? "active" : "";
        const v = parseVimeo(src);
        if (v) {
          return `<button class="thumb thumb-video ${active}" data-index="${i}" data-vimeo-url="${vimeoPageUrl(v)}" aria-label="Show video ${i + 1}">${PLAY_ICON}</button>`;
        }
        const yt = parseYouTube(src);
        if (yt) {
          return `<button class="thumb thumb-video ${active}" data-index="${i}" style="background-image:url('https://img.youtube.com/vi/${yt}/mqdefault.jpg')" aria-label="Show video ${i + 1}">${PLAY_ICON}</button>`;
        }
        return `<button class="thumb ${active}" data-index="${i}" aria-label="Show image ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`;
      }).join("")}
    </div>` : "";

  return `
    <div class="carousel">
      <div class="carousel-stage">
        <div class="carousel-media">${mediaHtml(items[0], proj.title)}</div>
        ${arrows}
      </div>
      ${thumbs}
    </div>`;
}

function initCarousel(card, items) {
  const carousel = card.querySelector(".carousel");
  if (!carousel || items.length < 2) return;

  const stage = carousel.querySelector(".carousel-stage");
  const media = carousel.querySelector(".carousel-media");
  const thumbs = carousel.querySelectorAll(".thumb");
  const title = card.querySelector(".project-title").textContent;
  let current = 0;

  function show(i) {
    current = (i + items.length) % items.length; // wraps around
    media.innerHTML = mediaHtml(items[current], title); // swapping also stops any playing video
    thumbs.forEach((t, idx) => t.classList.toggle("active", idx === current));
  }

  carousel.querySelector(".prev").addEventListener("click", () => show(current - 1));
  carousel.querySelector(".next").addEventListener("click", () => show(current + 1));
  thumbs.forEach(t => t.addEventListener("click", () => show(Number(t.dataset.index))));

  // Swipe on touch screens
  let startX = 0;
  stage.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(dx < 0 ? current + 1 : current - 1);
  });

  // Fetch the real preview picture for each Vimeo thumbnail from Vimeo
  carousel.querySelectorAll(".thumb-video[data-vimeo-url]").forEach(async (t) => {
    try {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(t.dataset.vimeoUrl)}`);
      const data = await res.json();
      if (data.thumbnail_url) t.style.backgroundImage = `url("${data.thumbnail_url}")`;
    } catch (e) { /* keeps the dark thumbnail with the play icon */ }
  });
}

/* ---------- THUMBNAIL GRID ---------- */

// Thumbnail = "thumb" field in projects.json if present, otherwise thumb.png
// in the same folder as the project's first image (videos are skipped).
function thumbSrc(proj) {
  if (proj.thumb) return proj.thumb;
  const first = (proj.images || []).find(src => !isVideo(src));
  if (first && first.includes("/")) {
    return first.slice(0, first.lastIndexOf("/")) + "/thumb.png";
  }
  return `https://via.placeholder.com/800x600?text=${encodeURIComponent(proj.title)}`;
}

function renderGrid() {
  const grid = document.getElementById("project-grid");
  grid.innerHTML = "";

  allProjects
    .filter(p => (activeCategory === "all" || p.categories.includes(activeCategory)) && p.id !== openProjectId)
    .forEach(proj => {
      const dotsHtml = proj.categories.map(cat => `<span class="dot dot-${cat}"></span>`).join("");
      const safeTitle = String(proj.title).replace(/"/g, "&quot;");

      const item = document.createElement("button");
      item.type = "button";
      item.className = "grid-item";
      item.innerHTML = `
        <span class="grid-thumb"><img src="${thumbSrc(proj)}" alt="${safeTitle}" loading="lazy"></span>
        <span class="grid-title"><span class="index-dots">${dotsHtml}</span><span>${proj.title}</span></span>
      `;

      // Fallback chain: thumb.png -> first image -> placeholder
      const img = item.querySelector("img");
      const placeholder = `https://via.placeholder.com/800x600?text=${encodeURIComponent(proj.title)}`;
      img.addEventListener("error", () => {
        const firstImg = (proj.images || []).find(src => !isVideo(src));
        img.onerror = () => { img.onerror = null; img.src = placeholder; };
        img.src = firstImg || placeholder;
      }, { once: true });

      item.addEventListener("click", () => openProject(proj.id));
      grid.appendChild(item);
    });
}

/* ---------- OPEN PROJECT ---------- */
function buildProjectCard(proj) {
  const card = document.createElement("article");
  card.className = "project-card";
  card.id = `card-${proj.id}`;

  const linkBadge = proj.externalUrl
    ? `<a href="${proj.externalUrl}" target="_blank" rel="noopener" class="ext-link-badge">Open Interactive Project ↗</a>`
    : "";

  let descriptionHtml = "";
  if (proj.description) {
    const paragraphs = Array.isArray(proj.description) ? proj.description : [proj.description];
    descriptionHtml = `<div class="project-description">${paragraphs.map(p => `<p>${p}</p>`).join("")}</div>`;
  }

  const metaText = Array.isArray(proj.meta) ? proj.meta.join(" · ") : (proj.meta || "");

  card.innerHTML = `
    <div class="project-header">
      <h2 class="project-title">${proj.title}</h2>
      ${metaText ? `<div class="project-tags">${metaText}</div>` : ""}
      ${linkBadge}
    </div>
    ${descriptionHtml}
    ${buildCarousel(proj)}
  `;

  initCarousel(card, proj.images || []);
  return card;
}

function openProject(id) {
  const proj = allProjects.find(p => p.id === id);
  if (!proj) return;

  openProjectId = id;
  const detail = document.getElementById("project-detail");
  detail.innerHTML = "";
  detail.appendChild(buildProjectCard(proj));
  detail.hidden = false;

  renderGrid(); // the open project leaves the grid
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateCategoryBarMode();
}

/* ---------- CATEGORY BAR ---------- */
function setupCategoryFilters() {
  const buttons = document.querySelectorAll(".cat-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (document.querySelector(".category-bar").classList.contains("project-mode")) return;

      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      activeCategory = btn.getAttribute("data-category");
      renderGrid();
    });
  });
}

// While the open project is on screen, the bar only shows that project's
// categories. Once you scroll down to the overview, the full bar returns.
function updateCategoryBarMode() {
  const bar = document.querySelector(".category-bar");
  const detail = document.getElementById("project-detail");
  const proj = allProjects.find(p => p.id === openProjectId);

  let projectMode = false;
  if (proj && !detail.hidden) {
    const barBottom = bar.getBoundingClientRect().bottom;
    projectMode = detail.getBoundingClientRect().bottom > barBottom + window.innerHeight * 0.3;
  }

  bar.classList.toggle("project-mode", projectMode);
  bar.querySelectorAll(".cat-btn").forEach(b => {
    b.classList.toggle("in-project", projectMode && proj.categories.includes(b.dataset.category));
  });
}

/* ==========================================================================
   2. BLOG ENGINE
   ========================================================================== */
async function initBlog() {
  try {
    const response = await fetch("data/posts.json");
    const posts = await response.json();
    renderBlog(posts);
  } catch (error) {
    console.error("Error loading posts.json:", error);
  }
}

function renderBlog(posts) {
  const container = document.getElementById("blog-stream");
  container.innerHTML = "";

  posts.forEach(post => {
    const article = document.createElement("article");
    article.className = "blog-post";

    const imagesHtml = post.images && post.images.length > 0
      ? `<div class="blog-images">${post.images.map(img => `<img src="${img}" alt="${post.title}" onerror="this.src='https://via.placeholder.com/900x500?text=Blog+Image'">`).join("")}</div>`
      : "";

    article.innerHTML = `
      <div class="blog-date">${post.date}</div>
      <h2 class="blog-title">${post.title}</h2>
      <div class="blog-content"><p>${post.content}</p></div>
      ${imagesHtml}
    `;

    container.appendChild(article);
  });
}