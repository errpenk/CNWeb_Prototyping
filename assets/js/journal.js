function initLuxReader() {
  const articleData = window.LUXUREAT_ARTICLE_DATA || {};
  const articles = articleData.articles || {};
  const events = window.LUXUREAT_EVENT_DATA?.events || [];
  const eventMount = document.querySelector("[data-recent-events]");
  const eventHash = decodeURIComponent(location.hash).replace(/^#event-/, "");
  const triggers = document.querySelectorAll("[data-reader-open], [data-reader-archive], [data-event-open]");
  if (!triggers.length && !eventMount && !events.some((event) => event.id === eventHash)) return;
  if (!Object.keys(articles).length && !events.length) return;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
  const labels = () => document.documentElement.lang?.startsWith("zh")
    ? { back: "返回", close: "关闭", related: "延伸阅读", read: "阅读详情", archive: "往期随笔", note: "品鉴笔记", noteText: "温度、器具与节奏共同决定入口的第一层印象；真正的奢华来自克制而准确的服务。" }
    : { back: "Back", close: "Close", related: "Further Reading", read: "Read Details", archive: "Archive", note: "Tasting Notes", noteText: "Temperature, service ware, and pacing shape the first impression; luxury is restraint made precise." };
  const archiveGroups = () => document.documentElement.lang?.startsWith("zh")
    ? [
      ["品牌与产地", ["zh-harvest", "zh-truffle"]],
      ["服务与工艺", ["zh-service", "zh-malossol"]],
      ["品鉴仪式", ["zh-champagne", "zh-mother-of-pearl", "zh-ice-server", "zh-breath", "zh-hand-warm", "zh-palate"]],
    ]
    : [
      ["Maison & Origin", ["en-harvest", "en-truffle"]],
      ["Service & Craft", ["en-service", "en-malossol"]],
      ["Tasting Ritual", ["en-champagne", "en-mother-of-pearl", "en-ice-server", "en-breath", "en-hand-warm", "en-palate"]],
    ];
  const lang = document.documentElement.lang?.startsWith("zh") ? "zh" : "en";
  const eventLabels = lang === "zh"
    ? { kicker: "Maison Events", title: "最近活动", latest: "最新活动", past: "过往活动", empty: "暂无过往活动", read: "查看详情" }
    : { kicker: "Maison Events", title: "Recent Events", latest: "Latest Event", past: "Past Events", empty: "No past events yet", read: "View details" };

  const renderRecentEvents = () => {
    if (!eventMount) return;
    const latest = events.find((event) => event.status === "latest");
    const past = events.filter((event) => event.status === "past");
    const latestCopy = latest?.[lang];
    eventMount.innerHTML = `
      <div class="lux-recent-events-inner">
        <header class="lux-recent-events-head">
          <span>${eventLabels.kicker}</span>
          <h2>${eventLabels.title}</h2>
        </header>
        <div class="lux-recent-events-latest">
          <h3>${eventLabels.latest}</h3>
          ${latest && latestCopy ? `
            <button type="button" class="lux-event-card" data-event-open="${escapeHtml(latest.id)}">
              <img src="${escapeHtml(latest.image)}" alt="${escapeHtml(latestCopy.articleTitle)}">
              <span class="lux-event-card-copy">
                <small>${escapeHtml(latestCopy.dateIso)} · ${escapeHtml(latestCopy.city)}</small>
                <strong>${escapeHtml(latestCopy.articleTitle)}</strong>
                <span>${escapeHtml(latestCopy.intro)}</span>
                <span class="lux-narrative-link">${eventLabels.read}<span class="material-symbols-outlined">arrow_forward</span></span>
              </span>
            </button>` : ""}
        </div>
        <div class="lux-past-events">
          <h3>${eventLabels.past}</h3>
          ${past.length ? `<div class="lux-past-events-grid">${past.map((event) => {
            const copy = event[lang];
            return `<button type="button" class="lux-event-card" data-event-open="${escapeHtml(event.id)}"><img src="${escapeHtml(event.image)}" alt="${escapeHtml(copy.articleTitle)}"><span class="lux-event-card-copy"><small>${escapeHtml(copy.dateIso)} · ${escapeHtml(copy.city)}</small><strong>${escapeHtml(copy.articleTitle)}</strong></span></button>`;
          }).join("")}</div>` : `<p class="lux-event-empty">${eventLabels.empty}</p>`}
        </div>
      </div>`;
  };
  renderRecentEvents();

  const syncReaderCards = () => {
    const seen = new Set();
    const sync = (node, article) => {
      if (!node || seen.has(node)) return;
      seen.add(node);
      const image = node.querySelector("img");
      const background = node.querySelector(".lux-dark-photo-bg, [style*='background-image']");
      if (image) {
        image.src = article.image;
        image.alt = article.title;
      } else if (background) {
        background.style.backgroundImage = `url("${article.image}")`;
      }
      const heading = node.querySelector("h1,h2,h3,h4");
      if (heading) heading.textContent = article.title;
      const eyebrow = Array.from(node.querySelectorAll("span"))
        .find((span) => !span.closest("a,button") && !span.classList.contains("material-symbols-outlined") && /\D/.test(span.textContent.trim()) && span.textContent.trim().length < 64);
      if (eyebrow) eyebrow.textContent = article.eyebrow;
      const paragraph = node.querySelector("p");
      if (paragraph) paragraph.textContent = article.cardText || article.intro;
    };

    document.querySelectorAll("[data-reader-open]").forEach((trigger) => {
      const article = articles[trigger.dataset.readerOpen];
      if (!article) return;
      sync(trigger.closest(".lux-reader-card, .article-card") || trigger.parentElement, article);
    });
  };
  syncReaderCards();

  const reader = document.createElement("div");
  reader.className = "lux-reader";
  reader.hidden = true;
  reader.innerHTML = `
    <div class="lux-reader-backdrop" data-reader-close></div>
    <section class="lux-reader-panel" role="dialog" aria-modal="true" aria-labelledby="lux-reader-title">
      <header class="lux-reader-header">
        <button type="button" class="lux-reader-back" data-reader-back hidden></button>
        <button type="button" class="lux-reader-close" data-reader-close></button>
      </header>
      <div class="lux-reader-body" tabindex="-1"></div>
    </section>`;
  document.body.appendChild(reader);

  const body = reader.querySelector(".lux-reader-body");
  const panel = reader.querySelector(".lux-reader-panel");
  const backButton = reader.querySelector("[data-reader-back]");
  const closeButtons = reader.querySelectorAll("[data-reader-close]");
  let currentId = "";
  const stack = [];
  const syncReaderTop = () => {
    panel.classList.toggle("is-at-top", body.scrollTop <= 4);
  };

  const showReader = (copy) => {
    reader.hidden = false;
    document.body.classList.add("lux-reader-open");
    backButton.hidden = stack.length === 0;
    backButton.textContent = copy.back;
    reader.querySelector(".lux-reader-close").textContent = copy.close;
    body.focus();
    body.scrollTop = 0;
    syncReaderTop();
  };

  const renderArchive = (push) => {
    if (push && currentId) stack.push(currentId);
    currentId = "__archive";
    const copy = labels();
    const groups = archiveGroups();
    const allLabel = document.documentElement.lang?.startsWith("zh") ? "全部内容" : "All Collections";
    const items = groups.flatMap(([title, ids]) => ids.map((id) => ({ id, title })));
    body.innerHTML = `
      <article class="lux-reader-archive">
        <div class="lux-reader-archive-head">
          <h2>${escapeHtml(copy.archive)}</h2>
          <div class="lux-reader-archive-tabs">
            <button type="button" class="is-active" data-reader-archive-filter="all">${escapeHtml(allLabel)}</button>
            ${groups.map(([title]) => `<button type="button" data-reader-archive-filter="${escapeHtml(title)}">${escapeHtml(title)}</button>`).join("")}
          </div>
        </div>
        <div class="lux-reader-archive-grid">
          ${items.map(({ id, title }) => {
            const item = articles[id];
            return item ? `
              <button type="button" class="lux-reader-archive-card" data-reader-archive-item="${escapeHtml(id)}" data-reader-archive-category="${escapeHtml(title)}">
                <span class="lux-reader-archive-media"><img src="${escapeHtml(item.image)}" alt=""><span class="lux-reader-archive-cta">${copy.read}</span></span>
                <span class="lux-reader-archive-copy"><span>${escapeHtml(item.eyebrow)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.meta)}</small></span>
              </button>` : "";
          }).join("")}
        </div>
      </article>`;
    showReader(copy);
  };

  const render = (id, push) => {
    const article = articles[id];
    if (!article) return;
    if (push && currentId) stack.push(currentId);
    currentId = id;
    const copy = labels();
    const articleSections = article.sections.length ? article.sections : [[copy.note, copy.noteText]];
    const paragraphs = (content) => (Array.isArray(content) ? content : [content])
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
    const plainText = [article.intro, ...articleSections.flatMap(([, content]) => Array.isArray(content) ? content : [content])].join("");
    const minutes = Math.max(4, Math.ceil(plainText.length / (article.lang === "zh" ? 450 : 900)));
    const metaParts = article.meta.split("·").map((part) => part.trim()).filter(Boolean);
    const readTime = article.lang === "zh" ? `${minutes} 分钟阅读` : `${minutes} min read`;
    const issue = article.lang === "zh" ? "LuxurEat 志" : "LuxurEat Journal";
    const metaItems = [issue, article.eyebrow, readTime, metaParts[1] || metaParts[0] || ""];
    const asideRows = [
      [article.lang === "zh" ? "栏目" : "Column", article.eyebrow],
      [article.lang === "zh" ? "档案" : "Series", metaParts[0] || copy.archive],
      [article.lang === "zh" ? "日期" : "Date", metaParts[1] || ""],
    ].filter(([, value]) => value);
    const tocLabel = article.lang === "zh" ? "目录" : "Contents";
    const sectionHtml = articleSections.map(([heading, content], index) => `
          <section class="lux-reader-section" id="lux-reader-section-${index}">
            <h3>${escapeHtml(heading)}</h3>
            ${paragraphs(content)}
          </section>`).join("");
    const tocHtml = articleSections.map(([heading], index) => `<a href="#lux-reader-section-${index}">${escapeHtml(heading)}</a>`).join("");

    body.innerHTML = `
      <article class="lux-reader-layout">
        <div class="lux-reader-rule"></div>
        <section class="lux-reader-hero">
          <div class="lux-reader-hero-copy">
            <div class="lux-reader-meta-grid">
              ${metaItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            </div>
            <h2 id="lux-reader-title">${escapeHtml(article.title)}</h2>
            <p class="lux-reader-summary">${escapeHtml(article.intro)}</p>
          </div>
          <figure class="lux-reader-cover">
            <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}">
            <figcaption>Figure 01 / ${escapeHtml(article.eyebrow)}</figcaption>
          </figure>
        </section>
        <section class="lux-reader-content">
          <aside class="lux-reader-aside">
            ${asideRows.map(([label, value]) => `<span>${escapeHtml(label)}：${escapeHtml(value)}</span>`).join("")}
          </aside>
          <div class="lux-reader-copy">
            ${sectionHtml}
            ${article.quote ? `<blockquote class="lux-reader-quote">${escapeHtml(article.quote)}</blockquote>` : ""}
          </div>
          <aside class="lux-reader-pull">
            <p>${escapeHtml(article.quote || copy.noteText)}</p>
            <nav class="lux-reader-toc" aria-label="${escapeHtml(tocLabel)}">
              <span>${escapeHtml(tocLabel)}</span>
              ${tocHtml}
            </nav>
          </aside>
        </section>
          <section class="lux-reader-related">
            <div class="lux-reader-related-head">
              <h3>${copy.related}</h3>
            </div>
            <div class="lux-reader-related-grid">
              ${article.related.map((relatedId) => {
                const item = articles[relatedId];
                return item ? `
                  <button type="button" data-reader-related="${escapeHtml(relatedId)}">
                    <span class="lux-reader-related-media">
                      <img src="${escapeHtml(item.image)}" alt="">
                      <span class="lux-reader-related-cta">${copy.read}</span>
                    </span>
                    <span>${escapeHtml(item.eyebrow)}</span>
                    <strong>${escapeHtml(item.title)}</strong>
                  </button>` : "";
              }).join("")}
            </div>
          </section>
      </article>`;

    showReader(copy);
  };

  const renderEvent = (id) => {
    const event = events.find((item) => item.id === id);
    const article = event?.[lang];
    if (!event || !article) return;
    stack.length = 0;
    currentId = `event:${id}`;
    const copy = labels();
    const allEvents = events.map((item) => ({ item, copy: item[lang] })).filter(({ copy: itemCopy }) => itemCopy);
    body.innerHTML = `
      <article class="lux-event-reader">
        <header class="lux-event-reader-intro">
          <div>
            <p>${escapeHtml(article.eyebrow)} / ${escapeHtml(article.category)}</p>
            <h2 id="lux-reader-title">${escapeHtml(article.articleTitle)}</h2>
          </div>
          <p>${escapeHtml(article.intro)}</p>
        </header>
        <div class="lux-event-reader-layout">
          <section class="lux-event-reader-article">
            <figure><img src="${escapeHtml(event.image)}" alt="${escapeHtml(article.articleTitle)}"></figure>
            <div class="lux-event-reader-lead">
              <span>${escapeHtml(article.dateIso)}<br>${escapeHtml(article.city)}<br>${escapeHtml(article.category)}</span>
              <p>${escapeHtml(article.intro)}</p>
            </div>
            <div class="lux-event-reader-copy">
              <aside>${lang === "zh" ? "活动回顾" : "Event Journal"}<br>${escapeHtml(article.location)}</aside>
              <div>
                ${article.sections.map(([heading, text]) => `<section><h3>${escapeHtml(heading)}</h3><p>${escapeHtml(text)}</p></section>`).join("")}
                <blockquote>${escapeHtml(article.quote)}</blockquote>
              </div>
            </div>
          </section>
          <aside class="lux-event-reader-index">
            <div><h3>${lang === "zh" ? "所有活动" : "All Events"}</h3><span>${String(allEvents.length).padStart(2, "0")}</span></div>
            ${allEvents.map(({ item, copy: itemCopy }, index) => `<button type="button" data-event-open="${escapeHtml(item.id)}"><img src="${escapeHtml(item.poster || item.image)}" alt=""><span><strong>${escapeHtml(itemCopy.articleTitle)}</strong><small>${escapeHtml(itemCopy.city)} / ${escapeHtml(itemCopy.dateIso)}</small></span><small>${String(index + 1).padStart(2, "0")}</small></button>`).join("")}
          </aside>
        </div>
      </article>`;
    showReader(copy);
  };

  const open = (id) => {
    stack.length = 0;
    currentId = "";
    render(id, false);
  };
  const close = () => {
    reader.hidden = true;
    document.body.classList.remove("lux-reader-open");
    stack.length = 0;
    currentId = "";
    if (location.hash.startsWith("#event-")) history.replaceState(null, "", `${location.pathname}${location.search}`);
  };

  document.addEventListener("click", (event) => {
    const eventTrigger = event.target.closest("[data-event-open]");
    if (eventTrigger) {
      event.preventDefault();
      renderEvent(eventTrigger.dataset.eventOpen);
      return;
    }
    const archive = event.target.closest("[data-reader-archive]");
    if (archive) {
      event.preventDefault();
      stack.length = 0;
      currentId = "";
      renderArchive(false);
      return;
    }
    const trigger = event.target.closest("[data-reader-open]");
    if (!trigger || !articles[trigger.dataset.readerOpen]) return;
    event.preventDefault();
    open(trigger.dataset.readerOpen);
  });
  body.addEventListener("click", (event) => {
    const archived = event.target.closest("[data-reader-archive-item]");
    if (archived) {
      render(archived.dataset.readerArchiveItem, true);
      return;
    }
    const related = event.target.closest("[data-reader-related]");
    if (related) render(related.dataset.readerRelated, true);
    const archiveFilter = event.target.closest("[data-reader-archive-filter]");
    if (archiveFilter) {
      const filter = archiveFilter.dataset.readerArchiveFilter || "all";
      body.querySelectorAll("[data-reader-archive-filter]").forEach((button) => {
        button.classList.toggle("is-active", button === archiveFilter);
      });
      body.querySelectorAll("[data-reader-archive-category]").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.readerArchiveCategory !== filter;
      });
    }
  });
  body.addEventListener("scroll", syncReaderTop, { passive: true });
  backButton.addEventListener("click", () => {
    const previous = stack.pop();
    if (previous === "__archive") renderArchive(false);
    else if (previous) render(previous, false);
  });
  closeButtons.forEach((button) => button.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !reader.hidden) close();
  });
  if (events.some((event) => event.id === eventHash)) renderEvent(eventHash);
}


document.addEventListener("DOMContentLoaded", initLuxReader);
