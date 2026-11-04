/**
 * PORTFOLIO & BLOG DYNAMIC RENDERER
 */

/* Random hover dot color: blue, pink or yellow (new color each time you hover a link) */
const DOT_COLORS = ["--cat-datavis", "--cat-journalism", "--cat-illustration"];

document.addEventListener("mouseover", (e) => {
  const link = e.target.closest(".nav-links a, .highlight-link, .project-description a, .read-more");
  if (!link || link.contains(e.relatedTarget)) return;
  const pick = DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];
  link.style.setProperty("--dot-color", `var(${pick})`);
});

/* Random selection color: blue, pink or yellow (new color for each new selection) */
const SELECTION_COLORS = ["blue", "pink", "yellow"];

document.addEventListener("selectstart", () => {
  const pick = SELECTION_COLORS[Math.floor(Math.random() * SELECTION_COLORS.length)];
  document.documentElement.setAttribute("data-sel", pick);
});

document.addEventListener("DOMContentLoaded", () => {
  // Check which page we are currently on
  if (document.getElementById("left-index")) {
    initPortfolio();
  } else if (document.getElementById("blog-stream")) {
    initBlog();
  }
});

/* ==========================================================================
   1. PORTFOLIO ENGINE (Projects)
   ========================================================================== */
let allProjects = [];

// Measures the real height of the category bar so the sticky project-name
// strip (mobile) and the left index (desktop) sit directly underneath it.
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

    renderPortfolio(allProjects);
    setupCategoryFilters();
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

  // Fetch the real preview picture for each video thumbnail from Vimeo
  carousel.querySelectorAll(".thumb-video").forEach(async (t) => {
    try {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(t.dataset.vimeoUrl)}`);
      const data = await res.json();
      if (data.thumbnail_url) t.style.backgroundImage = `url("${data.thumbnail_url}")`;
    } catch (e) { /* keeps the dark thumbnail with the play icon */ }
  });
}

function initDescription(card) {
  const desc = card.querySelector(".project-description");
  if (!desc) return;

  const btn = desc.querySelector(".read-more");
  const paras = desc.querySelectorAll("p");
  const first = paras[0];

  // Only show the button if there is something hidden
  const hasMore = paras.length > 1 || first.scrollHeight > first.clientHeight + 1;
  if (!hasMore) {
    desc.classList.remove("collapsed");
    return;
  }

  btn.hidden = false;
  btn.addEventListener("click", () => {
    const collapsed = desc.classList.toggle("collapsed");
    btn.textContent = collapsed ? "Read more" : "Show less";
  });
}

function renderPortfolio(projects) {
  const indexContainer = document.getElementById("left-index");
  const streamContainer = document.getElementById("right-stream");

  indexContainer.innerHTML = "";
  streamContainer.innerHTML = "";

  projects.forEach((proj) => {
    // Generate color dots HTML for category overlap
    const dotsHtml = proj.categories
      .map(cat => `<span class="dot dot-${cat}"></span>`)
      .join("");

    // 1. Render Left Index Item
    const indexItem = document.createElement("div");
    indexItem.className = "index-item";
    indexItem.setAttribute("data-id", proj.id);
    indexItem.innerHTML = `
      <span class="index-dots">${dotsHtml}</span>
      <span class="index-title" data-title="${proj.title}">${proj.title}</span>
    `;

    // Click on index item scrolls smoothly to the project in the right stream
    indexItem.addEventListener("click", () => {
      const targetCard = document.getElementById(`card-${proj.id}`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: "smooth" });
      }
    });

    indexContainer.appendChild(indexItem);

    // 2. Render Right Stream Card
    const card = document.createElement("article");
    card.className = "project-card";
    card.id = `card-${proj.id}`;

    // Scrollytelling / External link button check
    const linkBadge = proj.externalUrl
      ? `<a href="${proj.externalUrl}" target="_blank" rel="noopener" class="ext-link-badge">Open Interactive Project ↗</a>`
      : "";

    // Description text (optional): accepts a string or an array of paragraphs
    let descriptionHtml = "";
    if (proj.description) {
      const paragraphs = Array.isArray(proj.description)
        ? proj.description
        : [proj.description];
      descriptionHtml = `<div class="project-description collapsed">${paragraphs.map(p => `<p>${p}</p>`).join("")}<button class="read-more" type="button" hidden>Read more</button></div>`;    }

    const metaText = Array.isArray(proj.meta) ? proj.meta.join(" · ") : (proj.meta || "");

    // To put the description below the images, move ${descriptionHtml}
    // to after ${buildCarousel(proj)}.
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

    streamContainer.appendChild(card);
    initDescription(card); 
  });

  setupScrollHighlight();
}

function setupCategoryFilters() {
  const buttons = document.querySelectorAll(".cat-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Update active state on buttons
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const selectedCategory = btn.getAttribute("data-category");

      if (selectedCategory === "all") {
        renderPortfolio(allProjects);
      } else {
        // Filter projects that include selected category
        const filtered = allProjects.filter(p => p.categories.includes(selectedCategory));
        renderPortfolio(filtered);
      }
    });
  });
}

// Keeps the active project name in view inside the index.
// Mobile: the index is a horizontal strip, so slide the name to the center.
// Desktop: the index is a vertical list, so just keep the name visible.
function centerIndexItem(item) {
  const box = item.parentElement; // #left-index
  const isMobile = window.matchMedia("(max-width: 900px)").matches;

  if (isMobile) {
    box.scrollTo({
      left: item.offsetLeft - (box.clientWidth - item.offsetWidth) / 2,
      behavior: "smooth"
    });
  } else {
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

let activeObserver = null;

function setupScrollHighlight() {
  // Disconnect the previous observer (needed because filtering re-renders the cards)
  if (activeObserver) activeObserver.disconnect();

  const cards = document.querySelectorAll(".project-card");
  const indexItems = document.querySelectorAll(".index-item");
  if (!cards.length) return;

  activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace("card-", "");

          indexItems.forEach(item => {
            item.classList.toggle("active", item.getAttribute("data-id") === id);
          });

          // Keep the active title visible / centered in the index
          const activeItem = document.querySelector(`.index-item[data-id="${id}"]`);
          if (activeItem) centerIndexItem(activeItem);
        }
      });
    },
    {
      // Only the horizontal band 20%-40% from the top of the viewport counts as "active"
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0
    }
  );

  cards.forEach(card => activeObserver.observe(card));
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