// ===== ナビゲーション =====
const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('main-nav');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
    }
  });
}

// アクティブナビゲーション
const navLinks = document.querySelectorAll('nav a[href^="#"]');
const sections = document.querySelectorAll('.section[id]');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + entry.target.id) {
          link.classList.add('active');
        }
      });
    }
  });
}, { threshold: 0.25, rootMargin: '-80px 0px -50% 0px' });

sections.forEach(s => observer.observe(s));

// ===== 検索 & フィルター =====
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterChips = document.querySelectorAll('.filter-chip');
const resultItems = document.querySelectorAll('.search-result-item');
const noResult = document.getElementById('no-result');

let activeFilter = 'all';
let searchQuery = '';

function runSearch() {
  searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
  let visibleCount = 0;

  resultItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    const type = item.dataset.type || '';

    const matchesFilter = activeFilter === 'all' || type === activeFilter;
    const matchesQuery = searchQuery === '' || text.includes(searchQuery);

    if (matchesFilter && matchesQuery) {
      item.classList.remove('hidden');
      visibleCount++;

      // キーワードハイライト
      if (searchQuery) {
        highlightKeyword(item, searchQuery);
      } else {
        removeHighlight(item);
      }
    } else {
      item.classList.add('hidden');
    }
  });

  if (noResult) {
    noResult.classList.toggle('hidden', visibleCount > 0);
  }
}

function highlightKeyword(el, query) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (parent.classList && parent.classList.contains('highlight')) return;
    const text = textNode.textContent;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    if (regex.test(text)) {
      const span = document.createElement('span');
      span.innerHTML = text.replace(regex, '<mark class="highlight">$1</mark>');
      parent.replaceChild(span, textNode);
    }
  });
}

function removeHighlight(el) {
  el.querySelectorAll('.highlight').forEach(mark => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (searchBtn) {
  searchBtn.addEventListener('click', runSearch);
}

if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value === '') {
      searchQuery = '';
      runSearch();
    }
  });
}

filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter || 'all';
    runSearch();
  });
});

// ===== ページトップへ =====
const backToTop = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
  if (backToTop) {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }
});

if (backToTop) {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== ニュース RSS取得 =====
const NEWS_FEEDS = [
  {
    key: 'jis',
    label: 'JIS',
    url: 'https://news.google.com/rss/search?q=JIS+日本産業規格&hl=ja&gl=JP&ceid=JP:ja'
  },
  {
    key: 'iso',
    label: 'ISO',
    url: 'https://news.google.com/rss/search?q=ISO+国際規格+標準化&hl=ja&gl=JP&ceid=JP:ja'
  },
  {
    key: 'iec',
    label: 'IEC',
    url: 'https://news.google.com/rss/search?q=IEC+国際電気標準&hl=ja&gl=JP&ceid=JP:ja'
  },
  {
    key: 'ieee',
    label: 'IEEE',
    url: 'https://news.google.com/rss/search?q=IEEE+規格+標準&hl=ja&gl=JP&ceid=JP:ja'
  }
];

async function fetchFeed(feed) {
  const proxies = [
    u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];
  let text = null;
  for (const makeProxy of proxies) {
    try {
      const res = await fetch(makeProxy(feed.url), { signal: AbortSignal.timeout(6000) });
      if (res.ok) { text = await res.text(); break; }
    } catch (_) {}
  }
  if (!text) throw new Error('all proxies failed');

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const items = Array.from(xml.querySelectorAll('item, entry')).slice(0, 5);
  if (items.length === 0) throw new Error('no items');

  return items.map(item => {
    const rawDesc = item.querySelector('description, summary')?.textContent || '';
    const tmp = document.createElement('div');
    tmp.innerHTML = rawDesc;
    const desc = tmp.textContent.trim().slice(0, 120);
    const rawDate = item.querySelector('pubDate, published, updated')?.textContent || '';
    const date = rawDate ? new Date(rawDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    const link = item.querySelector('link')?.textContent?.trim()
      || item.querySelector('link')?.getAttribute('href') || '';
    return {
      source: feed.key,
      label: feed.label,
      title: item.querySelector('title')?.textContent.trim() || '',
      link,
      desc,
      date
    };
  });
}

async function loadNews() {
  const loading = document.getElementById('news-loading');
  const error = document.getElementById('news-error');
  const list = document.getElementById('news-list');
  if (!list) return;

  const results = await Promise.allSettled(NEWS_FEEDS.map(fetchFeed));
  const allItems = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  if (loading) loading.classList.add('hidden');

  if (allItems.length === 0) {
    if (error) error.classList.remove('hidden');
    return;
  }

  allItems.forEach(item => {
    const a = document.createElement('a');
    a.href = item.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'news-item';
    a.dataset.newsType = item.source;
    a.innerHTML = `
      <div class="news-source-badge ${item.source}">${item.label}</div>
      <div class="news-body">
        <h4>${item.title}</h4>
        ${item.desc ? `<p>${item.desc}…</p>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <span class="news-date">${item.date}</span>
        <span class="news-arrow">→</span>
      </div>
    `;
    list.appendChild(a);
  });

  // ニュースフィルター
  document.querySelectorAll('[data-news-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-news-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.newsFilter;
      document.querySelectorAll('.news-item').forEach(el => {
        el.classList.toggle('hidden', f !== 'all' && el.dataset.newsType !== f);
      });
    });
  });
}

loadNews();

// ===== スムーススクロール（ナビ） =====
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (nav) nav.classList.remove('open');
    }
  });
});
