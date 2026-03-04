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
