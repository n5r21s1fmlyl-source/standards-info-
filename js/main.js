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
      // モバイルメニューを閉じたらドロップダウンも閉じる
      document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
    }
  });
}

// ===== ドロップダウングループ制御 =====
document.querySelectorAll('.nav-group-trigger').forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const group = trigger.closest('.nav-group');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // モバイル：クリックでトグル（他を閉じる）
      const wasOpen = group.classList.contains('open');
      document.querySelectorAll('.nav-group.open').forEach(g => {
        g.classList.remove('open');
        g.querySelector('.nav-group-trigger').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        group.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    }
    // デスクトップはCSSのhoverで制御
  });
});

// ドロップダウン内のリンクをクリックしたらモバイルメニューを閉じる
document.querySelectorAll('.nav-dropdown a').forEach(link => {
  link.addEventListener('click', () => {
    if (nav) nav.classList.remove('open');
    document.querySelectorAll('.nav-group.open').forEach(g => {
      g.classList.remove('open');
      g.querySelector('.nav-group-trigger').setAttribute('aria-expanded', 'false');
    });
  });
});

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

// ===== 規格番号データベース（メインページ） =====
function initStandardsDB() {
  const tabBtns   = document.querySelectorAll('.db-tab');
  const searchEl  = document.getElementById('db-search-input');
  const catWrap   = document.getElementById('db-cat-filters');
  const counterEl = document.getElementById('db-counter');
  const listEl    = document.getElementById('db-list');
  if (!listEl) return;

  const orgColors = { jis:'jis', iso:'iso', iec:'iec', ieee:'ieee' };
  let currentOrg  = 'jis';
  let currentCat  = 'すべて';

  // タブに色クラスを追加
  tabBtns.forEach(btn => {
    btn.classList.add(btn.dataset.dbOrg + '-tab');
  });

  function getSearchUrlDB(org, id) {
    const num = id.replace(/^(JIS|ISO|IEC|IEEE)\s*/i, '');
    const q = encodeURIComponent(num);
    switch (org) {
      case 'jis':  return `https://www.jisc.go.jp/`;
      case 'iso':  return `https://www.iso.org/search.html#q=${encodeURIComponent(id)}`;
      case 'iec':  return `https://www.iec.ch/`;
      case 'ieee': return `https://standards.ieee.org/search/?q=${q}`;
      default:     return '#';
    }
  }

  function buildCatFilters(org) {
    const db = STANDARDS_DB[org] || [];
    const cats = ['すべて', ...new Set(db.map(s => s.cat))];
    catWrap.innerHTML = '';
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'db-cat-btn' + (cat === 'すべて' ? ' active' : '');
      btn.textContent = cat;
      btn.dataset.cat = cat;
      btn.addEventListener('click', () => {
        catWrap.querySelectorAll('.db-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCat = cat;
        renderList();
      });
      catWrap.appendChild(btn);
    });
  }

  function renderList() {
    const db = STANDARDS_DB[currentOrg] || [];
    const q  = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const filtered = db.filter(s => {
      const matchCat = currentCat === 'すべて' || s.cat === currentCat;
      const matchQ   = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q) || (s.toc && s.toc.some(t => t.toLowerCase().includes(q)));
      return matchCat && matchQ;
    });

    counterEl.textContent = `${filtered.length} 件 / 全 ${db.length} 件`;

    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="db-empty">該当する規格が見つかりませんでした。</p>';
      return;
    }

    const org = currentOrg;
    listEl.innerHTML = filtered.map(s => `
      <div class="db-item">
        <div class="db-item-head">
          <span class="card-tag ${org}" style="margin:0;font-size:0.72rem;padding:2px 8px;">${s.id}</span>
          <span class="db-item-cat">${s.cat}</span>
        </div>
        <div class="db-item-name">${s.name}</div>
        <div class="db-item-overview-label">📝 概要</div>
        <div class="db-item-desc">${s.desc}</div>
        ${s.toc && s.toc.length ? `<details class="db-item-toc">
          <summary>📋 目次を表示（${s.toc.length}章）</summary>
          <ol class="db-item-toc-list">${s.toc.map(t => `<li>${t}</li>`).join('')}</ol>
        </details>` : ''}
        <a class="db-item-link ${org}" href="${getSearchUrlDB(org, s.id)}" target="_blank" rel="noopener noreferrer">🔗 公式サイトで確認</a>
      </div>`).join('');
  }

  function switchOrg(org) {
    currentOrg = org;
    currentCat = 'すべて';
    if (searchEl) searchEl.value = '';
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.dbOrg === org));
    buildCatFilters(org);
    renderList();
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchOrg(btn.dataset.dbOrg));
  });

  if (searchEl) {
    searchEl.addEventListener('input', renderList);
  }

  // 初期表示
  switchOrg('jis');
}

loadNews();

// ===== 規格詳細モーダル =====
const ORG_DATA = {
  jis: {
    name: 'JIS（日本産業規格）',
    nameEn: 'Japanese Industrial Standards',
    color: 'jis',
    intro: 'JIS規格は産業標準化法に基づき、日本産業標準調査会（JISC）が策定・審議し、主務大臣が制定します。工業製品の品質・安全性・互換性の確保を目的とし、製造・建設・サービスなど幅広い分野をカバーしています。',
    tipBox: 'JISマークは、JIS規格に適合した製品であることを示す任意の認証マーク。国が登録した機関（登録認証機関）によって認証された製品に付与できます。消費者・購買者が製品品質を確認する手がかりとなります。なお、JIS規格の約65%はISO/IEC規格と整合化（IDT・MOD・NEQ）されています。',
    officialLinks: [
      { label: '🌐 JISC公式サイト',  url: 'https://www.jisc.go.jp/' },
      { label: '📄 JIS規格票閲覧（JSA）', url: 'https://webdesk.jsa.or.jp/' },
      { label: '🏛 経済産業省 標準化',  url: 'https://www.meti.go.jp/policy/economy/hyojun-kijun/index.html' },
    ],
    categories: [
      { code: 'JIS A', field: '土木・建築',     examples: 'JIS A 5308（レディーミクストコンクリート）、JIS A 1108（圧縮強度試験）' },
      { code: 'JIS B', field: '一般機械',       examples: 'JIS B 0001（機械製図）、JIS B 1521（深みぞ玉軸受）' },
      { code: 'JIS C', field: '電子機器・電気機械', examples: 'JIS C 8105（照明器具）、JIS C 6802（レーザ製品の安全基準）' },
      { code: 'JIS D', field: '自動車',         examples: 'JIS D 0023（自動車部品の電磁両立性）、JIS D 3402（自動車用安全ガラス）' },
      { code: 'JIS E', field: '鉄道',           examples: 'JIS E 1001（鉄道用語）、JIS E 1101（普通レール）、JIS E 4001（鉄道車両通則）' },
      { code: 'JIS F', field: '船舶',           examples: 'JIS F 3301（船用消防設備）、JIS F 7001（船用計器通則）、JIS F 8001（船用電気設備通則）' },
      { code: 'JIS G', field: '鉄鋼',           examples: 'JIS G 3101（一般構造用圧延鋼材）、JIS G 4051（機械構造用炭素鋼）' },
      { code: 'JIS H', field: '非鉄金属',       examples: 'JIS H 4000（アルミニウム及びアルミニウム合金の板及び条）' },
      { code: 'JIS K', field: '化学',           examples: 'JIS K 6251（加硫ゴム—引張特性の求め方）' },
      { code: 'JIS L', field: '繊維',           examples: 'JIS L 0001（繊維製品の取扱いに関する表示記号）' },
      { code: 'JIS M', field: '鉱山',           examples: 'JIS M 1002（鉱山技術用語）、JIS M 8002（鉄鉱石サンプリング）' },
      { code: 'JIS P', field: 'パルプ・紙',     examples: 'JIS P 0001（紙・板紙及びパルプ用語）、JIS P 8124（坪量の測定方法）' },
      { code: 'JIS Q', field: 'マネジメントシステム', examples: 'JIS Q 9001（品質マネジメント）、JIS Q 14001（環境マネジメント）' },
      { code: 'JIS R', field: '窯業',           examples: 'JIS R 5210（ポルトランドセメント）、JIS R 6001（研磨材の粒度）、JIS R 1601（ファインセラミックスの曲げ強さ）' },
      { code: 'JIS S', field: '日用品',         examples: 'JIS S 1101（木製いす）、JIS S 2030（ガス燃焼機器）、JIS S 2110（家庭用電気冷蔵庫及び冷凍庫）' },
      { code: 'JIS T', field: '医療安全用具',   examples: 'JIS T 0601（医用電気機器の安全通則）' },
      { code: 'JIS W', field: '航空',           examples: 'JIS W 1001（航空用語）、JIS W 7001（航空機の地上支援機器）、JIS W 2001（航空宇宙用材料試験方法）' },
      { code: 'JIS X', field: '情報処理',       examples: 'JIS X 0208（2バイト情報交換用符号化漢字集合）、JIS X 0213' },
      { code: 'JIS Z', field: 'その他（包装・物流等）', examples: 'JIS Z 0200（包装方法通則）、JIS Z 8301（規格票の様式）' },
    ],
    standards: [
      { id: 'JIS Q 9001', name: '品質マネジメントシステム', desc: 'ISO 9001対応。製品・サービスの品質を継続的に改善するためのシステム要求事項。', url: 'https://www.jisc.go.jp/', urlLabel: 'JISC で検索' },
      { id: 'JIS Q 14001', name: '環境マネジメントシステム', desc: 'ISO 14001対応。環境負荷低減・法令遵守を目的としたシステム要求事項。', url: 'https://www.jisc.go.jp/', urlLabel: 'JISC で検索' },
      { id: 'JIS Q 27001', name: '情報セキュリティマネジメント', desc: 'ISO/IEC 27001対応。情報資産保護のためのISMS要求事項。', url: 'https://www.jisc.go.jp/', urlLabel: 'JISC で検索' },
      { id: 'JIS X 0208', name: '2バイト情報交換用符号化漢字集合', desc: '日本語文字コード規格。Shift-JIS・EUC-JPの基盤となった歴史的規格。', url: 'https://www.jisc.go.jp/', urlLabel: 'JISC で検索' },
      { id: 'JIS B 0001', name: '機械製図', desc: '図面作成の標準規格。線の種類・寸法記入法・投影法などを規定。', url: 'https://www.jisc.go.jp/', urlLabel: 'JISC で検索' },
      { id: 'JIS G 3101', name: '一般構造用圧延鋼材（SS400等）', desc: 'SS400などの建築・橋梁用鋼材の規格。引張強さ・化学成分を規定。', url: 'https://www.jisc.go.jp/', urlLabel: 'JISC で検索' },
      { id: 'JIS L 0001', name: '繊維製品の取扱い表示', desc: 'ケアラベルの洗濯・乾燥・アイロン等の絵表示を定めた規格。ISO 3758と整合。', url: 'https://www.jisc.go.jp/', urlLabel: 'JISC で検索' },
      { id: 'JIS T 0601', name: '医用電気機器の安全通則', desc: 'IEC 60601対応。医療機器の電気的安全性に関する基本要求事項。', url: 'https://www.jisc.go.jp/', urlLabel: 'JISC で検索' },
    ],
  },
  iso: {
    name: 'ISO（国際標準化機構）',
    nameEn: 'International Organization for Standardization',
    color: 'iso',
    intro: '電気・電子分野を除く工業・農業・サービス等の国際規格を策定する非政府国際機関。170か国以上が参加し、国際的な貿易・技術交流の円滑化に貢献しています。',
    process: [
      { step: 'STEP 1', title: '予備段階（PWI）',   desc: '予備作業項目として登録。ニーズ調査・提案準備。' },
      { step: 'STEP 2', title: '提案段階（NP）',    desc: '新業務項目提案。各国が投票し、承認されると技術委員会（TC）で審議開始。' },
      { step: 'STEP 3', title: '作成段階（WD）',    desc: '作業原案（Working Draft）を作成。TC内の作業グループ（WG）が担当。' },
      { step: 'STEP 4', title: '委員会段階（CD）',  desc: '委員会原案（Committee Draft）として各国メンバーに配布・コメント収集。' },
      { step: 'STEP 5', title: '照会段階（DIS）',   desc: '国際規格案（Draft International Standard）として広く意見を募集・投票。' },
      { step: 'STEP 6', title: '承認段階（FDIS）',  desc: '最終国際規格案（Final DIS）として最終投票。承認で次ステップへ。' },
      { step: 'STEP 7', title: '発行（IS）',        desc: '国際規格（International Standard）として正式発行。ISO事務局が管理。' },
    ],
    officialLinks: [
      { label: '🌐 ISO公式サイト',   url: 'https://www.iso.org/' },
      { label: '📄 規格一覧',         url: 'https://www.iso.org/standards.html' },
      { label: '🛒 ISO規格購入',      url: 'https://www.iso.org/store.html' },
      { label: '🔍 規格検索',         url: 'https://www.iso.org/search.html' },
    ],
    categories: [
      { code: 'TC 1〜69',   field: '一般・基礎',         examples: '単位・用語・品質管理など基礎的な規格' },
      { code: 'TC 147〜200', field: '建設・土木・材料',   examples: '鋼材・コンクリート・建設製品' },
      { code: 'TC 176',     field: '品質マネジメント',    examples: 'ISO 9001シリーズ（品質・顧客満足）' },
      { code: 'TC 207',     field: '環境マネジメント',    examples: 'ISO 14001シリーズ（環境管理）' },
      { code: 'TC 210',     field: '医療機器品質',        examples: 'ISO 13485（医療機器QMS）' },
      { code: 'TC 217',     field: '化粧品',              examples: 'ISO化粧品規格シリーズ' },
      { code: 'TC 229',     field: 'ナノテクノロジー',    examples: 'ナノ材料・計測技術' },
      { code: 'TC 242',     field: 'エネルギー管理',      examples: 'ISO 50001（エネルギーMS）' },
      { code: 'TC 260',     field: '人的資源マネジメント', examples: 'ISO 30414（人的資本報告）' },
      { code: 'TC 262',     field: 'リスクマネジメント',  examples: 'ISO 31000（リスク管理）' },
      { code: 'TC 292',     field: '安全・強靭性',        examples: 'ISO 22301（事業継続管理）' },
      { code: 'JTC 1',      field: '情報技術（ISO/IEC合同）', examples: 'ISO/IEC 27001・JTC 1全般' },
    ],
    standards: [
      { id: 'ISO 9001:2015',     name: '品質マネジメントシステム',       desc: '世界最多認証取得。顧客満足と品質改善の国際規格。', url: 'https://www.iso.org/standard/62085.html', urlLabel: 'ISO公式ページ' },
      { id: 'ISO 14001:2015',    name: '環境マネジメントシステム',       desc: 'PDCAサイクルに基づく環境管理の国際規格。', url: 'https://www.iso.org/standard/60857.html', urlLabel: 'ISO公式ページ' },
      { id: 'ISO 45001:2018',    name: '労働安全衛生マネジメント',       desc: '旧OHSAS 18001の後継。労働者の安全・健康保護。', url: 'https://www.iso.org/standard/63787.html', urlLabel: 'ISO公式ページ' },
      { id: 'ISO/IEC 27001:2022', name: '情報セキュリティマネジメント', desc: '情報資産のリスク管理・ISMS認証の基礎規格。', url: 'https://www.iso.org/standard/27001', urlLabel: 'ISO公式ページ' },
      { id: 'ISO 50001:2018',    name: 'エネルギーマネジメント',         desc: '省エネ・CO₂削減に貢献するエネルギー管理規格。', url: 'https://www.iso.org/standard/69426.html', urlLabel: 'ISO公式ページ' },
      { id: 'ISO 22000:2018',    name: '食品安全マネジメント',           desc: 'HACCPを取り入れた食品サプライチェーン安全規格。', url: 'https://www.iso.org/standard/65464.html', urlLabel: 'ISO公式ページ' },
      { id: 'ISO 13485:2016',    name: '医療機器品質マネジメント',       desc: '医療機器の設計・製造のための品質管理規格。', url: 'https://www.iso.org/standard/59752.html', urlLabel: 'ISO公式ページ' },
      { id: 'ISO 31000:2018',    name: 'リスクマネジメント',             desc: '業種・規模を問わず適用できる汎用リスク管理規格。', url: 'https://www.iso.org/standard/65694.html', urlLabel: 'ISO公式ページ' },
      { id: 'ISO 8601:2019',     name: '日付と時刻の表示形式',           desc: 'YYYY-MM-DD形式など日時表記の国際標準。', url: 'https://www.iso.org/standard/70907.html', urlLabel: 'ISO公式ページ' },
      { id: 'ISO 3166',          name: '国名コード',                     desc: 'JP・US・CNなど国・地域を表す英字コード規格。', url: 'https://www.iso.org/iso-3166-country-codes.html', urlLabel: 'ISO公式ページ' },
    ],
  },
  iec: {
    name: 'IEC（国際電気標準会議）',
    nameEn: 'International Electrotechnical Commission',
    color: 'iec',
    intro: '電気・電子・関連技術分野専門の国際規格機関です。ISOと協力してJTC 1（情報技術）などを共同運営しています。日本では日本電気技術規格委員会（JESC）が国内審議機関を担当しています。',
    officialLinks: [
      { label: '🌐 IEC公式サイト',    url: 'https://www.iec.ch/' },
      { label: '📄 IEC規格購入',       url: 'https://webstore.iec.ch/' },
      { label: '🔬 技術委員会一覧',    url: 'https://www.iec.ch/tc-and-sc' },
      { label: '🔍 規格検索',          url: 'https://webstore.iec.ch/en/search' },
    ],
    categories: [
      { code: 'TC 1〜59',   field: '一般・基礎・電子部品', examples: '単位・用語・コンデンサ・抵抗器等' },
      { code: 'TC 64',      field: '低圧電気設備',         examples: 'IEC 60364（建物の電気設備）' },
      { code: 'TC 62',      field: '医用電気機器',         examples: 'IEC 60601（医療機器の安全）' },
      { code: 'TC 66',      field: '測定・制御機器の安全', examples: 'IEC 61010（計測器・試験装置）' },
      { code: 'TC 65',      field: '産業用計測・制御',     examples: 'IEC 61511（プロセス安全）' },
      { code: 'TC 56',      field: '信頼性',               examples: 'IEC 60300（信頼性マネジメント）' },
      { code: 'TC 77',      field: '電磁両立性（EMC）',    examples: 'IEC 61000シリーズ' },
      { code: 'TC 57',      field: 'エネルギー管理・スマートグリッド', examples: 'IEC 61968・IEC 61970' },
      { code: 'TC 100',     field: 'AV・IT・マルチメディア', examples: 'IEC 62368（AV・IT機器の安全）' },
      { code: 'TC 108',     field: '電子機器の安全（IT・AV等）', examples: 'IEC 60950後継' },
      { code: 'TC 65/SC 65E', field: '機能安全',           examples: 'IEC 61508（機能安全基礎規格）' },
      { code: 'JTC 1（ISO共同）', field: '情報技術',       examples: 'ISO/IEC 27001・JTC 1全般' },
    ],
    standards: [
      { id: 'IEC 60364', name: '低圧電気設備',                 desc: '建築物内の電気設備の設計・施工・検査に関する基本規格。', url: 'https://webstore.iec.ch/en/publication?q=60364', urlLabel: 'IEC Webstore' },
      { id: 'IEC 60601', name: '医用電気機器の安全',            desc: '医療機器の電気的安全性・EMCに関する基本規格。', url: 'https://webstore.iec.ch/en/publication?q=60601', urlLabel: 'IEC Webstore' },
      { id: 'IEC 61010', name: '測定・制御・試験機器の安全',    desc: '計測器・試験機器・制御装置の安全規格。', url: 'https://webstore.iec.ch/en/publication?q=61010', urlLabel: 'IEC Webstore' },
      { id: 'IEC 61508', name: '機能安全（E/E/PE安全関連系）', desc: 'SIL（安全完全性レベル）を定義する機能安全の基礎規格。', url: 'https://webstore.iec.ch/en/publication?q=61508', urlLabel: 'IEC Webstore' },
      { id: 'IEC 62443', name: 'OTシステムのセキュリティ',      desc: '工場・プラントのサイバーセキュリティ規格シリーズ。', url: 'https://webstore.iec.ch/en/publication?q=62443', urlLabel: 'IEC Webstore' },
      { id: 'IEC 62368', name: '音響・映像・IT機器の安全',      desc: 'IEC 60065/60950を統合した次世代安全規格。', url: 'https://webstore.iec.ch/en/publication?q=62368', urlLabel: 'IEC Webstore' },
      { id: 'IEC 61000', name: '電磁両立性（EMC）',             desc: '電磁波発生・耐性に関する規格シリーズ。機器認証で必須。', url: 'https://webstore.iec.ch/en/publication?q=61000', urlLabel: 'IEC Webstore' },
      { id: 'ISO/IEC 27001', name: '情報セキュリティマネジメント', desc: 'ISOとIECの共同規格。JTC 1/SC 27が担当。', url: 'https://www.iso.org/standard/27001', urlLabel: 'ISO公式ページ' },
    ],
  },
  ieee: {
    name: 'IEEE（電気電子学会）',
    nameEn: 'Institute of Electrical and Electronics Engineers',
    color: 'ieee',
    intro: '世界最大の電気電子技術系学術団体であり、情報通信分野を中心に多数の技術規格を策定しています。Wi-Fi（IEEE 802.11）やEthernet（IEEE 802.3）など情報通信インフラを支える規格を多数策定しています。',
    officialLinks: [
      { label: '🌐 IEEE公式サイト',   url: 'https://www.ieee.org/' },
      { label: '📄 IEEE Standards',   url: 'https://standards.ieee.org/' },
      { label: '🔬 IEEE Xplore',      url: 'https://ieeexplore.ieee.org/' },
      { label: '🔍 規格検索',         url: 'https://standards.ieee.org/search/' },
    ],
    categories: [
      { code: 'IEEE 100番台',   field: 'ソフトウェア・システム工学', examples: 'IEEE 1016（ソフトウェア設計）、IEEE 1076（VHDL）' },
      { code: 'IEEE 200番台',   field: '電力・エネルギー',           examples: 'IEEE 242（保護継電器）' },
      { code: 'IEEE 400番台',   field: '電力ケーブル試験',           examples: 'IEEE 400（絶縁試験）' },
      { code: 'IEEE 600番台',   field: '計測・試験',                 examples: 'IEEE 622（センサー）' },
      { code: 'IEEE 700番台',   field: '倫理・AI',                   examples: 'IEEE 7000（倫理的システム設計）' },
      { code: 'IEEE 754',       field: 'コンピュータ演算',           examples: 'IEEE 754（浮動小数点演算）' },
      { code: 'IEEE 802シリーズ', field: 'ネットワーク・通信',       examples: '802.3（Ethernet）、802.11（Wi-Fi）、802.15（PAN）' },
      { code: 'IEEE 1000番台',  field: 'インタフェース・制御',       examples: 'IEEE 1284（パラレルポート）、IEEE 1394（FireWire）' },
      { code: 'IEEE 1500番台',  field: '時刻同期・スマートグリッド', examples: 'IEEE 1588（PTP）、IEEE 1547（分散電源）' },
      { code: 'IEEE 2000番台',  field: 'スマートグリッド・AI倫理',   examples: 'IEEE 2030（スマートグリッド）、IEEE 2140（暗号通貨）' },
    ],
    standards: [
      { id: 'IEEE 802.11', name: '無線LAN（Wi-Fi）',             desc: 'Wi-Fi 4〜7まで進化を続ける無線LAN標準規格。', url: 'https://standards.ieee.org/ieee/802.11/7028/', urlLabel: 'IEEE Standards' },
      { id: 'IEEE 802.3',  name: 'Ethernet（有線LAN）',          desc: '10Mbps〜400Gbpsの有線ネットワーク基本規格。', url: 'https://standards.ieee.org/ieee/802.3/7071/', urlLabel: 'IEEE Standards' },
      { id: 'IEEE 802.15', name: 'パーソナルエリアネットワーク', desc: 'Bluetooth・ZigBeeなど近距離無線通信の規格群。', url: 'https://standards.ieee.org/search/?q=802.15', urlLabel: 'IEEE Standards' },
      { id: 'IEEE 754',    name: '浮動小数点演算の標準',         desc: 'プログラミング言語の数値演算基盤となる基礎規格。', url: 'https://standards.ieee.org/ieee/754/6210/', urlLabel: 'IEEE Standards' },
      { id: 'IEEE 1588',   name: '高精度時刻同期（PTP）',        desc: 'ネットワーク上の高精度時刻同期。5G・産業ネットワークで重要。', url: 'https://standards.ieee.org/ieee/1588/6825/', urlLabel: 'IEEE Standards' },
      { id: 'IEEE 2030',   name: 'スマートグリッド相互運用性',   desc: '電力系統とITシステムの相互運用性規格。', url: 'https://standards.ieee.org/search/?q=2030', urlLabel: 'IEEE Standards' },
      { id: 'IEEE 7000',   name: '倫理的システム設計',           desc: 'AI・自動化システムの設計に倫理・プライバシーを組み込む規格。', url: 'https://standards.ieee.org/ieee/7000/6781/', urlLabel: 'IEEE Standards' },
    ],
  },
};

// ===== 詳細規格データベース =====
const STANDARDS_DB = {
  jis: [
    // A - 土木・建築
    { id:'JIS A 0001', cat:'A', name:'建築製図通則', desc:'建築設計に関する全図面に適用される製図通則。線の種類（実線・破線・一点鎖線等）・太さ・用途の区別、尺度の選択基準、文字の大きさ・書体、断面材料記号、寸法記入法などを体系的に規定する。建築士・設計者が共通の図面言語でコミュニケーションするための基礎規格であり、確認申請図書・施工図の作成に不可欠。ISO 128（技術製図）とも整合を図る。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 用紙の大きさ及び様式','5. 尺度','6. 線','7. 文字','8. 図形の表し方（投影法・断面図）','9. 寸法の記入','10. 材料及び構造の表示記号','附属書A（参考）表示例'] },
    { id:'JIS A 1108', cat:'A', name:'コンクリートの圧縮強度試験方法', desc:'直径100mmまたは150mmの円柱供試体を用い、圧縮試験機による破壊荷重からコンクリートの圧縮強度（N/mm²）を算出する方法を規定。養生条件（標準養生・現場養生）・試験タイミング・荷重速度・強度計算式を定める。建設工事における品質管理の根幹をなす試験方法であり、JIS A 5308（レディーミクストコンクリート）の受入検査でも参照される。コンクリート構造物の設計基準強度確認に必須。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験装置','5. 供試体の採取及び養生','6. 供試体の端面処理','7. 試験方法','8. 計算','9. 報告','附属書A（参考）試験結果の記録様式'] },
    { id:'JIS A 1109', cat:'A', name:'細骨材の密度及び吸水率試験方法', desc:'コンクリート用細骨材（砂）の密度・吸水率をフラスコ法（表乾状態）で測定する手順・計算式を規定する。密度と吸水率はコンクリートの配合設計・品質管理に不可欠な基礎データであり、W/C（水セメント比）の正確な設定に直結する。砕砂・天然砂・再生骨材など各種細骨材の品質評価で使用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験器具','5. 試料の準備（表乾状態の判定）','6. 試験方法','7. 計算','8. 報告'] },
    { id:'JIS A 5308', cat:'A', name:'レディーミクストコンクリート', desc:'生コン工場から施工現場へ輸送されるフレッシュコンクリートの品質基準を規定する最重要コンクリート規格。呼び強度（18〜60 N/mm²）・スランプ（2.5〜21cm）・水セメント比上限・空気量・塩化物含有量の上限値などを規定する。骨材・セメント・混和剤の種類による品質区分、受入検査の頻度・判定基準、コンクリート工場の品質管理義務も規定。建築・土木を問わず国内の建設工事ほぼすべてで参照される基幹規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類','5. 品質（強度・スランプ・空気量・塩化物含有量）','6. 材料（セメント・骨材・水・混和材料）','7. 配合','8. 製造','9. 運搬','10. 試験','11. 検査','附属書A（規定）骨材','附属書B（規定）混和材料','附属書C（参考）品質管理'] },
    { id:'JIS A 5371', cat:'A', name:'プレキャスト無筋コンクリート製品', desc:'縁石・側溝・L字溝・U字溝・集水桝蓋など工場生産の無筋コンクリートプレキャスト製品の寸法・外観・強度を規定する。圧縮強度の最低値・吸水率・外観許容欠陥（ひびわれ・欠け・形状不良）の判定基準を定める。道路工事・排水工事・宅地造成の現場で標準的に使用される製品の品質基準。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類','5. 品質（圧縮強度・吸水率）','6. 形状・寸法及びその許容差','7. 外観','8. 試験方法','9. 検査','10. 表示'] },
    { id:'JIS A 5406', cat:'A', name:'建設用セラミックタイル', desc:'建築物の内外装（床・壁・浴室・外壁等）に使用するセラミックタイルの種類（磁器質・せっ器質・陶器質）・吸水率・曲げ強度・寸法精度・耐薬品性・耐凍害性などの品質を規定。ISO 13006と整合を図り、タイルの選定・施工仕様・検査の基準として建築設計・施工管理で参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び区分','5. 品質（吸水率・破壊荷重・曲げ強度・耐薬品性）','6. 外観及び寸法','7. 試験方法','8. 検査','9. 表示','附属書A（規定）寸法の許容差'] },
    { id:'JIS A 6005', cat:'A', name:'アスファルト系防水シート', desc:'屋根・地下室外壁・テラスなどの防水工事に使用するアスファルト系防水シートの種類・厚さ・引張強さ・伸び率・耐熱性・耐寒性・耐ルーフィング貫通性を規定する。改質アスファルトシート（SBS改質・APP改質）を含む各種防水シートの性能基準として、建築防水設計・施工仕様書（公共建築工事標準仕様書等）の基礎となる。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 品質（厚さ・引張強さ・伸び・耐熱性・耐寒性）','6. 試験方法','7. 検査','8. 表示','9. 包装'] },
    // B - 一般機械
    { id:'JIS B 0001', cat:'B', name:'機械製図', desc:'機械・設備の設計図面全般に適用される製図通則。線の種類・太さ（外形線/中心線/隠れ線/破断線等）、第三角法・第一角法の投影法、尺度の選択、断面図・補助図の描き方、寸法記入法・公差記入法（普通公差記号含む）、表面粗さ記号の記入方法を包括的に規定する。日本の製造現場で最も参照される製図規格であり、ISO 128/129シリーズと整合。設計から製造・検査まで一貫した図面言語の基礎をなす。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 図面の様式（用紙・表題欄）','5. 線の種類と用途','6. 文字','7. 投影法（第三角法・第一角法）','8. 図形の表し方（断面図・補助投影図）','9. 寸法記入法','10. 公差及びはめあいの記入','11. 幾何公差の記入','12. 表面性状の記入','13. 溶接記号','附属書A（参考）記入例集'] },
    { id:'JIS B 0205', cat:'B', name:'メートル並目ねじ', desc:'一般用メートルねじ（並目ねじ）の基準山形・ピッチ・基準径（外径・有効径・谷の径）などの基本寸法をM3〜M300の範囲で規定するISO 68-1/ISO 262対応規格。ボルト・ナット・ねじ部品の設計・互換性確保の最基礎規格であり、製造業・建設業を問わずほぼすべての機械部品に関わる。細目ねじ（JIS B 0207）と組み合わせて使用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. ねじ山の基準山形','5. 基準寸法（外径・有効径・内径・ピッチ）','附属書A（規定）選択するねじのサイズ一覧'] },
    { id:'JIS B 0209', cat:'B', name:'メートル並目ねじの公差', desc:'メートル並目ねじ・細目ねじの外径・有効径・谷の径の寸法許容差と公差クラス（6g/6H等のアルファベット+数字による表記）を規定するISO 965-1対応規格。ねじのはめあいの等級（精密/中級/粗級）と公差区分を定め、締結部品の互換性・機能性を確保する。ねじ図面への公差記入方法も規定する。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. ねじの公差の表し方','5. 公差クラスの選択','6. 基本偏差（基準線からの距離）','7. 公差等級（許容差の大きさ）','8. 公差値の表','附属書A（参考）選定指針'] },
    { id:'JIS B 0401', cat:'B', name:'リニアサイズの公差及びはめあい', desc:'穴・軸のリニアサイズに対する公差クラス（IT01〜IT18）とはめあいの種類（すきまばめ・中間ばめ・しまりばめ）の基準を規定するISO 286対応規格。アルファベット記号（H7/h6・H8/f7等）によるはめあい指定方法を定め、精密機械加工における部品の互換性と組立品質を確保する。軸受・歯車・カップリング等の嵌合設計で必須の基礎規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 図面への指示方法','5. 標準公差等級（IT01〜IT18）','6. 基本偏差（A〜Z・a〜z）','7. 推奨するはめあいの組み合わせ','附属書A（規定）軸の寸法許容差の数値表','附属書B（規定）穴の寸法許容差の数値表'] },
    { id:'JIS B 1521', cat:'B', name:'深みぞ玉軸受', desc:'ラジアル荷重・アキシアル荷重の両方に対応できる最も汎用的な深溝ボールベアリングについて、寸法シリーズ（62/63/64系等）・内径・外径・幅・許容誤差・品質等級（0〜4級）を規定するISO 15対応規格。電動機・ポンプ・工作機械・家電など幅広い回転機械に使用。JIS規格化により国内外メーカー製品の互換性が確保されている。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 呼び番号の体系','5. 寸法系列及び基本寸法','6. 寸法精度及び許容差','7. 内部すきま','8. 品質等級','附属書A（規定）軸受記号の説明','附属書B（参考）寸法一覧表'] },
    { id:'JIS B 2220', cat:'B', name:'鋼製管フランジ', desc:'配管接続に使用する鋼製フランジの形式（フラットフェース・レーズドフェース・リングジョイント等）・圧力クラス（5K〜40K）・外径・ボルト穴配置・フランジ厚・材質要件を規定する。化学プラント・石油・ガス・水道・空調配管の設計で必須の規格であり、ASME B16.5（米国規格）との相違点も設計では考慮が必要。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. フランジの種類及び圧力クラス','5. 材料','6. 基本寸法（外径・ボルト穴・フランジ厚）','7. 許容差','8. 試験及び検査','9. 表示','附属書A（規定）ガスケット座の形状寸法'] },
    { id:'JIS B 8101', cat:'B', name:'ボルト及びナットの機械的性質', desc:'鋼製ボルト・ナット・植込みボルトの機械的性質（引張強さ・降伏点・破断伸び・絞り・硬さ・頭部保証荷重）を強度区分（4.6・5.8・6.8・8.8・10.9・12.9等）で規定するISO 898対応規格。締結設計における許容荷重算出・ボルト選定の基礎となり、機械設計者が最も頻繁に参照する締結部品規格の一つ。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 強度区分の表示','5. 機械的性質の要求事項（ボルト）','6. 機械的性質の要求事項（ナット）','7. 試験方法','8. 検査','9. 表示','附属書A（参考）強度区分の選択指針'] },
    // C - 電気・電子
    { id:'JIS C 0920', cat:'C', name:'電気機械器具の外郭による保護等級（IPコード）', desc:'機器の外郭（筐体）が固体異物（5mm以上の異物〜ダスト）と水（滴下〜噴流〜水中浸漬）の浸入に対してどの程度保護されているかを、IP（Ingress Protection）コードのIPXX形式で表記する方法を規定するIEC 60529対応規格。第1桁（0〜6）が固体/防塵保護等級、第2桁（0〜9K）が防水保護等級を示す。IP67（防塵・30分水中1m）・IP54（防塵・飛まつ）等、製品仕様書に記載されるIPコードの根拠規格。機器の設計・認証・選定で必須。', toc:['1. 適用範囲','2. 引用規格','3. 定義','4. 保護等級の分類と表示（IPコード）','5. 要求事項（第1桁：固体異物・じんあいに対する保護）','6. 要求事項（第2桁：水の浸入に対する保護）','7. 試験方法','附属書A（規定）IPコード表','附属書B（参考）試験装置の例'] },
    { id:'JIS C 3307', cat:'C', name:'600Vビニル絶縁電線（IV電線）', desc:'住宅・ビル・工場等の一般電気工作物の屋内配線に使用する600Vビニル絶縁電線（IV線）の導体（軟銅線）・絶縁体の構造・寸法・電気的特性（絶縁抵抗・耐電圧）・機械的特性（引張強さ・伸び）を規定する。電気工事士試験でも頻出の規格であり、住宅・ビル・工場の電気設備配線の標準材料（1.6mm・2.0mm・2.6mm等）の品質基準として電気設備工事に必須。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類','5. 構造（導体・絶縁体）','6. 材料','7. 完成品の仕様（電気的・機械的特性）','8. 試験方法','9. 検査','10. 表示','11. 包装'] },
    { id:'JIS C 4201', cat:'C', name:'配線用遮断器', desc:'分電盤・制御盤に使用する配線用遮断器（ノーヒューズブレーカ：NFB）の定格電流・遮断容量・動作特性（瞬時・時限動作の組み合わせ）・温度上昇限度・耐久性を規定するIEC 60947-2対応規格。過電流・短絡保護の中心的機器であり、電気設備設計・盤製作・設備管理の基礎規格。ACB（気中遮断器）・MCCB（配線用遮断器）・MCB（小形）の各種に対応する。', toc:['1. 適用範囲','2. 引用規格','3. 定義及び略語','4. 分類','5. 特性の表示','6. 製品情報','7. 構造及び性能の要求事項','8. 試験（型式試験・個別試験・ルーチン試験）','9. 表示','附属書A（規定）動作特性の確認方法'] },
    { id:'JIS C 6802', cat:'C', name:'レーザ製品の安全基準', desc:'レーザ製品のビーム特性（波長・パルス幅・ビーム発散角）に基づくクラス分類（1・1M・2・2M・3R・3B・4）、各クラスの最大照射可能放射（MPE）、安全要求事項（インターロック・キーロック・ビームストップ・保護ハウジング）、警告表示・ラベルの規定を定めるIEC 60825-1対応規格。製造業・医療（レーザ手術機器）・通信（光ファイバ機器）・測定（LiDAR・3Dスキャナ）で使用するレーザ機器の安全設計・CE認証・輸出に必須。', toc:['1. 適用範囲','2. 引用規格','3. 定義及び略語','4. クラス分類の概要','5. クラス分類の要件','6. 製造者への要求事項（保護手段・インターロック・表示）','7. ユーザーへの情報','附属書A（規定）レーザ放射の測定方法','附属書B（参考）クラス分類の判定フローチャート'] },
    { id:'JIS C 8105', cat:'C', name:'照明器具', desc:'蛍光灯器具・HID器具・LED照明器具など全ての照明器具に適用される安全規格。感電保護（絶縁クラス）・耐熱性（熱変形試験）・絶縁要求・耐火性・取付強度・接地要件・表示事項を規定するIEC 60598対応規格。電気用品安全法（PSE）の技術基準とも密接に関連し、国内市場流通には本規格への適合が実質的に必要。LEDドライバ・光源の安全要件も包含するシリーズ構成。', toc:['1. 適用範囲','2. 引用規格','3. 定義及び分類','4. 表示','5. 構造','6. 外部及び内部配線','7. 接地要件','8. 端子及び端子箱','9. 耐熱性及び耐火性','10. 試験（型式試験）','附属書A（規定）試験手順'] },
    { id:'JIS C 8201', cat:'C', name:'低圧開閉装置及び制御装置', desc:'AC 1000V/DC 1500V以下の低圧電気回路に使用する開閉器・断路器・電磁接触器・電磁開閉器・サーマルリレー・制御スイッチなどの構造・絶縁要求・温度上昇・短絡耐量・耐久性を規定するIEC 60947シリーズ対応規格群。工場・設備の制御盤・スターターパネル設計において必須の規格であり、各Part（2：遮断器、4-1：電磁接触器・スタータ等）に対応する。', toc:['1. 適用範囲','2. 引用規格','3. 定義及び略語','4. 分類','5. 特性の表示','6. 製品情報の要求事項','7. 通常サービス・据付・輸送の条件','8. 構造及び性能の要求事項','9. 試験（型式試験・個別試験）','10. 表示','附属書A（規定）各Partへの適用方法'] },
    { id:'JIS C 60068', cat:'C', name:'環境試験方法（電気・電子）', desc:'電子・電気部品・機器の環境適合性（信頼性）評価のための試験方法を規定するIEC 60068対応シリーズ規格。試験Ab（低温）・Ba（高温）・Ca（高温高湿定常状態）・Db（湿熱サイクル）・Ea（衝撃）・Eb（正弦波振動）・Fc（ランダム振動）・Ka（塩水噴霧）・Ma（はんだ付け性）など30以上の試験メソッドを収録する。スペース・航空・自動車・通信・産業機器の製品開発・認証・部品承認において国際的に参照される最重要環境試験規格シリーズ。', toc:['Part 1: 一般及び指針','試験Ab: 低温','試験Ba: 高温（乾熱）','試験Ca: 高温高湿（定常状態）','試験Db: 湿熱（サイクル）','試験Ea: 衝撃','試験Eb: 振動（正弦波）','試験Fc: 振動（ランダム）','試験Ka: 塩水噴霧','試験Ma: はんだ付け性','試験Na: 温度変化','Part 3-1: 試験の優先順位付けガイド'] },
    // D - 自動車
    { id:'JIS D 0023', cat:'D', name:'自動車部品の電磁両立性（EMC）', desc:'自動車用電子部品・システム（ECU・センサ・アクチュエータ等）の電磁両立性試験（EMC）について規定。伝導・放射エミッション試験とイミュニティ（EMS：ESD・バースト・サージ等）試験の試験条件・方法・限度値を定める。ISO 11452シリーズ・CISPR 25と整合。AUTOSAR・機能安全（ISO 26262）と並ぶ車載電子機器開発・型式認証プロセスで必須の試験規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 一般試験条件','5. エミッション試験（放射・伝導）','6. イミュニティ試験（ESD・バースト・サージ・放射）','7. 限度値','8. 試験報告','附属書A（参考）試験セットアップ例'] },
    { id:'JIS D 1601', cat:'D', name:'自動車部品振動試験方法', desc:'自動車および自動車部品の振動試験について、試験装置・固定方法・周波数範囲（10〜2000Hz）・振動レベル（加速度・変位）・試験時間・疲労評価方法を規定する。路面入力・エンジン振動・変速機振動に相当する耐久性評価方法を定め、部品・ユニット・組立品の品質保証試験として使用される。OEMからサプライヤへの試験仕様書作成の根拠規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験装置','5. 試験片の取付け','6. 定周波数振動試験','7. 掃引周波数振動試験','8. ランダム振動試験','9. 試験後の評価','10. 試験報告'] },
    { id:'JIS D 5301', cat:'D', name:'始動用鉛蓄電池', desc:'乗用車・トラック・二輪車のエンジン始動・補機電源用の鉛蓄電池の形式記号（34A19・95D31等）・外形寸法・5時間率容量・コールドクランキング電流（CCA：低温始動性）・充電受入性・耐振動性などの性能基準を規定するIEC 60095対応規格。バッテリー交換時の互換性確認に使用され、JAF等の緊急対応でも参照される。近年ではアイドリングストップ対応（EFB・AGM）規格も拡張されている。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 形式記号の表し方','5. 寸法及び端子形状','6. 性能（容量・CCA・充電受入性）','7. 試験方法','8. 検査','9. 表示','附属書A（参考）形式記号一覧表'] },
    { id:'JIS D 3402', cat:'D', name:'自動車用安全ガラス', desc:'乗用車・トラック・バスのフロントガラス・サイドガラス・リアガラスに使用する強化ガラス・合わせガラスの破砕性状・耐貫通性・光学的歪み・可視光透過率・耐衝撃性・耐候性の要求事項を規定するUN-R43対応規格。衝突時の乗員保護（破片による傷害防止）・視界確保の観点から保安基準と連携し、自動車型式認証・完成検査で必須の規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. ガラスの種類及び区分','5. 性能要求事項（破砕・光学・機械・耐候）','6. 試験方法','7. 検査','8. 表示','附属書A（規定）破砕パターンの判定方法'] },
    { id:'JIS D 5014', cat:'D', name:'自動車用低圧電線', desc:'自動車の各種電装部品（ライト・センサ・制御ユニット・補機）に使用する低圧電線（60V以下）の導体（銅・アルミ）・絶縁体（PVC・XLPE・エラストマー）の構造・寸法・電気抵抗・耐熱性（85°C・105°C等）・耐油性・耐燃性の要求事項を規定するISO 6722対応規格。自動車製造・部品メーカーのワイヤハーネス設計の基礎規格として活用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 構造（導体・絶縁体）','6. 材料要件','7. 電気的特性','8. 機械的特性（耐熱・耐油・耐燃）','9. 試験方法','10. 検査','11. 表示'] },
    // E - 鉄道
    { id:'JIS E 1001', cat:'E', name:'鉄道用語', desc:'鉄道に関する基本用語（軌道・車両・信号・運転・保安装置等）を日本語および対応英語で定義する。軌道（レール・まくらぎ・道床）・車両（台車・連結器・ブレーキ）・信号（閉塞・連動装置）・電力（架線・き電）等の専門用語を体系化し、鉄道工事・設計・保全の標準語彙として活用される。鉄道技術者・国土交通省の鉄道事業者との技術文書作成に必須の参照規格。', toc:['1. 適用範囲','2. 引用規格','3. 軌道に関する用語','4. 車両に関する用語','5. 信号保安に関する用語','6. 電力・き電に関する用語','7. 運転・運行に関する用語','8. 土木構造物に関する用語','附属書A 対応英語一覧'] },
    { id:'JIS E 1101', cat:'E', name:'普通レール', desc:'鉄道用普通レール（30〜60kg/m）の断面形状・寸法・重量・化学成分・機械的性質（引張強さ・硬さ）・直線度の要求事項を規定する。30N・37・40N・50N・60kg/mの各種レールの品質基準を定め、新幹線・在来線・地下鉄・路面電車等の軌道建設・保守で参照される。溶接継目・ボンド取付穴の規格も包含する。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 製造方法','6. 化学成分','7. 機械的性質（引張強さ・降伏点・伸び・硬さ）','8. 形状及び寸法','9. 外観及び直線度','10. 試験方法','11. 検査','12. 表示'] },
    { id:'JIS E 2001', cat:'E', name:'レール継目板', desc:'レールの継目部に使用する継目板（フィッシュプレート）の形状・寸法・材質・機械的性質（引張強さ・降伏点・硬さ）を規定する。普通継目板・絶縁継目板の各種類の設計基準を定め、軌道の連続性と電気絶縁（閉塞回路）の両立を図る。在来線軌道の保守・改良工事の設計で参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類','5. 材料','6. 形状及び寸法','7. 機械的性質','8. 外観','9. 試験方法','10. 検査','11. 表示'] },
    { id:'JIS E 4001', cat:'E', name:'鉄道車両通則', desc:'鉄道車両（電車・気動車・客車・貨車）の構造・強度・材料・試験に関する通則。車体強度（圧縮・衝撃）・台車（軸距・車輪踏面形状・軸重）・ブレーキ装置・乗降口・非常口の共通要求事項を規定する。車両の設計審査・製造・型式試験の基準として、鉄道事業者・車両メーカーが参照する鉄道車両設計の根幹規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 材料','5. 車体構造（強度・変形）','6. 台車（軸距・車輪形状・軸受）','7. ブレーキ装置','8. 乗降口及び非常口','9. 安全装備','10. 試験方法','附属書A（参考）試験条件の設定方法'] },
    { id:'JIS E 5004', cat:'E', name:'鉄道車両—電気試験方法通則', desc:'電気式鉄道車両の電気システム（主回路・補助電源・制御回路・保護装置）に対する耐電圧試験・絶縁抵抗測定・機能試験の共通手順を規定する。直流・交流の各き電方式対応、EMC（電磁両立性）の評価方法も規定。鉄道車両の製造・納入検査・定期検査で実施される電気試験の標準プロセスとして鉄道事業者・車両メーカーが活用する。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験の一般条件','5. 耐電圧試験','6. 絶縁抵抗測定','7. 機能試験（主回路・制御回路）','8. 保護装置動作試験','9. EMC評価','10. 試験記録及び報告'] },
    // F - 船舶
    { id:'JIS F 0001', cat:'F', name:'船用語（機関）', desc:'船舶の推進・補助機関に関する専門用語（主機関・補機・プロペラ・舵・ポンプ・コンプレッサ等）を日本語および対応英語で定義する。ディーゼル主機・ガスタービン・電気推進など各種推進システムの構成要素・操作用語を体系化し、船舶設計・建造・整備の技術文書作成の標準語彙として活用される。', toc:['1. 適用範囲','2. 主機関に関する用語','3. 補機に関する用語','4. 推進装置（プロペラ・軸系）に関する用語','5. 操舵装置に関する用語','6. ポンプ・配管に関する用語','7. 電気設備に関する用語','附属書A 対応英語一覧'] },
    { id:'JIS F 3301', cat:'F', name:'船用消防設備', desc:'船舶に搭載する消火装置（CO₂消火装置・スプリンクラー・泡消火装置・粉末消火装置）の構造・性能・設置基準・試験方法を規定する。SOLAS条約（海上人命安全条約）の技術要件と整合しており、船舶の建造・改造・検査において船舶安全法に基づく検査基準の技術的根拠として参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 固定式CO₂消火装置','5. 固定式スプリンクラー装置','6. 固定式泡消火装置','7. 固定式粉末消火装置','8. 携帯式消火器','9. 試験方法','10. 検査及び表示','附属書A（参考）設置例'] },
    { id:'JIS F 7001', cat:'F', name:'船用計器通則', desc:'船橋に搭載するコンパス・測程儀・測深儀・風速計・温度計等の船用計器の構造・材料・性能・耐振動性・耐腐食性・試験方法の共通要件を規定する。塩水噴霧・温湿度サイクル・振動試験等の海上環境適合性評価の基準も定める。海洋観測・漁業・内航・外航船舶の各種計測機器の設計・製造・検査の根拠規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 一般構造要件','5. 材料及び表面処理','6. 性能要件','7. 環境試験（塩水噴霧・温湿度・振動）','8. 電気的要件','9. 試験方法','10. 検査','11. 表示'] },
    { id:'JIS F 8001', cat:'F', name:'船用電気設備通則', desc:'船舶に搭載する電気設備（発電機・配電盤・電動機・照明・蓄電池・航海機器用電源等）の防湿・防塩・絶縁・過電流保護・接地に関する共通要求事項を規定するIEC 60092対応規格。機関室・貨物艙・甲板上等の危険場所区分に応じた電気機器の選定基準を定め、船舶の建造・改造・検査で参照される海洋電気設備の基礎規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 一般要求事項','5. 配電系統','6. 発電設備','7. 配電盤及び制御盤','8. 電動機及び制御装置','9. 照明設備','10. 危険場所の区分と機器選定','11. 接地','12. 試験及び検査'] },
    // G - 鉄鋼
    { id:'JIS G 3101', cat:'G', name:'一般構造用圧延鋼材', desc:'SS400・SS490・SS540など一般構造用途（建築・橋梁・船舶・車両・機械）の圧延鋼材（形鋼・鋼板・鋼帯・棒鋼・平鋼）の引張強さ・降伏点・伸びの機械的性質と化学成分の上限（リン・硫黄等）を規定する鉄鋼の基本規格。溶接性は保証されないため、溶接構造にはSM材（JIS G 3106）を使用する。国内最多出荷量の構造用鋼材であり、製造業・建設業の設計者が最初に参照する鋼材規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 化学成分','6. 機械的性質（引張強さ・降伏点・伸び）','7. 形状・寸法及びその許容差','8. 外観','9. 試験方法','10. 検査','11. 表示'] },
    { id:'JIS G 3106', cat:'G', name:'溶接構造用圧延鋼材', desc:'SM400・SM490・SM490Y・SM520・SM570など溶接構造用圧延鋼材の化学成分（炭素当量CEの上限・Pck防割れ指数）・機械的性質（引張強さ・降伏点・伸び・シャルピー衝撃値）・溶接性の要求事項を規定する。橋梁・建築鉄骨・圧力容器・タンク・建設機械など溶接を前提とする構造物の設計材料として使用。低温靭性要求（-5°C・-40°Cでの衝撃値保証）もあり、寒冷地向け設計でも重要。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 化学成分（炭素当量CE・Pcm含む）','6. 機械的性質（引張・衝撃）','7. 溶接性','8. 形状・寸法及びその許容差','9. 外観','10. 試験方法','11. 検査','12. 表示'] },
    { id:'JIS G 3131', cat:'G', name:'熱間圧延軟鋼板及び鋼帯', desc:'SPHC（一般用）・SPHD（絞り用）・SPHE（深絞り用高成形性）の熱間圧延鋼板・鋼帯の化学成分・機械的性質（引張強さ・伸び・硬さ）・板厚精度・表面状態（スケールあり・酸洗後）を規定する。プレス成形・曲げ・ロール成形・溶接に適した材料で、自動車部品・鋼管・缶材・農機具部品・一般機械部品に使用される。冷延鋼板（JIS G 3141）の素材でもある。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 化学成分','6. 機械的性質','7. 形状及び寸法の許容差','8. 表面状態（スケール付き・酸洗後）','9. 試験方法','10. 検査','11. 表示'] },
    { id:'JIS G 3141', cat:'G', name:'冷間圧延鋼板及び鋼帯', desc:'SPCC（一般用）・SPCD（絞り用）・SPCE（深絞り用）・SPCF（非時効深絞り用）などの冷間圧延鋼板・帯の化学成分・機械的性質・調質記号（A:焼なまし、1/4H:1/4硬質等）・板厚許容差・表面仕上げを規定する。熱延鋼板より表面が滑らかで寸法精度が高く、自動車外板・家電筐体・OA機器カバーに広く使用。亜鉛めっき鋼板（JIS G 3302）の素材でもある。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 化学成分','6. 機械的性質','7. 調質記号の表し方','8. 板厚及びその許容差','9. 表面仕上げ区分','10. 試験方法','11. 検査','12. 表示'] },
    { id:'JIS G 4051', cat:'G', name:'機械構造用炭素鋼鋼材', desc:'S10C〜S58C（数字が炭素含有量0.1〜0.58%を示す）など機械構造用炭素鋼の化学成分（C・Si・Mn・P・Sの規定範囲）・焼なまし硬さ・熱処理条件を規定する。S45Cは歯車・クランクシャフト・ボルト・キー・ピン等に最も広く使用されるグレード。焼入れ焼戻し後の機械的性質（引張強さ・降伏点・衝撃値等）も参考値として示される。機械設計者が最も頻繁に参照する鋼材規格の一つ。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号（S10C〜S58C）','5. 化学成分','6. 焼なまし硬さ','7. 形状・寸法及びその許容差','8. 外観','9. 試験方法','10. 検査','11. 表示','附属書A（参考）熱処理後の参考機械的性質'] },
    { id:'JIS G 4303', cat:'G', name:'ステンレス鋼棒', desc:'SUS304（オーステナイト系代表）・SUS316（Mo添加耐食性強化）・SUS430（フェライト系）・SUS410（マルテンサイト系）など各種ステンレス鋼棒の化学成分・機械的性質・熱処理条件を規定する。SUS304は食品機器・建築・医療器具に、SUS316は化学プラント・医療インプラント・海洋環境に使用。板（JIS G 4304/4305）・管（JIS G 3459）・線（JIS G 4308）とセットで使用される鋼種体系。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 化学成分','6. 機械的性質','7. 熱処理条件','8. 形状・寸法及びその許容差','9. 外観','10. 試験方法','11. 検査','12. 表示','附属書A（規定）鋼種の分類（オーステナイト系・フェライト系・マルテンサイト系等）'] },
    { id:'JIS G 4401', cat:'G', name:'炭素工具鋼鋼材', desc:'SK85（旧SK3）・SK95（旧SK4）・SK140（旧SK2）など炭素工具鋼の化学成分（C:0.60〜1.50%の高炭素）・硬さ・焼入れ性を規定する。ノミ・たがね・スクレーパ・ポンチ・やすり・刃物等の切削・変形工具用途に使用。焼入れでHRC60以上の高硬さを得られるが、靭性は合金工具鋼（SKS・SKD等JIS G 4404）に劣るため衝撃荷重の小さい用途向き。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 化学成分','6. 硬さ（焼なまし状態）','7. 形状・寸法及びその許容差','8. 外観','9. 試験方法','10. 検査','11. 表示'] },
    // H - 非鉄金属
    { id:'JIS H 4000', cat:'H', name:'アルミニウム及びアルミニウム合金の板及び条', desc:'1050（純Al）・3003（Al-Mn：耐食性）・5052（Al-Mg：強度・耐食性バランス）・6061（Al-Mg-Si：構造用）・7075（Al-Zn：高強度）など1000〜7000系アルミニウム合金の板・条について、化学成分・機械的性質（引張強さ・耐力・伸び）・調質記号（O=焼なまし、H12/H18=加工硬化、T4/T6=熱処理）を規定する。航空宇宙・自動車・建築・電子機器・船舶の幅広い用途に対応した国内基準材料規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 合金番号及び調質記号','5. 化学成分','6. 機械的性質（引張強さ・耐力・伸び）','7. 形状・寸法及びその許容差','8. 外観','9. 試験方法','10. 検査','11. 表示','附属書A（規定）合金番号・調質記号一覧'] },
    { id:'JIS H 4040', cat:'H', name:'アルミニウム及びアルミニウム合金の棒及び線', desc:'A2017（ジュラルミン）・A2024・A6061（最汎用）・A6063（押出成形用）・A7075（超高強度）などアルミニウム合金の押出棒・引抜棒・押出線・引抜線の化学成分・機械的性質・寸法許容差を規定する。機械部品・シャフト・構造部材・電気部品に使用される。複雑断面の押出形材は別途JIS H 4100で規定される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 合金番号及び調質記号','5. 化学成分','6. 機械的性質','7. 形状・寸法及びその許容差（押出棒・引抜棒・線）','8. 外観','9. 試験方法','10. 検査','11. 表示'] },
    { id:'JIS H 3100', cat:'H', name:'銅及び銅合金の板及び条', desc:'タフピッチ銅（C1100）・無酸素銅（C1020）・黄銅（C2680等：Zn添加）・リン青銅（C5191等：Sn+P添加）・ベリリウム銅など銅・銅合金板・条の化学成分・機械的性質（引張強さ・伸び）・調質区分（O/1/4H/H等）を規定する。電気接点・プリント基板・コネクタ・ばね材・熱交換器・硬貨等に使用。電気伝導性と加工性の組み合わせで用途が決まる材料設計の基準規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 合金番号及び調質記号','5. 化学成分','6. 機械的性質（引張強さ・伸び）','7. 電気的性質（電気伝導率）','8. 形状・寸法及びその許容差','9. 外観','10. 試験方法','11. 検査','12. 表示'] },
    { id:'JIS H 2107', cat:'H', name:'亜鉛地金', desc:'電気亜鉛・蒸留亜鉛の品位（1種：99.99%以上〜3種：98.5%以上）・化学成分（Pb・Fe・Cd等の不純物上限）・塊の形状・寸法・表面状態・刻印の要求事項を規定する。溶融亜鉛めっき（鋼材防食）・ダイカスト（自動車・電気部品）・黄銅（銅合金）原料としての品質基準として、亜鉛精錬・金属商社・製造業が参照するメタル品質規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 品位の区分（1〜3種）','5. 化学成分（不純物上限値）','6. 形状及び寸法','7. 外観','8. 試験方法','9. 検査','10. 表示及び刻印'] },
    { id:'JIS H 5302', cat:'H', name:'アルミニウム合金ダイカスト', desc:'ADC1（純Al系）・ADC3（Al-Si-Mg系）・ADC10（Al-Si-Cu系：最汎用）・ADC12（Al-Si-Cu系）等のアルミニウム合金ダイカスト用合金の化学成分と機械的性質（引張強さ・伸び・硬さ）を規定する。自動車部品（エンジンブロック・ミッションケース）・電子機器筐体・光学部品等に使用されるダイカスト部品設計・材料選定の基礎規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 合金番号の種類','5. 化学成分','6. 機械的性質（引張強さ・伸び・硬さ）','7. 試験方法','8. 検査','9. 表示','附属書A（参考）合金の特性と用途例'] },
    // K - 化学
    { id:'JIS K 6251', cat:'K', name:'加硫ゴム及び熱可塑性ゴム—引張特性', desc:'ダンベル状試験片（1〜6号形）を用いてゴム材料（加硫ゴム・熱可塑性エラストマー）の引張強さ・切断時伸び・100%/200%/300%モジュラス（定伸長応力）を測定する試験方法を規定するISO 37対応規格。試験片形状・引張速度・温度条件・計算方法を規定する。ゴム材料の品質管理・材料選定・配合開発において最も基本的な試験であり、自動車部品・ゴムシール・ホース・タイヤの品質評価に使用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験片の形状及び寸法（1〜6号形ダンベル）','5. 試験片の準備','6. 試験装置','7. 試験条件（引張速度・温度）','8. 試験方法','9. 結果の計算（引張強さ・伸び・モジュラス）','10. 精度','11. 試験報告'] },
    { id:'JIS K 6253', cat:'K', name:'加硫ゴム及び熱可塑性ゴム—硬さ', desc:'タイプAデュロメータ（軟質ゴム：0〜100 Shore A）・タイプDデュロメータ（硬質ゴム）・タイプEデュロメータ（極軟質ゴム）によるゴムの硬さ試験方法を規定するISO 7619対応規格。測定条件（温度23°C・接触時間3秒・試料厚さ6mm以上）・測定精度・校正方法を規定する。ゴム製品の品質管理・受入検査で最も頻繁に実施される試験の一つであり、配合設計・加硫条件の管理指標として活用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. デュロメータ硬さ試験機の種類（A・D・E型）','5. 試験機の構造・性能要件','6. 試験片の寸法','7. 試験条件（温度・接触時間）','8. 試験方法','9. 結果の表示','10. 精度及び校正'] },
    { id:'JIS K 7161', cat:'K', name:'プラスチック—引張特性', desc:'ダンベル形（1A・1B等）・長方形試験片を用いてプラスチック材料の引張強さ・破断伸び・引張弾性率（ヤング率）・降伏応力を測定する試験方法を規定するISO 527対応規格。試験速度・つかみ具・ひずみ測定方法（伸び計）・計算式を詳細に規定する。材料規格・製品規格でよく引用され、射出成形品・シート・フィルムの樹脂材料選定・品質確認の基礎試験として使用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験片の形状・寸法（1A・1B・2・3形）','5. 試験片の調製','6. 試験装置','7. 試験条件（試験速度・温度）','8. 試験方法','9. 計算（引張強さ・弾性率・破断伸び）','10. 精度','11. 試験報告','附属書A（参考）試験速度の選択指針'] },
    { id:'JIS K 2246', cat:'K', name:'さび止め油', desc:'金属製品・機械部品・工具・鋼材の防錆に使用する指触乾燥型・溶剤希釈型・水置換型・超薄膜型などのさび止め油の種類・防錆性能試験（塩水噴霧・湿潤・積重ね試験）・外観・蒸発残分・引火点の要求事項を規定する。製造工程内防錆・輸出包装・在庫保管の防錆処理仕様書作成の基準として機械・金属加工業で参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 品質（防錆性・外観・引火点等）','6. 試験方法（塩水噴霧・湿潤・積重ね試験）','7. 検査','8. 表示','9. 包装'] },
    { id:'JIS K 6741', cat:'K', name:'硬質ポリ塩化ビニル管', desc:'給水・排水・電線管・農業用・工業用配管に使用する硬質PVC管（VP・VU・VM等の管種）の外径・肉厚・長さ・偏心度・直線度・耐圧性能・熱間圧縮強さの要求事項を規定する。耐蝕性・軽量・低コストの特性から上下水道・農業用水・化学プラント配管に広く使用され、配管設計の基礎規格として活用される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 管の種類（VP・VU・VM等）','5. 材料','6. 外径・肉厚・長さ及びその許容差','7. 品質（耐圧・熱間圧縮強さ・落錘衝撃）','8. 外観','9. 試験方法','10. 検査','11. 表示'] },
    // L - 繊維
    { id:'JIS L 0001', cat:'L', name:'繊維製品の取扱いに関する表示記号及びその表示方法', desc:'衣類・繊維製品のケアラベルに用いる洗い方（洗濯機:30〜95°C/手洗い）・漂白（塩素系/酸素系/不可）・乾燥（タンブル乾燥温度/自然乾燥方法）・アイロン（低110°C〜高200°C）・クリーニング（ドライ/ウェット）の図記号体系を規定するISO 3758対応規格。2016年に大幅改定され41種類の記号体系に拡張。家庭用品品質表示法に基づく品質表示規制の根拠規格であり、衣料品メーカー・輸入事業者に必須知識。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 表示記号の体系','5. 洗い方に関する記号','6. 漂白に関する記号','7. 乾燥に関する記号','8. アイロン仕上げに関する記号','9. 専門家による繊維製品のクリーニングに関する記号','10. 表示の方法','附属書A（規定）記号一覧表'] },
    { id:'JIS L 1913', cat:'L', name:'一般不織布試験方法', desc:'不織布の単位面積当たり質量（g/m²）・厚さ（標準荷重下）・引張強さ・伸び（タテ・ヨコ方向）・引裂強さ・破裂強さ・通気性・吸水性・剛軟性などの試験方法を規定する。使い捨て医療用品（マスク・ガウン）・産業用フィルタ・土木用ジオテキスタイル・おむつ・衛生材料など多様な不織布製品の品質管理・規格開発の基礎として使用される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験条件の標準化','5. 単位面積当たり質量の測定','6. 厚さの測定','7. 引張強さ及び伸びの測定','8. 引裂強さの測定','9. 破裂強さの測定','10. 通気性の測定','11. 吸水性の測定','12. 剛軟性の測定','13. 試験報告'] },
    { id:'JIS L 0803', cat:'L', name:'染色堅ろう度試験用添付白布', desc:'染色堅ろう度試験において試験布に添付して汚染度を評価するための標準白布の組成・品質・前処理方法を規定する。添付白布の素材（コットン・ウール・ポリエステル・ナイロン・アクリル・シルク等の組み合わせ）を規定し、グレースケールによる汚染程度の評価と組み合わせて使用する。繊維製品の染色加工業者・品質管理担当者が参照する基礎試験用補助材料規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 添付白布の種類（単繊維・多繊維）','5. 素材の組み合わせ（コットン・ウール・ポリエステル等）','6. 品質要求事項','7. 前処理方法','8. 試験への使用方法','附属書A（参考）各繊維の染色特性'] },
    { id:'JIS L 4001', cat:'L', name:'ミシン糸の試験方法', desc:'家庭用・工業用ミシン糸（綿・ポリエステル・ナイロン等）の番手・引張強さ・伸び・結節強さ・均一性・撚り数・縫目品質を測定する試験方法を規定する。番手測定法・引張試験・縫目特性（目飛び・ループ）の評価条件を定め、縫製用糸の品質管理・仕様策定・受入検査の基準として縫製業・繊維業が参照する。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験条件（標準状態）','5. 番手の測定','6. 引張強さ・伸びの測定','7. 結節強さの測定','8. 均一性の測定','9. 撚り数の測定','10. 縫目品質（目飛び・ループ）の評価','11. 試験報告'] },
    // M - 鉱山
    { id:'JIS M 1002', cat:'M', name:'鉱山技術用語', desc:'鉱山開発・採掘・選鉱・製錬に関する基本用語（採掘方式・坑道・露天掘り・選別・浮選・製錬等）を日本語および対応英語で定義する。金属鉱山・石炭鉱山・砕石場の技術者が共通して使用する専門語彙を体系化し、設計・保安・試験報告書の作成に活用される。鉱山保安法に基づく技術基準書類との整合も図られている。', toc:['1. 適用範囲','2. 採掘・坑道に関する用語','3. 露天掘りに関する用語','4. 選鉱に関する用語','5. 製錬・冶金に関する用語','6. 保安・環境に関する用語','附属書A 対応英語一覧'] },
    { id:'JIS M 1603', cat:'M', name:'さく岩機用ドリルロッド継手', desc:'さく岩機（ロックドリル）に使用するドリルロッド・シャンクロッド・延長ロッドの継手（ねじ山・カップリングスリーブ）の寸法・ねじ形状・材質・硬さの要求事項を規定する。トンネル掘削・採石・砕石・基礎工事のさく孔作業で使用する機材の互換性を確保するための国内標準として、掘削機械メーカー・建設業者が参照する。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び記号','5. 継手のねじ形状及び寸法','6. 材料','7. 機械的性質（硬さ）','8. 外観','9. 試験方法','10. 検査','11. 表示'] },
    { id:'JIS M 8002', cat:'M', name:'鉄鉱石—サンプリング及び試料調製方法', desc:'鉄鉱石の品質評価のための代表試料の採取方法・試料調製（乾燥・破砕・縮分・分析試料化）の手順を規定するISO 3082対応規格。鉄鉱石の取引・品質保証・製鉄原料管理において公正な検査の基礎となる規格。高炉原料管理・鉱山会社と製鉄所間の取引検査で活用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. サンプリングの原則','5. サンプリング方法（機械的・手動）','6. 試料調製（乾燥・破砕・縮分）','7. 分析用試料の作製','8. 精度管理','9. 試験報告'] },
    { id:'JIS M 8010', cat:'M', name:'石炭及びコークスの工業分析', desc:'石炭・コークスの工業分析（水分・灰分・揮発分・固定炭素）の測定方法を規定するISO 17246対応規格。測定試料の前処理・加熱条件・計算式・精度管理を詳細に規定する。発電用石炭・製鉄用コークス・化学原料炭の品質評価・取引検査・燃焼効率管理において基礎的な試験方法として広く使用される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試料の前処理','5. 水分の測定','6. 灰分の測定','7. 揮発分の測定','8. 固定炭素の計算','9. 精度（再現性・再現性限界）','10. 試験報告'] },
    // P - パルプ・紙
    { id:'JIS P 0001', cat:'P', name:'紙・板紙及びパルプ用語', desc:'紙・板紙・パルプの製造・加工・試験に関する基本用語（パルプ種別・製紙プロセス・紙の物性名称・加工用語等）を定義する。クラフトパルプ・機械パルプ・化学パルプの製造工程用語、抄紙機の各部名称、コーティング・カレンダー・印刷適性の技術用語を体系化し、製紙業・印刷業・包装業の技術文書作成に活用される。', toc:['1. 適用範囲','2. パルプに関する用語','3. 製紙プロセスに関する用語','4. 紙・板紙の種類に関する用語','5. 紙の物性・品質に関する用語','6. 加工・印刷に関する用語','附属書A 対応英語一覧'] },
    { id:'JIS P 3001', cat:'P', name:'印刷用紙', desc:'オフセット印刷・デジタル印刷に使用する上質紙・中質紙・コート紙・アート紙の種類・坪量（g/m²）・白色度・不透明度・平滑度・寸法安定性の品質要件を規定する。出版・広告・商業印刷の用紙選定・印刷仕様書作成の基準として使用される。環境対応（古紙配合率）との関連でも参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び区分','5. 品質（坪量・白色度・不透明度・平滑度・寸法安定性）','6. 試験方法','7. 検査','8. 表示','附属書A（参考）印刷適性の評価方法'] },
    { id:'JIS P 8111', cat:'P', name:'紙及び板紙—調湿及び試験のための標準雰囲気', desc:'紙・板紙の各種物性試験を実施する前に必要な試験片の調湿条件（温度23±1°C・相対湿度50±2%）と試験雰囲気条件を規定するISO 187対応規格。紙の物性は水分含有量に大きく依存するため、試験の再現性・比較可能性を確保する前処理規格として製紙業の品質管理・研究開発で必須。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 標準雰囲気の条件（温度・湿度）','5. 調湿の手順','6. 試験雰囲気の維持','7. 調湿の確認方法','8. 試験報告への記載方法'] },
    { id:'JIS P 8124', cat:'P', name:'紙及び板紙—坪量の測定方法', desc:'紙・板紙の単位面積当たりの質量（坪量：g/m²）を測定する方法（試験片の切り取り・秤量・計算）を規定するISO 536対応規格。坪量は紙のグレード区分・品質管理・取引仕様の基本指標であり、測定精度・試験片枚数・計算方法・報告値の表示方法を詳細に規定する。製紙工場の原紙管理・用紙購入仕様書作成の最基礎試験法。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験片の採取及びサイズ','5. 試験前の調湿（JIS P 8111）','6. 秤量方法','7. 計算（坪量g/m²）','8. 精度（繰り返し性・再現性）','9. 試験報告'] },
    { id:'JIS P 8135', cat:'P', name:'紙及び板紙—引張強さ試験方法', desc:'紙・板紙の引張強さ（縦方向・横方向）・伸び・引張エネルギー吸収量を定速伸長型引張試験機で測定する方法を規定するISO 1924対応規格。試験片の幅・つかみ距離・引張速度・計算方法を規定する。段ボール原紙・包装用板紙・クラフト紙の強度評価・品質管理の基礎試験として製紙・包装業界で広く使用される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験片の準備（縦・横方向）','5. 試験前の調湿','6. 試験装置','7. 試験方法','8. 計算（引張強さ・伸び・TEA）','9. 精度','10. 試験報告'] },
    // Q - マネジメント
    { id:'JIS Q 9000', cat:'Q', name:'品質マネジメントシステム—基本及び用語', desc:'ISO 9000:2015対応。品質マネジメントシステム（QMS）の基本的な概念・7原則（顧客重視・リーダーシップ・人々の積極的参加・プロセスアプローチ・改善・証拠に基づく意思決定・関係性マネジメント）と関連用語（235語）を定義する。JIS Q 9001/9004を理解する前提知識として、QMS導入・運用に関わるすべての人が参照すべき基礎規格。認証の対象ではなくガイダンス規格。', toc:['1. 適用範囲','2. 品質マネジメントの基本概念','3. 品質マネジメントの7原則','4. 用語及び定義（235語）','附属書A（参考）品質マネジメントシステムの概念と用語の関係図'] },
    { id:'JIS Q 9001', cat:'Q', name:'品質マネジメントシステム—要求事項', desc:'ISO 9001:2015対応。全業種に適用できるQMSの要求事項規格。組織の状況（4条）・リーダーシップ（5条）・計画—リスクベース思考（6条）・支援（7条）・運用（8条）・パフォーマンス評価（9条）・改善（10条）のHLS（高位構造）10章構成。リスクベース思考の採用・設計開発要求の柔軟化・外部提供プロセス管理強化が2015年版の主要変更点。世界170か国・累計100万件超の認証取得数を誇る最多認証国際規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 組織の状況（内外課題・利害関係者）','5. リーダーシップ（方針・役割）','6. 計画（リスクと機会・品質目標）','7. 支援（資源・力量・文書化情報）','8. 運用（製品・サービスの提供）','9. パフォーマンス評価（内部監査・MR）','10. 改善（不適合・是正・継続的改善）','附属書A（参考）新旧規格の対応関係'] },
    { id:'JIS Q 9003', cat:'Q', name:'品質マネジメントシステム—パフォーマンス改善指針', desc:'ISO 9004:2018対応。JIS Q 9001の認証要求事項を超え、組織の長期的・持続的成功（Long-term Success）の達成に向けた指針を提供する規格。外部・内部利害関係者ニーズのバランス管理・組織文化の醸成・知識マネジメント・イノベーション促進のための自己評価ツール（成熟度モデル：基本から革新まで5段階）を含む。認証対象外であり、QMSの成熟度向上を目指す組織の改善活動に活用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 組織の状況','5. リーダーシップ及び組織の方向性','6. 利害関係者のニーズ・期待の管理','7. 運用の管理','8. パフォーマンスの評価','9. 改善・学習及びイノベーション','附属書A（参考）組織成熟度自己評価ツール'] },
    { id:'JIS Q 14001', cat:'Q', name:'環境マネジメントシステム—要求事項', desc:'ISO 14001:2015対応。環境方針策定・環境側面の特定・法的義務への対応・環境目標・運用管理・緊急事態対応・内部監査・マネジメントレビューなどPDCAサイクルに基づくEMSの要求事項を規定する。2015年版改訂でライフサイクル思考の視点・リーダーシップ要件の強化・リスクと機会の考慮が追加。製造業のサプライチェーン要件・グリーン調達基準として認証取得が求められるケースが多く、日本の取得件数は世界トップ水準。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 組織の状況','5. リーダーシップ','6. 計画（環境側面・法的義務・目標）','7. 支援','8. 運用（ライフサイクル視点含む）','9. パフォーマンス評価（内部監査・MR）','10. 改善','附属書A（参考）主な変更点の説明'] },
    { id:'JIS Q 19011', cat:'Q', name:'マネジメントシステム監査のための指針', desc:'ISO 19011:2018対応。QMS・EMS・OH&SMS・ISMS等のあらゆるマネジメントシステムの内部・外部監査の実施に関する国際指針。監査の7原則（誠実性・公平な提示・正当な職業上の注意・守秘義務・独立性・証拠に基づくアプローチ・リスクベースアプローチ）・監査プログラム管理・現場審査の実施プロセス・監査員の力量要件・評価方法を規定する。認証機関審査員・企業内部監査員の実務参考書として広く使用される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 監査の原則','5. 監査プログラムの管理','6. 監査の実施','7. 監査員の力量及び評価','附属書A（参考）各MSへの適用指針','附属書B（参考）業種別の知識要求事項'] },
    { id:'JIS Q 27001', cat:'Q', name:'情報セキュリティマネジメントシステム—要求事項', desc:'ISO/IEC 27001:2022対応。情報セキュリティ（機密性・完全性・可用性）を系統的に管理するISMS（Information Security Management System）の国際認証規格。2022年改訂で附属書Aの管理策が114項目→93項目（組織的/人的/物理的/技術的の4テーマ）に再編成され、クラウドセキュリティ・脅威インテリジェンス・データ漏洩防止等の現代的管理策が追加。金融・IT・通信・医療・官公庁での認証が実質的な取引要件となるケースが増加。国内認証取得件数7000件超（世界2位水準）。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 組織の状況','5. リーダーシップ','6. 計画（リスクアセスメント・リスク対応）','7. 支援','8. 運用','9. パフォーマンス評価','10. 改善','附属書A（規定）情報セキュリティ管理策一覧（93項目）'] },
    { id:'JIS Q 27002', cat:'Q', name:'情報セキュリティ管理策の実践のための規範', desc:'ISO/IEC 27002:2022対応。JIS Q 27001附属書Aの93管理策に対する具体的な実施指針・実施の手引き・目的・属性タグを詳述する実践規範。2022年改訂でクラウドサービス利用・構成管理・情報削除・データマスキング・フィッシング対策・脅威インテリジェンス等の11の新管理策が追加。ISMS担当者・情報セキュリティエンジニアが管理策実装の詳細を把握するための参照書として位置づけられる。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 管理策の構成と属性','5. 組織的管理策（37項目）','6. 人的管理策（8項目）','7. 物理的管理策（14項目）','8. 技術的管理策（34項目）','附属書A（参考）ISO/IEC 27001との対応表'] },
    { id:'JIS Q 31000', cat:'Q', name:'リスクマネジメント—指針', desc:'ISO 31000:2018対応。組織の種類・業種・規模を問わず適用できる汎用的なリスクマネジメントの国際指針。8原則（統合・構造化・適応・インクルーシブ・動的・利用可能な最良情報・人間と文化の考慮・継続的改善）・枠組み（リーダーシップ→計画→実施→評価→改善）・プロセス（スコープ確定→リスクアセスメント→リスク対応→モニタリング）の3要素を規定する。ISO 27005・IEC 31010等の専門規格の基礎として参照。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 原則（8原則）','5. 枠組み（リーダーシップ・計画・実施・評価・改善）','6. プロセス（コミュニケーション・コンテキスト確立・リスクアセスメント・リスク対応・モニタリング）','附属書A（参考）各プロセスの属性'] },
    { id:'JIS Q 45001', cat:'Q', name:'労働安全衛生マネジメントシステム—要求事項', desc:'ISO 45001:2018対応。旧OHSAS 18001の後継として策定された労働安全衛生マネジメントシステム（OH&SMS）の最初の国際規格。危険源の特定・OH&Sリスクのアセスメント・機会の評価・法令遵守・労働者の協議・参加の確保を要求事項の柱とする。HLS採用によりISO 9001/14001との統合運用（トリプル認証）が容易。建設・製造・物流・採掘等の高リスク産業での認証取得が増加しており、労働災害ゼロ達成の経営ツールとして活用される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 組織の状況','5. リーダーシップ及び労働者の参加','6. 計画（危険源特定・OH&Sリスク・法令）','7. 支援','8. 運用（変更管理・緊急事態準備）','9. パフォーマンス評価','10. 改善','附属書A（参考）主な変更点・OHSAS 18001との対応'] },
    // R - 窯業
    { id:'JIS R 1601', cat:'R', name:'ファインセラミックスの曲げ強さ試験方法', desc:'アルミナ・ジルコニア・窒化ケイ素・炭化ケイ素等のファインセラミックスの室温での曲げ強さを3点曲げ・4点曲げ試験で測定する方法を規定するISO 14704対応規格。試験片の形状・寸法・面取り・表面粗さ・治具・試験速度・計算式を詳細に規定する。電子部品・自動車部品・医療機器・エネルギー機器に使用するセラミックス材料の品質保証・設計データ取得の基礎試験法。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験片の形状及び寸法','5. 試験片の準備（面取り・表面粗さ管理）','6. 試験装置（3点曲げ・4点曲げ治具）','7. 試験条件（支点距離・荷重速度）','8. 試験方法','9. 計算（曲げ強さ）','10. 統計処理（ワイブル解析）','11. 試験報告'] },
    { id:'JIS R 2501', cat:'R', name:'耐火れんが及び耐火モルタルのサンプリング方法', desc:'高炉・転炉・電気炉・ガラス溶解炉等の工業炉に使用する耐火れんが・不定形耐火物・耐火モルタルの代表試料の採取方法・試料調製・試験用試料の作製方法を規定する。試料のロット構成・採取個数・試料調製手順を定め、耐火物の品質管理・購入検査の前提条件として製鉄・化学・ガラス業界で使用される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. ロットの構成','5. サンプリング方法（耐火れんが）','6. サンプリング方法（不定形耐火物・モルタル）','7. 試料の調製','8. 試験用試料の作製','9. 試料の保管及び輸送','10. 試験報告'] },
    { id:'JIS R 5210', cat:'R', name:'ポルトランドセメント', desc:'建設工事に最も広く使用される普通・早強・超早強・中庸熱・低熱・耐硫酸塩ポルトランドセメントの化学成分（SiO₂・Al₂O₃・Fe₂O₃・CaO等）・物理的性質（凝結時間・安定性・圧縮強さ）・粉末度の品質基準を規定する。コンクリート製造のベース材料規格であり、JIS A 5308（レディーミクストコンクリート）と連携して建設工事品質管理の根幹をなす。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類（普通・早強・超早強・中庸熱・低熱・耐硫酸塩）','5. 化学成分の要求事項','6. 物理的性質（凝結時間・安定性・圧縮強さ・粉末度）','7. 試験方法','8. 検査','9. 表示','附属書A（参考）クリンカー鉱物組成の説明'] },
    { id:'JIS R 6001', cat:'R', name:'研削といし用研磨材の粒度', desc:'砥石・研磨紙・研磨布に使用する研磨材（アルミナ・炭化ケイ素・ダイヤモンド等）の粒度（粒子サイズ分布）を規定するISO 8486対応規格。粗粒（#8〜#220）・微粒（#240〜#2000以上）の粒度表示と粒度分布の許容範囲を定め、研削加工・精密研磨の工具選定・品質管理の基準として機械加工・光学部品業界で参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 粒度の表示方法','5. 粗粒の粒度（#8〜#220）','6. 微粒の粒度（#240以上）','7. 粒度分布の測定方法（ふるい・沈降法）','8. 粒度分布の許容範囲','9. 検査','10. 表示'] },
    // S - 日用品
    { id:'JIS S 1101', cat:'S', name:'木製いす', desc:'住宅・オフィス・公共施設に使用する木製いすの強度・耐久性の試験方法と品質基準を規定する。座面・背もたれ・脚部・肘掛けに対する静荷重試験・衝撃試験・繰り返し荷重試験（耐久試験）の条件と合格基準を定める。消費者安全の観点から転倒・破損のリスクを最小化し、家庭用品品質表示法に基づく品質表示の根拠規格としても機能する。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験の一般条件','5. 静荷重試験（座面・背もたれ・脚部）','6. 衝撃試験（座面・背もたれ）','7. 繰り返し荷重試験（耐久性）','8. 安定性試験','9. 合格基準','10. 試験報告'] },
    { id:'JIS S 2030', cat:'S', name:'家庭用ガス燃焼機器', desc:'家庭用ガスこんろ・ガステーブル・ガスグリル・ガス炊飯器等のガス燃焼機器の構造・材料・性能（熱効率・一酸化炭素濃度・炎の安定性）・安全装置（立消え安全装置・過熱防止装置）の要求事項を規定する。液化石油ガス器具等の技術基準省令と連携し、PSLPGマーク取得に必要な認証試験の根拠規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類','5. 構造及び材料','6. 性能（熱効率・一酸化炭素濃度・炎安定性）','7. 安全装置（立消え安全装置・過熱防止装置）','8. 試験方法','9. 検査','10. 表示'] },
    { id:'JIS S 2110', cat:'S', name:'家庭用電気冷蔵庫及び冷凍庫', desc:'家庭用電気冷蔵庫・冷凍庫・冷蔵冷凍庫の性能（定格内容積・冷却能力・消費電力・騒音）・安全性（感電保護・温度上昇・異常動作時の安全）の試験方法と要求事項を規定するIEC 60335-2-24対応規格。省エネ法のエネルギー消費効率算定の根拠規格でもあり、省エネラベリング制度・トップランナー基準と密接に関連する。電気用品安全法（PSE）の技術基準として家電メーカーに必須。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 一般要求事項','5. 表示及び説明書','6. 構造','7. 性能（定格内容積・冷却能力・消費電力）','8. 安全性（感電保護・温度上昇・異常動作）','9. 騒音','10. 試験方法','附属書A（参考）エネルギー消費効率の算定方法'] },
    { id:'JIS S 3031', cat:'S', name:'家庭用電気洗濯機', desc:'全自動・二槽式・ドラム式の家庭用電気洗濯機・洗濯乾燥機の洗濯性能（洗浄率）・脱水性能・乾燥性能・省エネ性能・振動・騒音・安全性の試験方法と要求事項を規定するIEC 60456対応規格。省エネラベリング・トップランナー基準の算定根拠規格として活用される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験の一般条件','5. 洗濯性能試験（洗浄率）','6. 脱水性能試験','7. 乾燥性能試験','8. 消費電力・水消費量の測定','9. 振動・騒音試験','10. 安全性試験','11. 試験報告'] },
    { id:'JIS S 6006', cat:'S', name:'鉛筆・色鉛筆及びそれらに用いるしん', desc:'木軸鉛筆・色鉛筆・芯ホルダー用の黒鉛芯・色芯の硬度（6B〜9H）・折れ強さ・接着強度・寸法・偏心度・表示事項の規格を規定する。芯の折れ強度試験・鉛筆軸と芯の偏心測定方法を規定し、学童用・製図用・美術用の各用途向け品質基準を定める。家庭用品品質表示法の規制対象であり、輸入品含め国内市場流通製品の品質確認に参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 種類及び区分','5. 寸法及びその許容差','6. 硬度（6B〜9H）','7. 芯の折れ強さ試験','8. 接着強度試験','9. 偏心度の測定','10. 検査','11. 表示'] },
    // T - 医療
    { id:'JIS T 0601', cat:'T', name:'医用電気機器—基本安全及び基本性能に関する一般要求事項', desc:'IEC 60601-1対応。患者と電気的に接触する医用電気機器全般の感電保護（患者漏れ電流・絶縁クラス：B/BF/CF型）・機械的安全・放射線・高温等のリスクに対する基本安全要求事項と基本性能の要求事項を規定する最重要医療機器安全規格。ソフトウェアリスクマネジメント（IEC 62304）・EMC（IEC 60601-1-2）・ユーザビリティ（IEC 62366）を包含するコンプレックス規格群の頂点。EU MDR・FDA 510(k)/PMA・薬機法の承認取得において適合性確認が求められる。', toc:['1. 適用範囲','2. 引用規格','3. 定義及び略語','4. 一般要求事項','5. 試験の一般条件','6. 感電に対する保護（絶縁クラス・患者漏れ電流）','7. 機械的リスクに対する保護','8. 放射線に対する保護','9. 高温に対する保護','10. 制御・測定精度の精度','11. 異常な動作及び故障状態','12. リスクマネジメント','附属書A〜L（各リスク別規定）'] },
    { id:'JIS T 1022', cat:'T', name:'病院電気設備の安全基準', desc:'手術室・ICU・心臓カテーテル室・分娩室など医療機器が多数使用される病院電気設備の安全基準を規定する。感電事故・電気火災防止のためのIT接地方式（絶縁監視器付き）・等電位接地・手術室のゾーン分類（グループ0/1/2）の要件を規定する。IEC 60364-7-710に準拠。病院建築設計・電気設備設計の専門家が参照する規格で、新築・改修時の設備仕様書作成に使用。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 医療区域のグループ分類（グループ0・1・2）','5. IT接地方式の要件','6. 等電位接地システム','7. 絶縁監視装置','8. 非常用電源設備','9. 手術室の電気設備要件','10. 試験及び検査'] },
    { id:'JIS T 3250', cat:'T', name:'在宅医療用輸液ポンプ', desc:'在宅医療環境で使用する輸液ポンプ（シリンジポンプ・ペリスタルティックポンプ）の安全性（電気的安全・機械的安全・異常状態への対応）と性能（流量精度・累積誤差・閉塞検知圧力・空気混入検知・電池寿命・アラーム機能）の要求事項を規定する。在宅医療の普及に伴い重要性が増す機器の品質確保に特化した規格。IEC 60601-2-24と整合を図る。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 一般要求事項（電気安全・機械安全）','5. 性能要求事項（流量精度・累積誤差）','6. 閉塞検知','7. 空気混入検知','8. アラーム機能','9. 電池性能','10. 試験方法','11. 表示及び添付文書'] },
    { id:'JIS T 1021', cat:'T', name:'手術台', desc:'手術室で使用する電動油圧式・油圧式の手術台の最大荷重・チルト・トレンデレンブルグ・フレキション・ラテラルチルト等の姿勢可変範囲・位置決め精度・耐荷重・電気安全（IEC 60601-1準拠）・操作性の要求事項を規定する。術中の患者体位確保と外科医の作業性向上のための機能要件を定め、医療機器承認・薬機法対応で参照される規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 一般要求事項','5. 機械的要求事項（荷重・姿勢可変範囲）','6. 位置決め精度','7. 電気的安全（IEC 60601-1準拠）','8. 操作性','9. 試験方法','10. 表示及び添付文書'] },
    { id:'JIS T 6001', cat:'T', name:'歯科用合金', desc:'歯科補綴物（クラウン・インレー・ブリッジ・義歯床）の製造に使用する金合金・銀合金・コバルト-クロム合金・ニッケル-クロム合金・チタン合金の化学成分・機械的性質（引張強さ・耐力・伸び・硬さ）・生体適合性の要求事項を規定するISO 22674対応規格。歯科材料の安全性・耐食性・加工適性の確保を目的とし、歯科技工士・歯科医師の材料選択・品質確認で参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 合金の分類（タイプ1〜5）','5. 化学成分の要求事項','6. 機械的性質（引張強さ・耐力・伸び・硬さ）','7. 耐食性','8. 生体適合性','9. 試験方法','10. 検査','11. 表示及び添付文書'] },
    // W - 航空
    { id:'JIS W 0001', cat:'W', name:'航空宇宙—用語', desc:'航空機・宇宙機・ロケット・エンジン・推進装置・構造・材料・システム・試験に関する基本用語を日本語と対応英語で定義する。固定翼機・回転翼機・推進系（ターボジェット・ターボファン）・降着装置・飛行制御系等の航空機システムの構成要素と性能特性に関する専門用語を体系化し、設計・製造・整備・認証文書の標準語彙として活用される。', toc:['1. 適用範囲','2. 機体構造に関する用語','3. 推進系に関する用語','4. 降着装置に関する用語','5. 飛行制御系に関する用語','6. 航法・誘導系に関する用語','7. 宇宙機・ロケットに関する用語','附属書A 対応英語一覧'] },
    { id:'JIS W 1001', cat:'W', name:'航空用語', desc:'航空交通管制・航空気象・航法・運航・空港に関する用語を定義する。VFR（有視界飛行）・IFR（計器飛行）・ATIS（自動情報放送）・METARなどの運航管理用語、ILS・VOR・DMEなどの航法システム用語を規定する。航空法に基づく技術基準との整合を図り、航空事業者・管制機関の業務文書で参照される。', toc:['1. 適用範囲','2. 運航・飛行に関する用語','3. 航空交通管制に関する用語','4. 航法システムに関する用語（VOR・ILS・DME等）','5. 航空気象に関する用語','6. 空港・飛行場に関する用語','附属書A 対応英語（ICAO用語）一覧'] },
    { id:'JIS W 7001', cat:'W', name:'航空機の地上支援機器—要求事項', desc:'地上走行車・パワーユニット・タイヤ交換装置・エンジンスタンド・ランプバス・貨物ローダー等の航空機地上支援機器（GSE：Ground Support Equipment）の安全・性能・電気・機械・試験の共通要求事項を規定する。空港エプロン作業の安全確保・機器の信頼性向上・航空機への損傷防止を目的とし、空港当局・航空会社のGSE調達仕様書の技術基準として参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 一般安全要求事項','5. 機械的要求事項','6. 電気的要求事項','7. 航空機接触防止要件','8. 試験方法','9. 検査','10. 表示及び識別','附属書A（参考）GSE種別ごとの追加要件'] },
    { id:'JIS W 2001', cat:'W', name:'航空宇宙用材料試験方法—金属', desc:'航空機構造・エンジン部品に使用するアルミニウム合金・チタン合金・ニッケル基超合金・高張力鋼等の引張試験・疲労試験・破壊靱性試験・クリープ試験の試験方法・試験条件・結果報告の要求事項を規定する。航空宇宙用材料の設計許容値データ取得・品質保証試験の根拠として、MIL規格やASTM規格との整合を図りながら国内航空機産業で参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験の一般条件','5. 引張試験','6. 疲労試験（S-N曲線取得）','7. 破壊靱性試験（KIC・FCGR）','8. クリープ試験','9. 試験片の作製及び管理','10. 試験報告（設計許容値データ）'] },
    // X - 情報処理
    { id:'JIS X 0001', cat:'X', name:'情報処理用語—基本用語', desc:'コンピュータ・情報処理分野の基本用語（データ・プログラム・アルゴリズム・ネットワーク・データベース・AI等）を日本語で定義するISO/IEC 2382対応規格。規格・仕様書・マニュアル・教科書の用語統一の基準として機能する。国際的な語義との整合を保ちながら日本語訳語を規定し、誤訳・曖昧表現を防ぐ参照標準として情報処理技術者試験でも出題対象となる。', toc:['1. 適用範囲','2. 基本概念に関する用語','3. データ・処理に関する用語','4. プログラム・ソフトウェアに関する用語','5. コンピュータ構成に関する用語','6. ネットワーク・通信に関する用語','附属書A 対応英語一覧'] },
    { id:'JIS X 0208', cat:'X', name:'情報交換用漢字符号集合', desc:'漢字・ひらがな・カタカナ・英数字・記号・特殊文字を収録した2バイト（JIS 7ビット）の文字符号集合を規定する日本語情報処理の基礎規格。第1水準2965字・第2水準3390字の合計6355字を収録（追補版で6879字に拡張）。Shift-JIS・EUC-JPなどの日本語エンコーディング体系の基盤となった歴史的規格。現在はUnicode（UTF-8/UTF-16）への移行が進んでいるが、レガシーシステムの文字化け対応で参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 符号集合の構成','5. 図形文字の分類（第1水準・第2水準）','6. 符号位置の割当て','附属書A（規定）文字表','附属書B（参考）符号化方式（Shift-JIS・EUC-JP）'] },
    { id:'JIS X 0213', cat:'X', name:'4バイト符号化拡張漢字集合', desc:'JIS X 0208の拡張版として、第3水準1249字・第4水準2436字（旧漢字・人名用漢字・方言文字・地名漢字等）を追加した4バイト符号化文字集合規格。約11000字の漢字を収録し、人名・地名等の難字・稀用字をカバーする。Shift_JIS-2004・EUC-JIS-2004・UTF-8で実装可能。現代の多言語・グローバル対応システムではUnicodeが基準となるが、行政・金融システムの既存文字セット管理で参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 文字集合の構成（第1〜4水準）','5. 符号位置の割当て','6. JIS X 0208との対応','附属書A（規定）拡張漢字表','附属書B（参考）Unicode対応表'] },
    { id:'JIS X 0301', cat:'X', name:'日付及び時刻の表示', desc:'ISO 8601:2019対応。日付（YYYY-MM-DD）・時刻（hh:mm:ss）・タイムゾーン（+09:00/Z）・日時の組み合わせ（YYYY-MM-DDThh:mm:ss±hh:mm）・期間（P1Y2M3DT4H5M6S）・時間間隔・繰り返し時間間隔の表記形式を規定する。情報システム・データベース・API・ファイル名・ログ記録でほぼすべての国際システムに採用される日時表記の国際標準。W3C・IETF RFC 3339・ISO 9075（SQL日時型）などの技術標準の基礎。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 日付の表記','5. 時刻の表記','6. タイムゾーンの表記','7. 日時の組み合わせ表記','8. 期間の表記','9. 時間間隔の表記','10. 繰り返し時間間隔の表記'] },
    { id:'JIS X 3010', cat:'X', name:'プログラム言語C', desc:'ISO/IEC 9899（C17/C23）対応。C言語の構文・型システム・演算子・制御構造・前処理器（マクロ/インクルード）・標準ライブラリ（stdio/stdlib/string/math/time等）を規定する。組み込みシステム・OS・コンパイラ・デバイスドライバ・システムプログラミングで基幹言語として使用。ポータビリティと実行効率の両立から50年以上現役の言語規格。MISRA-C（車載組み込みコーディング規則）等もJIS X 3010を参照する。', toc:['1. 適用範囲','2. 引用規格','3. 用語・定義・記法','4. 環境（翻訳環境・実行環境）','5. 言語（構文・セマンティクス）','6. 型システム・宣言・式','7. 文及び制御フロー','8. 前処理器（マクロ・インクルード）','9. 標準ライブラリ（stdio・stdlib・string・math等）','附属書A〜J（処理系定義動作・未定義動作等）'] },
    { id:'JIS X 3014', cat:'X', name:'プログラム言語C++', desc:'ISO/IEC 14882（C++23）対応。オブジェクト指向・テンプレートメタプログラミング・ラムダ式・ムーブセマンティクス・コンセプト・モジュール等の現代的機能を持つC++言語の構文・標準ライブラリ（STL：vector/map/algorithm等）を規定する。ゲームエンジン・金融システム・医療機器・自動車ECU・組み込みから汎用アプリケーションまで幅広い分野で使用されるシステムプログラミング言語の国際規格。C++11以降の現代的C++が主流。', toc:['1. 適用範囲','2. 引用規格','3. 用語・定義・記法','4. 一般原則','5. 字句変換','6. 基本概念（型・スコープ・記憶域）','7. 式','8. 文','9. 宣言','10. クラス・継承','11. テンプレート','12. 例外処理','13. 標準ライブラリ（コンテナ・アルゴリズム等）','附属書A〜D（非規範的附属書）'] },
    { id:'JIS X 4051', cat:'X', name:'日本語文書の組版方法', desc:'日本語テキスト（縦組み・横組み）のレイアウト規則を規定する。禁則処理（句読点・括弧の行頭/行末禁則・追い出し/追い込み）・ルビの配置（親文字との関係・ルビの位置）・約物（句読点・括弧類）の間隔処理・和文と欧文の混植ルール・行間・字間・文字ぶら下がりの処理などを詳細に定める。W3C「日本語組版処理の要件（JLREQ）」の原典でもあり、Webブラウザ・DTPソフト・電子書籍（EPUB）のレンダリングエンジンの実装基準として参照される。', toc:['1. 適用範囲','2. 用語及び定義','3. 日本語の組版の基本（縦組み・横組み）','4. 文字クラスの分類','5. 行頭・行末禁則処理','6. 約物の間隔処理','7. 和欧文間のスペース','8. ルビの配置','9. 行間・字間の設定','10. 特殊な組版処理（傍点・割注等）','附属書A（規定）文字クラス分類表'] },
    { id:'JIS X 5321', cat:'X', name:'開放型システム間相互接続—基本参照モデル（OSI 7層）', desc:'ISO/IEC 7498対応。開放型システム間相互接続（OSI）の7層参照モデル（物理層→データリンク層→ネットワーク層→トランスポート層→セッション層→プレゼンテーション層→アプリケーション層）の各層の機能・サービス・インタフェースを規定する。実際のプロトコル（TCP/IP 4層）とは異なるが、ネットワーク技術教育・プロトコル設計・障害切り分けの共通フレームワークとして世界的に使用される概念モデル規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. OSI参照モデルのアーキテクチャ','5. 物理層（第1層）','6. データリンク層（第2層）','7. ネットワーク層（第3層）','8. トランスポート層（第4層）','9. セッション層（第5層）','10. プレゼンテーション層（第6層）','11. アプリケーション層（第7層）'] },
    { id:'JIS X 9150', cat:'X', name:'電子データ交換（EDI）', desc:'企業間電子商取引（B2B EDI）における受発注・出荷通知・請求・支払情報などのビジネスドキュメントの標準メッセージ形式・構文規則（UN/EDIFACT準拠）・通信プロトコルを規定する。流通BMS（流通業界標準）・ZEDI（全銀EDI）の基礎となる国内EDI標準。製造業・流通業のサプライチェーン電子化・ERP間データ連携の仕様書作成の基準として参照される。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. EDIの基本概念','5. メッセージ形式及び構文規則（UN/EDIFACT）','6. セグメント・データ要素','7. 通信手順','8. セキュリティ要件','附属書A（参考）メッセージの記述例'] },
    { id:'JIS X 25010', cat:'X', name:'システム及びソフトウェア品質モデル', desc:'ISO/IEC 25010:2023対応。システム・ソフトウェアの品質を機能適合性・性能効率性・互換性・使用性・信頼性・セキュリティ・保守性・移植性の8特性・31副特性のモデルで体系化するSQuaRE（Software Quality Requirements and Evaluation）シリーズの中心規格。ソフトウェア調達RFP作成・品質要件定義・テスト設計・ベンダー評価の枠組みとして活用。2023年改訂ではAI・機械学習システムへの適用も考慮されている。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. システム・ソフトウェア製品品質モデル（8特性）','5. 利用時の品質モデル（5特性）','6. 品質特性及び副特性の定義','附属書A（参考）品質モデルの適用方法','附属書B（参考）SQuaREシリーズとの関係'] },
    // Z - その他
    { id:'JIS Z 0200', cat:'Z', name:'包装方法通則', desc:'工業製品全般の包装設計における包装方法・材料選択・強度設計の通則を規定する。輸送モード（道路・鉄道・海上・航空）別の衝撃・振動・気圧変化・温湿度変動への対応、積み上げ強度、防湿・防錆設計の考え方・試験方法を示す。輸出梱包仕様書作成・包装設計審査・包装材のコスト最適化の基準として製造業・物流業で参照される。ISTA（国際輸送安全協会）試験との関連でも重要。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 包装の目的と要件','5. 輸送環境の分類（道路・鉄道・海上・航空）','6. 包装材料の選択','7. 包装強度設計（圧縮・衝撃・振動）','8. 防湿・防錆設計','9. 表示','附属書A（参考）輸送試験方法'] },
    { id:'JIS Z 0237', cat:'Z', name:'粘着テープ・粘着シートの試験方法', desc:'クラフトテープ・セロハンテープ・布粘着テープ・ポリエステルテープ・両面テープ等の粘着テープ・シートについて、180°引きはがし粘着力・90°引きはがし粘着力・保持力（せん断保持力）・初期タック（ボールタック法・プローブタック法）・引張強さ・伸び・耐熱性（高温保持力）・耐寒性などの試験方法を規定する。粘着製品の品質管理・規格設定・材料比較・製品開発の標準試験として製造メーカー・ユーザー双方が参照。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 試験の標準条件','5. 180°引きはがし粘着力試験','6. 90°引きはがし粘着力試験','7. 保持力（せん断保持力）試験','8. 初期タック試験（ボールタック法・プローブタック法）','9. 引張強さ・伸び試験','10. 耐熱性（高温保持力）試験','11. 試験報告'] },
    { id:'JIS Z 8301', cat:'Z', name:'規格票の様式及び作成方法', desc:'JIS規格文書の様式・記載事項の構成・用語の使い方・条項番号付け・表や図の記載方法を規定するJISのメタ規格。規格文書の構造（適用範囲→引用規格→用語→本文要求事項→附属書等）の標準フォーマットを定め、ISO/IEC Directives（国際規格作成指針）と整合。JIS原案作成委員会のメンバー・規格調査会事務局担当者が規格文書を作成・審議する際の必携規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 規格票の様式（用紙・余白・フォント）','5. 規格票の構成（前付け・本体・後付け）','6. 条・項・目の番号付け','7. 要求事項の記述（shall/should/may）','8. 表及び図の記載方法','9. 附属書の種類（規定・参考）','附属書A（参考）記述例集'] },
    { id:'JIS Z 8401', cat:'Z', name:'数値の丸め方', desc:'計算結果・測定値・規格値の比較において、指定した桁数に数値を丸める方法（JIS丸め：四捨五入＝切り捨て後+0.5の方式）と計算結果の有効数字処理の規則を規定するISO 80000-1対応規格。試験データの報告・仕様値の合否判定・計測値の記録における数値処理の統一手順。コンピュータの浮動小数点数丸め（IEEE 754の偶数丸め）との違いを把握する上でも重要。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 数値の丸め方の原則','5. 切り捨て','6. 切り上げ','7. 四捨五入（JIS丸め）','8. 有効数字の扱い','附属書A（参考）各丸め方式の比較表'] },
    { id:'JIS Z 9001', cat:'Z', name:'抜取検査通則', desc:'統計的品質管理における抜取検査（サンプリング）の基本概念（AQL・LTPD・生産者危険α・消費者危険β・OC曲線）・各種サンプリング方式（JIS Z 9015シリーズのAQL式計数抜取検査・JIS Z 9011のLQ計数方式等）の原則と選択方法を規定する通則。受入検査・出荷検査の設計において、品質水準（AQL）・サンプルサイズ・合格判定数の設定根拠として品質管理担当者が参照する基礎規格。', toc:['1. 適用範囲','2. 引用規格','3. 用語及び定義','4. 抜取検査の基本概念（AQL・LTPD・OC曲線）','5. 抜取方式の種類','6. 検査水準及びサンプルサイズ','7. 合格判定基準','8. 抜取方式の選択方法','附属書A（参考）OC曲線の読み方','附属書B（参考）JIS Z 9015シリーズとの対応'] },
  ],
  iso: [
    { id:'ISO 9001:2015',       cat:'品質',        name:'品質マネジメントシステム—要求事項', desc:'全業種に適用できるQMSの要求事項規格。組織の状況・リーダーシップ・計画（リスクベース思考）・支援・運用・パフォーマンス評価・改善のHLS（高位構造）10章構成。2015年版ではリスクベース思考の採用・外部提供プロセス管理の強化・設計開発要求の柔軟化が主要変更点。世界170か国以上で累計100万件超の認証取得数を誇る最多認証国際規格。製造業・サービス業・IT・医療・官公庁等広範な分野で採用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning','7. Support','8. Operation','9. Performance evaluation','10. Improvement','Annex A: Clarification of new structure'] },
    { id:'ISO 9000:2015',       cat:'品質',        name:'品質マネジメントシステム—基本及び用語', desc:'QMS規格群（ISO 9001/9004等）の基礎となる基本概念・原則・用語（235語）の定義を提供する。顧客重視・リーダーシップ・人々の積極的参加・プロセスアプローチ・改善・証拠に基づく意思決定・関係性マネジメントの品質マネジメント7原則を明示。ISO 9001の取得・運用に関わる全員が参照すべき前提規格であり、認証の対象外（ガイダンス規格）。', toc:['1. Scope','2. Fundamental concepts and quality management principles','3. Terms and definitions (235 terms)','Annex A: Concept relationships'] },
    { id:'ISO 9004:2018',       cat:'品質',        name:'組織の品質—持続的成功のための指針', desc:'ISO 9001の認証要求事項を超え、組織の長期的・持続的成功の達成に向けた指針を提供するガイダンス規格。外内の利害関係者ニーズのバランス管理・組織文化の醸成・知識マネジメント・イノベーション促進のための成熟度自己評価ツール（基本〜革新の5段階モデル）を含む。認証対象外であり、QMSの成熟度向上を目指す組織の改善活動に活用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership and direction','6. Managing stakeholders','7. Operations','8. Performance evaluation','9. Improvement, learning and innovation','Annex A: Self-assessment tool'] },
    { id:'ISO 19011:2018',      cat:'品質',        name:'マネジメントシステム監査のための指針', desc:'QMS・EMS・OH&SMS・ISMS等のあらゆるマネジメントシステムの内部・外部監査の実施に関する国際指針。監査の7原則（誠実性・公平な提示・守秘義務・独立性・証拠に基づくアプローチ・リスクベースアプローチ等）・監査プログラム管理・現場審査の実施プロセス・監査員の力量要件・評価方法を規定する。認証機関審査員・企業内部監査員の実務参考書として広く使用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Principles of auditing','5. Managing an audit programme','6. Conducting an audit','7. Competence and evaluation of auditors','Annex A: Additional audit guidance per discipline'] },
    { id:'ISO 14001:2015',      cat:'環境',        name:'環境マネジメントシステム—要求事項', desc:'環境方針策定・環境側面の特定・法的義務への対応・環境目標・運用管理・緊急事態対応・内部監査・マネジメントレビューなどPDCAサイクルに基づくEMSの要求事項を規定する。2015年版改訂でライフサイクル思考の視点・リーダーシップ要件の強化・リスクと機会の考慮が追加。製造業のサプライチェーン要件・グリーン調達基準として認証取得が求められるケースが多く、日本の取得件数は世界トップ水準を維持している。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning (environmental aspects, compliance obligations)','7. Support','8. Operation (lifecycle perspective)','9. Performance evaluation','10. Improvement','Annex A: Guidance on use'] },
    { id:'ISO 14040:2006',      cat:'環境',        name:'環境マネジメント—ライフサイクルアセスメント', desc:'製品・サービス・プロセスのライフサイクル全体（原料採取→製造→輸送→使用→廃棄・リサイクル）を通じた環境負荷（エネルギー・CO₂・水資源消費等）を定量的に評価するLCA（ライフサイクルアセスメント）の原則・枠組みを規定する。LCAの4フェーズ（目的・スコープ定義→インベントリ分析→影響評価→解釈）を定義。ISO 14044（要件・指針）と合わせて、製品の環境設計・エコラベル・脱炭素戦略の科学的根拠として活用。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. LCA framework overview','5. Goal and scope definition','6. Life cycle inventory analysis (LCI)','7. Life cycle impact assessment (LCIA)','8. Life cycle interpretation','9. Reporting and critical review','Annex A: Background information'] },
    { id:'ISO 14064:2018',      cat:'環境',        name:'温室効果ガス（GHG）の定量化及び報告', desc:'企業・政府機関等の組織（Part 1）とプロジェクト（Part 2）レベルでのGHG（CO₂・CH₄・N₂O・HFCs・PFCs・SF₆・NF₃）排出量の定量化・モニタリング・報告・第三者検証（Part 3）の方法を規定する3部構成シリーズ規格。カーボンニュートラル宣言・GHG排出量の第三者検証・環境省温対法報告の基礎として活用される。Scope 1/2/3の排出区分の整理にも参照される。', toc:['Part 1: 組織レベルのGHG排出量算定','1. Scope','2. Normative references','3. Terms and definitions','4. GHG inventory design','5. Quantifying GHG emissions','6. GHG inventory quality management','7. Reporting and documentation','Annex A: Guidance on Scope 1/2/3'] },
    { id:'ISO 45001:2018',      cat:'安全衛生',    name:'労働安全衛生マネジメントシステム—要求事項', desc:'旧OHSAS 18001（英国規格）の後継として2018年に発行されたOH&SMSの最初の国際規格。危険源の特定・OH&Sリスクのアセスメント・機会の評価・法令遵守・労働者の協議・参加の確保が要求事項の柱。HLS（高位構造）採用によりISO 9001/14001との統合運用（トリプル認証）が容易。建設・製造・物流・採掘等の高リスク産業での認証取得が増加しており、労働災害ゼロ達成の経営ツールとして活用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership and worker participation','6. Planning (hazard identification, OH&S risks)','7. Support','8. Operation (change management, emergency preparedness)','9. Performance evaluation','10. Improvement','Annex A: Guidance'] },
    { id:'ISO/IEC 27001:2022',  cat:'セキュリティ', name:'情報セキュリティマネジメントシステム—要求事項', desc:'情報セキュリティ（機密性・完全性・可用性）を系統的に管理するISMSの国際認証規格。2022年改訂で附属書Aの管理策が114項目→93項目（組織的/人的/物理的/技術的の4テーマ）に再編成され、クラウドセキュリティ・脅威インテリジェンス・データ漏洩防止・構成管理等の現代的管理策が追加。金融・IT・通信・医療・官公庁での認証が取引要件となるケースが増加。JTC 1/SC 27が担当する国際共同規格。世界認証取得件数7万件超。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning','7. Support','8. Operation','9. Performance evaluation','10. Improvement','Annex A: Information security controls (93 controls)'] },
    { id:'ISO/IEC 27002:2022',  cat:'セキュリティ', name:'情報セキュリティ管理策', desc:'ISO/IEC 27001附属書Aの93管理策に対する具体的な実施指針・実施の手引き・目的・属性タグを詳述する実践規範。2022年改訂でクラウドサービス利用・構成管理・情報削除・データマスキング・フィッシング対策・脅威インテリジェンス等11の新管理策が追加。ISMS担当者・情報セキュリティエンジニアが管理策実装の詳細を把握するための解説書として日常的に参照される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Structure of this document','5. Organizational controls (37)','6. People controls (8)','7. Physical controls (14)','8. Technological controls (34)','Annex A: Mapping to ISO/IEC 27001'] },
    { id:'ISO/IEC 27005:2022',  cat:'セキュリティ', name:'情報セキュリティリスクマネジメント', desc:'ISO/IEC 27001が要求する情報セキュリティリスクマネジメントの具体的プロセス（コンテキスト確立→リスク特定→リスク分析→リスク評価→リスク対応→リスク受容→リスクコミュニケーション→リスクモニタリング）の手順と技法を規定するガイダンス規格。ISRM担当者がISMS構築・運用の実務参考書として活用する。ISO 31000（汎用リスク管理）との整合を図るシリーズ規格。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Information security risk management overview','5. Information security risk assessment','6. Information security risk treatment','7. Operation','8. Leveraging related ISMS processes','Annex A: Examples of techniques for risk assessment'] },
    { id:'ISO/IEC 27017:2015',  cat:'セキュリティ', name:'クラウドサービスの情報セキュリティ管理策', desc:'クラウドサービス提供者（CSP）と利用者（CSC）の双方向に適用される情報セキュリティ管理策の実施指針。ISO/IEC 27002の管理策をクラウド環境向けに解釈・拡張し、仮想化セキュリティ・管理インタフェースの保護・クラウドサービスの終了管理・利用者データの分離などクラウド固有の管理策を追加提示する。CSP/CSCのセキュリティ責任分界点の明確化にも貢献。クラウド利用時のリスク管理に必須の指針。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Cloud sector-specific concepts','5. Information security controls (cloud-specific guidance)','6. Cloud computing-specific controls (CSP/CSC)','Annex A: Cloud service customer/provider responsibility mapping'] },
    { id:'ISO 50001:2018',      cat:'エネルギー',  name:'エネルギーマネジメントシステム—要求事項', desc:'エネルギー使用状況の把握（エネルギーレビュー）・エネルギーベースラインの設定・エネルギーパフォーマンス指標（EnPI）の管理・省エネ目標・改善計画・測定・レビューのPDCAサイクルに基づくEnMS（エネルギーマネジメントシステム）の国際規格。HLS採用によりISO 9001/14001との統合が容易。製造業のカーボンニュートラル目標・エネルギーの合理化等に関する法律（省エネ法）対応の経営ツールとして活用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning (energy review, baseline, EnPIs)','7. Support','8. Operation','9. Performance evaluation','10. Improvement','Annex A: Guidance on use'] },
    { id:'ISO 22000:2018',      cat:'食品',        name:'食品安全マネジメントシステム—要求事項', desc:'HACCPの7原則（危害要因分析・CCP設定・管理基準設定・モニタリング・是正措置・検証・文書化）とISO 9001型のマネジメントシステム要求事項を統合した食品安全マネジメントシステム（FSMS）の国際規格。農場から食卓まで（Farm to Fork）のフードチェーン全体に適用可能で、CODEX衛生管理規範と整合。FSSC 22000（民間規格）のベース規格であり、食品メーカー・加工業者・外食産業での認証取得が増加している。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning','7. Support','8. Operation (hazard analysis, HACCP, PRPs)','9. Performance evaluation','10. Improvement','Annex A: Cross-reference to Codex HACCP'] },
    { id:'ISO 22301:2019',      cat:'事業継続',    name:'事業継続マネジメントシステム—要求事項', desc:'大規模自然災害・サイバー攻撃・パンデミック・システム障害等の混乱事象が発生した際に、組織の重要業務を継続・早期回復するためのBCMS（事業継続マネジメントシステム）の要求事項規格。事業影響分析（BIA）・リスクアセスメント・事業継続戦略の策定・BCP（事業継続計画）の策定・演習・改善サイクルを規定。HLS採用でISO 9001と統合運用可能。金融・通信・IT・エネルギー等のインフラ企業で認証取得が増加。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning','7. Support','8. Operation (BIA, risk assessment, business continuity strategies, BCP)','9. Performance evaluation','10. Improvement','Annex A: Guidance on BCM concepts'] },
    { id:'ISO 13485:2016',      cat:'医療機器',    name:'医療機器の品質マネジメントシステム—要求事項', desc:'医療機器の設計・開発・製造・設置・保守サービスを提供する組織のためのQMS要求事項。ISO 9001をベースとしつつ、リスクマネジメント（ISO 14971）・法規制要求事項への適合・無菌性確保・特殊工程の妥当性確認・市販後のサーベイランスなど医療機器固有の要件を強化する。EU MDR（医療機器規制）・FDA 510(k)/PMA・薬機法の製造販売承認取得において実質的な認証要件となっており、医療機器メーカー・OEM製造業者に広く普及している。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Quality management system','5. Management responsibility','6. Resource management','7. Product realization (design, production, sterility validation)','8. Measurement, analysis and improvement','Annex A: Correspondence to ISO 9001'] },
    { id:'ISO 26000:2010',      cat:'CSR',         name:'社会的責任に関する手引', desc:'企業・政府機関・NPO等あらゆる組織が社会的責任（SR）を果たすための行動原則・7つの主要課題（組織統治・人権・労働慣行・環境・公正な事業慣行・消費者課題・コミュニティへの参画・発展）を解説するガイダンス規格。認証規格ではなく任意の手引きだが、SDGsターゲットとの対応関係・ESG投資基準との関連性からCSR報告書の国際基準として参照される。GRI・国連グローバルコンパクトとの整合も図られている。', toc:['1. Scope','2. Terms and definitions','3. Understanding social responsibility','4. Principles of social responsibility','5. Recognizing SR and stakeholder engagement','6. Guidance on core subjects (7 subjects)','7. Guidance on integrating SR throughout an organization','Annex A: SDGs correspondence table'] },
    { id:'ISO 37001:2016',      cat:'CSR',         name:'贈収賄防止マネジメントシステム', desc:'組織における贈収賄リスクを管理・低減するためのABMS（贈収賄防止マネジメントシステム）の要求事項規格。経営トップのコミットメント・贈収賄リスクアセスメント・デュー・ダイリジェンス（取引先調査）・統制措置（承認手続き・ギフトポリシー）・内部通報（ホットライン）・監査を体系化する。FCPA（米国海外腐敗行為防止法）・英国贈収賄防止法への対応ツールとして多国籍企業・官民連携事業で認証取得が増加している。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning (bribery risk assessment)','7. Support','8. Operation (due diligence, gifts policy, reporting)','9. Performance evaluation','10. Improvement','Annex A: Guidance'] },
    { id:'ISO 55001:2014',      cat:'アセット',    name:'アセットマネジメントシステム—要求事項', desc:'道路・橋梁・設備・インフラ・機械等の物理的・非物理的資産（アセット）を組織目標達成のために最適管理するAMS（アセットマネジメントシステム）の要求事項規格。アセットの価値最大化・コストと便益のバランス・リスク管理・アセットライフサイクル全体（取得→運用→保守→更新→廃棄）の最適化を規定する。英国PAS 55をベースに国際規格化。社会インフラ管理（自治体・水道・電力・鉄道）・製造業の設備保全に活用。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning','7. Support','8. Operation (asset lifecycle management)','9. Performance evaluation','10. Improvement','Annex A: Attributes of good asset management'] },
    { id:'ISO 31000:2018',      cat:'リスク',      name:'リスクマネジメント—指針', desc:'組織の種類・業種・規模を問わず適用できる汎用的なリスクマネジメントの国際指針。8原則（統合・構造化・適応・インクルーシブ・動的・利用可能な最良情報・人間と文化の考慮・継続的改善）・枠組み（リーダーシップ→計画→実施→評価→改善）・プロセス（スコープ確定→リスクアセスメント→リスク対応→モニタリング→記録化）の3要素を規定する。認証対象外のガイダンスだが、ISO 27005・IEC 31010・ISO 14971等の専門リスク規格の基礎として広く参照される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Principles (8 principles)','5. Framework (leadership, planning, implementation, evaluation, improvement)','6. Process (scope, risk assessment, risk treatment, monitoring, recording)','Annex A: Attributes of enhanced risk management'] },
    { id:'ISO 8601:2019',       cat:'情報技術',    name:'日付及び時刻の表現—情報交換', desc:'年月日（YYYY-MM-DD）・時刻（hh:mm:ss）・タイムゾーン（+09:00/Z）・日時組み合わせ（YYYY-MM-DDThh:mm:ss±hh:mm）・期間（P1Y2M3DT4H5M6S）・時間間隔・繰り返し時間間隔の表記形式を国際標準として規定する。情報システム・データベース・API・ファイル名・ログ記録で世界的に採用されており、W3C・IETF RFC 3339・ISO 9075（SQL）など多くの技術標準の日時表記の基礎。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Date expressions','5. Time expressions','6. Time zone designators','7. Combined date and time expressions','8. Duration expressions','9. Time interval expressions','10. Recurring time interval expressions'] },
    { id:'ISO 4217:2015',       cat:'情報技術',    name:'通貨コード', desc:'世界各国の通貨を3文字のアルファベットコード（JPY・USD・EUR・CNY・GBP等）と3桁の数字コード（392・840・978等）で識別する国際規格。小数点以下の桁数（JPY=0・USD=2等）も規定する。国際送金・外国為替取引・電子商取引・会計システム・ERP・金融データ標準のマルチカレンシー対応の基礎コード体系として世界の金融システムで使用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Currency code list (alphabetic)','5. Currency code list (numeric)','6. Minor unit (decimal places)','Annex A: Historic currency codes'] },
    { id:'ISO 3166-1:2020',     cat:'情報技術',    name:'国名コード—第1部:国コード', desc:'世界の国・地域を識別するコードを規定するシリーズ規格の第1部。2文字コード（JP・US・CN等：Alpha-2）・3文字コード（JPN・USA・CHN等：Alpha-3）・3桁数字コード（392・840・156等）の3形式を規定する。インターネットのcountry-code TLD（.jp/.us/.cn）・国際電話番号・輸出入申告・パスポート管理・地理情報システムなど国際的な地域識別が必要なシステムの基礎コード体系。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Code construction','5. Alpha-2 code','6. Alpha-3 code','7. Numeric code','Annex A: Country code table'] },
    { id:'ISO 639-1:2002',      cat:'情報技術',    name:'言語コード', desc:'世界の自然言語を2文字のアルファベットで識別する言語コードを規定する。日本語（ja）・英語（en）・中国語（zh）・フランス語（fr）・ドイツ語（de）など183言語をカバーする。HTMLのlang属性・XMLの言語タグ・OS/ブラウザのロケール設定・多言語コンテンツ管理・翻訳業界の言語識別の標準として広く採用。より詳細な識別が必要な場合は3文字コードのISO 639-2/3が使用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Code construction (2-letter codes)','5. Language code table (183 languages)','Annex A: Relationship to ISO 639-2 and ISO 639-3'] },
    { id:'ISO/IEC 25010:2023',  cat:'情報技術',    name:'システム及びソフトウェア品質モデル', desc:'システム・ソフトウェアの品質を機能適合性・性能効率性・互換性・使用性・信頼性・セキュリティ・保守性・移植性の8特性・31副特性のモデルで体系化するSQuaRE（Software Quality Requirements and Evaluation）シリーズの中心規格。ソフトウェア調達RFP作成・品質要件定義・テスト設計・ベンダー評価の枠組みとして活用。2023年改訂ではAI・機械学習システムへの適用も考慮されている。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Quality model for systems and software products (8 characteristics)','5. Quality in use model (5 characteristics)','6. Definitions of quality characteristics and sub-characteristics','Annex A: Application of the models','Annex B: Relationship within SQuaRE series'] },
    { id:'ISO 80000',           cat:'計量',        name:'量及び単位', desc:'物理量（長さ・質量・時間・電流・温度・物質量・光度）とその単位（SI基本単位・SI組立単位）の名称・記号・定義を規定する多部構成（Part 1〜14）のシリーズ規格。物理・化学・電気・数学・光工学・音響・核科学等の各分野の量と単位を体系化する。科学技術文書・規格・設計仕様書での正確な単位表記の国際標準として理工系のすべての分野に関わる基礎参照規格。', toc:['Part 1: General','Part 2: Mathematics','Part 3: Space and time','Part 4: Mechanics','Part 5: Thermodynamics','Part 6: Electromagnetism','Part 7: Light and radiation','Part 8: Acoustics','Part 9: Physical chemistry','Part 10: Atomic and nuclear physics','Part 11: Characteristic numbers','Part 12: Condensed matter physics','Part 13: Information science and technology','Part 14: Telebiometrics'] },
  ],
  iec: [
    { id:'IEC 60068',    cat:'環境試験',    name:'環境試験', desc:'電子・電気部品・機器の環境適合性（信頼性）評価のための試験方法シリーズ規格。試験Ab（低温）・Ba（高温）・Ca（高温高湿定常）・Db（湿熱サイクル）・Ea（衝撃）・Eb（正弦波振動）・Fc（ランダム振動）・Ka（塩水噴霧）・Ma（はんだ付け性）など30以上の試験メソッドを収録する。スペース・航空・自動車・通信・産業機器の製品開発・部品認定・型式試験において国際的に参照される最重要環境試験規格シリーズ。JIS C 60068として日本でも採用。', toc:['Part 1: General and guidance','Test Ab: Cold','Test Ba: Dry heat','Test Ca: Damp heat (steady state)','Test Db: Damp heat (cyclic)','Test Ea: Shock','Test Eb: Vibration (sinusoidal)','Test Fc: Vibration (random)','Test Ka: Salt mist','Test Ma: Solderability','Test Na: Thermal shock','Test Pb: Bump','Part 3-1: Guidance on test sequence priorities'] },
    { id:'IEC 60364',    cat:'電気設備',    name:'建物の電気設備', desc:'住宅・ビル・工場等の建物内における低圧電気設備（AC 1000V/DC 1500V以下）の設計・施工・検査・試験に関する技術要求事項を規定する基本規格シリーズ。保護方式（感電保護・過電流保護・地絡保護）・回路の選定・配線方法・接地方式・特殊設備（浴室・プール・建築工事現場・医療等）への追加要件を規定する。欧州の低電圧指令のベース規格であり、日本の電技解釈・内線規程の技術的参照源としても機能する。', toc:['Part 1: Fundamental principles','Part 4-41: Protection against electric shock','Part 4-43: Protection against overcurrent','Part 4-44: Protection against voltage disturbances','Part 5-51: Selection and erection of electrical equipment','Part 5-52: Wiring systems','Part 5-54: Earthing arrangements','Part 6: Verification','Part 7-701: Locations with bathtubs (special)','Part 7-710: Medical locations'] },
    { id:'IEC 60529',    cat:'電気設備',    name:'外郭による保護等級（IPコード）', desc:'機器の外郭（筐体）が固体異物・水・ほこりの浸入に対してどの程度保護しているかを2桁のIP（Ingress Protection）コード（IP00〜IP69K）で表記する方法を規定する。第1桁（0〜6）が固体異物・防塵保護等級、第2桁（0〜9K）が防水保護等級を示す。製品仕様書のIP67（防塵・30分水中1m）・IP54（防塵・あらゆる方向からの飛まつ）等の表記根拠となる最重要電気機器安全規格の一つ。JIS C 0920として日本でも採用。', toc:['1. Scope','2. Normative references','3. Definitions','4. Designation','5. Requirements for degrees of protection (1st digit: solids)','6. Requirements for degrees of protection (2nd digit: water)','7. Tests','Annex A: IP code table','Annex B: Test equipment'] },
    { id:'IEC 60601',    cat:'医療機器',    name:'医用電気機器—基本安全及び基本性能', desc:'患者と電気的に接触する医用電気機器全般に適用される安全規格シリーズの基礎規格（Part 1）。感電保護（患者漏れ電流・絶縁クラス：B/BF/CF型）・機械的安全・放射線・高温等の基本安全と基本性能の要求事項を規定する。ソフトウェアリスクマネジメント（IEC 62304）・EMC（IEC 60601-1-2）・ユーザビリティ（IEC 62366）を包含するコンプレックス規格群の頂点。EU MDR・FDA 510(k)/PMA・日本薬機法の承認取得において適合性確認が求められる。JIS T 0601として日本でも採用。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. General requirements','5. General requirements for testing','6. Classification of ME equipment','7. Identification, marking and documents','8. Protection against electrical hazards','9. Protection against mechanical hazards','10. Protection against unwanted radiation','11. Protection against excessive temperatures','12. Accuracy and other safety-related performance','13. Hazardous situations and fault conditions','Annex A-L: Specific guidance'] },
    { id:'IEC 60664',    cat:'電気設備',    name:'低圧系統内機器の絶縁協調', desc:'低圧システム（AC 1000V/DC 1500V以下）に使用する電気機器の絶縁協調（Insulation Coordination）設計—過電圧カテゴリ（I〜IV）・汚染度（1〜4）・材料グループ（I〜IIIb）に基づいた沿面距離・空間距離・絶縁厚さ・部分放電の設計原則を規定する。電気機器の感電保護設計の核心規格であり、IEC 61010・IEC 62368等の多くの安全規格がこの規格を引用する基礎的絶縁設計規格。', toc:['Part 1: Principles, requirements and tests','1. Scope','2. Terms and definitions','3. Fundamental requirements','4. Clearances','5. Creepage distances','6. Solid insulation','7. Micro-environments','Annex A: Basis for the table of clearances','Annex B: Guidance for specific situations'] },
    { id:'IEC 60825',    cat:'光技術',      name:'レーザ製品の安全基準', desc:'レーザ製品のビーム特性（波長・パルス幅・ビーム発散角・出力）に基づくクラス分類（1・1C・1M・2・2M・3R・3B・4）、各クラスの最大照射可能放射（MPE）、安全要求事項（インターロック・キーロック・ビームストップ・保護ハウジング・警告表示・ラベル）・測定方法を規定する安全規格シリーズ。製造・医療（レーザ手術）・通信（光ファイバ機器）・測定（LiDAR・3Dスキャナ）・エンターテインメント（レーザショー）で使用するレーザ機器の設計・CE認証・輸出で必須。JIS C 6802として日本でも採用。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Laser classes overview','5. Classification requirements','6. Requirements for manufacturers','7. Information for users','Annex A: Measurement of laser radiation','Annex B: Laser classification flowchart','Annex C: Background information'] },
    { id:'IEC 61000',    cat:'EMC',         name:'電磁両立性（EMC）', desc:'電磁両立性（EMC：Electromagnetic Compatibility）に関する国際規格シリーズ。電磁障害（EMI）の放射・伝導エミッション限度値（Part 3）、ESD・雷サージ・バースト・電圧ディップ等の電気的障害に対するイミュニティ試験方法と限度値（Part 4）、EMC測定技術（Part 5）を規定する。CE認証・FCC認証・VCCI自主規制等の電磁波認証の試験根拠規格群。電子機器の開発・量産・認証において必須のシリーズ規格。JIS C 61000として日本でも採用。', toc:['Part 1: General','Part 2: Environment (description, compatibility levels)','Part 3: Limits (harmonics, flicker, emission limits)','Part 4-2: ESD immunity','Part 4-3: Radiated immunity','Part 4-4: EFT/burst immunity','Part 4-5: Surge immunity','Part 4-6: Conducted immunity','Part 4-8: Power frequency magnetic field','Part 4-11: Voltage dips and interruptions','Part 5: Installation and mitigation guidelines'] },
    { id:'IEC 61010',    cat:'測定機器',    name:'測定・制御・試験機器の安全', desc:'マルチメータ・オシロスコープ・電源装置・自動試験装置などの測定・制御・試験機器の感電保護・熱的安全・機械的安全・放射線保護のシリーズ安全規格。汚染度・過電圧カテゴリ（CAT I〜IV）による測定カテゴリ表示（CAT III 600V等）の根拠規格であり、電気測定器の選定・設計・CE認証・UL 61010適合に必須。IEC 60664との相互参照により絶縁設計が規定される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Test conditions','5. Marking and documentation','6. Protection against electric shock','7. Insulation requirements (clearances, creepage)','8. Protection against mechanical hazards','9. Protection against thermal hazards','10. Protection against hazardous substances','11. Limit values for voltages','Annex A: Measurement category system'] },
    { id:'IEC 61215',    cat:'再生可能',    name:'結晶シリコン太陽電池モジュール', desc:'太陽光発電システムに使用する結晶シリコン（モノ/ポリ）太陽電池モジュールの設計適格性認証のための試験要件を規定する。UVプレコンディショニング・温度サイクル（−40〜+85°C 200サイクル）・湿熱（85°C・85%RH 1000h）・機械的荷重（2400Pa正負）・ひょう衝撃・バイパスダイオード熱試験等を含む包括的な屋外耐久性評価試験を規定。JET・TÜV・UL等の認証機関によるモジュール性能保証試験の国際基準として太陽光発電導入の品質保証で活用される。', toc:['Part 1: Test requirements','1. Scope','2. Normative references','3. Terms and definitions','4. Requirements','5. Testing sequence','Part 2: Test procedures','MQT 01: Visual inspection','MQT 02: Maximum power determination','MQT 03: Insulation test','MQT 09: Hot-spot endurance','MQT 10: UV preconditioning','MQT 11: Thermal cycling','MQT 13: Damp heat','MQT 17: Hail impact','MQT 21: Mechanical load'] },
    { id:'IEC 61439',    cat:'電気設備',    name:'低圧開閉装置及び制御装置盤', desc:'低圧開閉装置・制御装置の組み立て品（LVSA：分電盤・制御盤・配電盤・モータコントロールセンタ等）の設計・性能・試験の要求事項を規定するシリーズ規格。型式試験（TTA）と部分型式試験（PTTA）・設計認証の概念を導入し、各Part別に発電所（Part 5）・海洋（Part 6）・住宅用（Part 7）等の用途別要求を規定する。電気盤製作者・設備設計者が盤の製造仕様・試験記録の作成に使用する重要規格群。', toc:['Part 1: General rules','1. Scope','2. Normative references','3. Terms and definitions','4. General requirements','5. Technical characteristics of ASSEMBLY','6. Service conditions','7. Design requirements','8. Technical data','9. Verification','Part 2: Power switchgear and controlgear assemblies','Part 3: Distribution boards','Part 5: Assemblies for power distribution in public networks','Part 7: Assemblies for specific applications'] },
    { id:'IEC 61508',    cat:'機能安全',    name:'電気・電子・プログラマブル電子安全関連系の機能安全', desc:'電気（E）・電子（E）・プログラマブル電子（PE）技術を使用した安全関連系の機能安全を確保するための汎用規格シリーズ。安全機能の要求事項（SRS）定義→ハードウェア安全完全性（SIL 1〜4）の割り当て→安全ライフサイクルの実施→検証・妥当性確認の体系を規定する。SIL（Safety Integrity Level）の概念を確立した規格であり、IEC 61511（プロセス）・IEC 62061（機械）・ISO 26262（自動車）・EN 50128（鉄道）等の産業特化型機能安全規格の親規格として位置づけられる。', toc:['Part 1: General requirements','Part 2: Requirements for E/E/PE safety-related systems','Part 3: Software requirements','Part 4: Definitions and abbreviations','Part 5: Examples of methods for determination of SIL','Part 6: Guidelines on application of IEC 61508-2 and -3','Part 7: Overview of techniques and measures'] },
    { id:'IEC 61511',    cat:'機能安全',    name:'プロセス産業向け安全計装システム', desc:'化学・石油・ガス・製薬プラント等のプロセス産業における安全計装システム（SIS：Safety Instrumented System）の機能安全要求事項を規定するIEC 61508のプロセス産業適用規格。プロセス危険源の特定→HAZOP等によるリスクアセスメント→SIL目標の設定→SILアーキテクチャ設計（PFD計算・HFT）→検証・妥当性確認のライフサイクル全体を規定する。緊急遮断弁（SDV）・緊急遮断システム（ESD）・バーナ管理システム（BMS）等のSIS設計・認証で必須の規格。', toc:['Part 1: Framework, definitions, system, hardware and application programming requirements','Part 2: Guidelines for application of IEC 61511-1','Part 3: Guidance for the determination of required safety integrity levels'] },
    { id:'IEC 62133',    cat:'電池',        name:'携帯機器用二次電池の安全要求事項', desc:'スマートフォン・タブレット・ノートPC・電動工具・電動モビリティ等のポータブル機器に使用するリチウムイオン・リチウムポリマー二次電池パックの安全要求事項（過充電・過放電・短絡・機械的衝撃・熱的安定性・外部短絡等）と試験方法を規定するシリーズ規格。UL 2054（北米）とともに主要な民生用リチウム電池安全規格として、電池パックの国際認証（CB認証スキーム）の基礎として採用される。', toc:['Part 1: Nickel systems','Part 2: Lithium systems','1. Scope','2. Normative references','3. Terms and definitions','4. General requirements','5. Tests (overcharge, over-discharge, short circuit, crush, heating, vibration, etc.)','Annex A: Test conditions'] },
    { id:'IEC 62368',    cat:'AV/IT機器',  name:'音響・映像及び情報技術機器—安全要求事項', desc:'テレビ・オーディオアンプ等AV機器を対象とした旧IEC 60065と、コンピュータ・プリンタ等IT機器を対象とした旧IEC 60950-1を統合した次世代の安全規格。ハザードベースアプローチ（エネルギーソース→保護手段→ユーザースキル別分類）を採用し、AV・IT・通信機器の垣根を超えた統一的な安全設計枠組みを提供する。CE認証・UL 62368・PSE（電気用品安全法）等の主要な機器安全認証で2020年以降適用が義務化されている。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. General requirements','5. Marking, documentation and control of safeguards','6. Electrically caused injury','7. Thermally caused injury','8. Energy related injury (fire)','9. Mechanically caused injury','10. Radiation caused injury','11. Chemical caused injury','Annex A: Energy source classification'] },
    { id:'IEC 62443',    cat:'セキュリティ', name:'産業用オートメーション・制御システムのセキュリティ', desc:'製造工場・プラント・水処理・ビル管理等のOT（Operational Technology）環境における産業用オートメーション・制御システム（IACS）のサイバーセキュリティ要件を規定するシリーズ規格（4部14文書構成）。セキュリティレベル（SL 1〜4）・セキュリティゾーン・コンジット・サプライチェーンセキュリティ・製品開発ライフサイクルセキュリティを規定する。重要インフラのサイバー攻撃（TRITON・Stuxnet等）対策の国際基準として、産業用機器メーカー・SIerの製品認証・システム設計で参照が急増している。', toc:['Series 1: General (terminology, metrics, lifecycle)','Series 2: Policies and procedures (IACS security management)','2-1: Requirements for IACS security management system','2-4: Requirements for IACS service providers','Series 3: System (architecture, security requirements)','3-2: Security risk assessment for IACS','3-3: System security requirements and security levels','Series 4: Component (products)','4-1: Secure product development lifecycle requirements','4-2: Technical security requirements for IACS components'] },
    { id:'IEC/ISO 31010', cat:'リスク',    name:'リスクアセスメント技法', desc:'ISO 31000（リスクマネジメント指針）のリスクアセスメントプロセスを実施するための様々な技法（50種以上）を紹介するガイダンス規格。FMEA（故障モード影響解析）・FTA（フォルトツリー解析）・HAZOP（危険性と運転性の検討）・What-If分析・シナリオ分析・モンテカルロシミュレーション・ボウタイ分析・SWIFT・BN（ベイズネットワーク）等の各手法の特徴・適用場面・実施手順を解説する。機能安全・医療機器・食品安全・プロジェクトリスク等幅広い分野のリスクアセスメント実務書として活用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Risk assessment concepts','5. Risk assessment process overview','6. Risk identification techniques','7. Risk analysis techniques (FMEA, FTA, HAZOP, etc.)','8. Risk evaluation techniques','Annex A: Overview of risk assessment techniques (50+ methods)','Annex B: Selected technique descriptions'] },
    { id:'ISO/IEC 27001', cat:'セキュリティ', name:'情報セキュリティマネジメントシステム', desc:'ISOとIECの合同技術委員会JTC 1のSC 27（情報セキュリティ）が策定したISMSの国際認証規格（2022年版）。機密性・完全性・可用性の3属性を維持するための情報セキュリティリスク管理の仕組みを構築するための要件を定め、附属書Aに93の管理策（4テーマ分類）を収録する。金融・IT・通信・医療等での認証取得が取引要件となるケースが増加。詳細はISOセクションのISO/IEC 27001:2022も参照。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Context of the organization','5. Leadership','6. Planning','7. Support','8. Operation','9. Performance evaluation','10. Improvement','Annex A: Information security controls reference (93 controls in 4 themes)'] },
  ],
  ieee: [
    { id:'IEEE 802.3',    cat:'ネットワーク',  name:'Ethernet（有線LAN）', desc:'イーサネット（有線LAN）の物理層・データリンク層（MACサブレイヤ）の技術仕様を規定する標準規格シリーズ。1980年の10Mbps（10BASE-5同軸）から始まり、100BASE-TX（Fast Ethernet）・1000BASE-T（Gigabit）・10GBASE-T・25G/40G/100G/400Gbpsと進化を続ける。CSMA/CD（半二重）からフルデュプレックス・スイッチング技術の発展を包含。現代のLAN・データセンタ・産業ネットワークの物理インフラの根幹をなす国際規格。', toc:['Clause 1: Scope','Clause 2: Normative references','Clause 3: Terms and definitions','Clause 4: Overview (MAC, PHY architecture)','Clause 21: Introduction to 10BASE series','Clause 40: 100BASE-TX (Fast Ethernet)','Clause 40: 1000BASE-T (Gigabit Ethernet)','Clause 52: 10GBASE-T','Clause 74: Forward Error Correction','Clause 119: 400Gbps options','Annex: MAC parameters'] },
    { id:'IEEE 802.11',   cat:'ネットワーク',  name:'無線LAN（Wi-Fi）', desc:'無線LAN（Wi-Fi）の物理層（PHY）とMAC層の技術仕様を規定する規格シリーズ。802.11b（Wi-Fi 1：2.4GHz/11Mbps）→802.11a（Wi-Fi 2：5GHz/54Mbps）→802.11g（Wi-Fi 3）→802.11n（Wi-Fi 4：MIMO）→802.11ac（Wi-Fi 5：MU-MIMO）→802.11ax（Wi-Fi 6：OFDMA）→802.11be（Wi-Fi 7：Multi-Link Operation）と進化を続ける。家庭・オフィス・公共インフラ・工場・IoTデバイスの無線接続の国際標準。Wi-Fi Allianceの認証プログラムの技術ベース。', toc:['Clause 1: Scope','Clause 4: General description (architecture, services)','Clause 9: MAC sublayer functional description','Clause 10: MAC security','Clause 11: Frame formats','Clause 17: DSSS PHY','Clause 19: OFDM PHY','Clause 36: DMG (60 GHz)','Clause 26: HE PHY (802.11ax/Wi-Fi 6)','Annex: Channel numbering'] },
    { id:'IEEE 802.11a',  cat:'ネットワーク',  name:'無線LAN 5GHz帯 54Mbps', desc:'IEEE 802.11の初期拡張規格（1999年）。5GHz帯のU-NII周波数帯（5.15〜5.85GHz）でOFDM変調方式を採用し、最大54Mbpsのデータレートを実現。2.4GHz帯の802.11bと比較して干渉が少なく高速だが、壁等の障害物への減衰が大きい。現在は802.11n/acに置き換えられているが、5GHz帯無線LANの先駆けとして技術史上重要な位置づけにある。', toc:['1. Scope','2. MAC layer specifications (shared with 802.11 base)','3. OFDM PHY specifications','4. 5GHz frequency bands (U-NII)','5. Modulation and coding (BPSK to 64-QAM)','6. Data rates (6/9/12/18/24/36/48/54 Mbps)','7. Channel plan'] },
    { id:'IEEE 802.11n',  cat:'ネットワーク',  name:'無線LAN Wi-Fi 4（MIMO）', desc:'Wi-Fi 4（2009年）。MIMO（Multiple Input Multiple Output）技術により複数アンテナで空間多重伝送を実現し、2.4GHz/5GHzの両周波数帯で最大600Mbps（4×4 MIMO・40MHzチャネル幅）を達成。ビームフォーミング・フレームアグリゲーション（A-MPDU）・Block ACK等のスループット改善技術も導入。現在もビジネス環境・家庭用ルータで現役として稼働しているケースが多い。', toc:['1. Scope','2. MAC enhancements (A-MPDU, Block ACK, PSMP)','3. HT PHY specification','4. MIMO and MIMO-OFDM','5. Beamforming (TxBF)','6. 40MHz channel bonding','7. MCS index table (0-76)','8. Coexistence with legacy 802.11a/b/g'] },
    { id:'IEEE 802.11ac', cat:'ネットワーク',  name:'無線LAN Wi-Fi 5', desc:'Wi-Fi 5（2013年）。5GHz専用で動作し、80/160MHzのチャネルボンディング・256-QAMの高次変調・MU-MIMO（下り最大8ストリーム）・ビームフォーミング（TxBF）により最大6.9Gbps（理論値）の高速無線通信を実現。オフィス・ホテル・商業施設の高密度Wi-Fi展開の主力規格として広く普及。Wave 1（MU-MIMO非対応）→Wave 2（MU-MIMO対応）の2世代展開で段階的に性能向上。', toc:['1. Scope','2. MAC enhancements for VHT','3. VHT PHY specification','4. 5GHz band operation','5. 80/160/80+80 MHz channel bonding','6. 256-QAM modulation','7. MU-MIMO (downlink, up to 8 streams)','8. Explicit TxBF beamforming','9. MCS table (0-9)'] },
    { id:'IEEE 802.11ax', cat:'ネットワーク',  name:'無線LAN Wi-Fi 6/6E', desc:'Wi-Fi 6/6E（2019/2021年）。OFDMA（直交周波数分割多元接続）により1チャネルを複数ユーザーで効率共用し、BSS Coloring（電波干渉軽減）・TWT（Target Wake Time：IoTデバイスの省電力スケジューリング）・1024-QAM変調により最大9.6Gbpsを達成。高密度環境（スタジアム・空港・工場フロア）での多接続効率が大幅向上。Wi-Fi 6Eは6GHz帯への拡張により160MHz幅チャネルの確保が容易になった。', toc:['1. Scope','2. MAC enhancements (TWT, BSS Coloring, SR)','3. HE PHY specification','4. OFDMA resource unit allocation','5. MU-MIMO (uplink and downlink)','6. 1024-QAM modulation','7. 2.4GHz/5GHz/6GHz band operation','8. Spatial Reuse (BSS Coloring)','9. Target Wake Time (TWT)'] },
    { id:'IEEE 802.15.1', cat:'ネットワーク',  name:'Bluetooth無線通信', desc:'2.4GHz ISMバンドの短距離（〜10m：Class 2/3）・中距離（〜100m：Class 1）無線通信技術Bluetoothの基本仕様を規定した規格（2002/2005年）。後にBluetooth SIGが規格を独自管理するようになり、現在のBluetooth 5.x（4Mbps/長距離）・Bluetooth LE（低消費電力）・Bluetooth Meshはコアスペックとして発行される。IEEE 802.15.1はその技術的淵源として位置づけられ、ワイヤレスオーディオ・スマートフォン周辺機器・IoTセンサの基礎技術。', toc:['1. Overview','2. Architecture','3. MAC sublayer','4. PHY layer (FHSS/GFSK, 2.4GHz)','5. Bluetooth radio specification','6. Baseband','7. Link manager','8. Logical link control and adaptation','Annex A: Bluetooth profiles overview'] },
    { id:'IEEE 802.15.4', cat:'ネットワーク',  name:'ZigBee / 低速PAN', desc:'低速・低消費電力・低コストの無線PAN（Personal Area Network）の物理層・MAC層を規定する規格。250kbps（2.4GHz帯）を基本とし、ZigBee・Thread・6LoWPAN・WirelessHART・ISA 100.11aなどの上位プロトコルのベース物理・MAC規格として使用される。電池駆動のセンサノード・スマートメータ・ビル管理（照明/HVAC制御）・産業用ワイヤレスセンサネットワーク（WSN）・IoTゲートウェイの基幹無線技術。', toc:['1. Scope','2. Architecture overview','3. MAC sublayer','4. PHY layer (2.4GHz/868MHz/915MHz)','5. Data rates and channel plan','6. Network topology (star/mesh/cluster-tree)','7. Security','8. PHY extensions (UWB, CSS)','Annex A: Test specifications'] },
    { id:'IEEE 754',      cat:'コンピュータ', name:'浮動小数点演算の標準', desc:'二進浮動小数点演算の精度・表現形式（符号・指数部・仮数部）・丸め規則（最近偶数丸め等4モード）・特殊値（±∞・NaN・非正規数）・算術演算（加減乗除・平方根・剰余・融合積和演算FMA）の動作を規定する計算機科学の根幹規格。単精度（binary32：約7桁）・倍精度（binary64：約15桁）・4倍精度（binary128）の各フォーマットを定義。C/C++・Java・Python・Rustほぼすべての現代プログラミング言語の浮動小数点演算・CPU/FPU実装の基礎となる。', toc:['1. Scope','2. Terms and definitions','3. Floating-point formats (binary32/64/128, decimal64/128)','4. Operations','5. Rounding rules (roundTiesToEven, etc.)','6. Special values (±0, ±∞, NaN, subnormal)','7. Arithmetic operations','8. Conversions','9. Comparisons','10. Exception handling','11. Expression evaluation'] },
    { id:'IEEE 1003',     cat:'ソフトウェア', name:'POSIX—ポータブルOS仕様', desc:'Unix系OSのアプリケーションポータビリティを実現するためのOS API（システムコール・ライブラリ関数・コマンドラインシェル・ユーティリティコマンド・POSIXスレッド（pthreads）等）の仕様を規定するPOSIX（Portable Operating System Interface）規格シリーズ。Linux・macOS・FreeBSD等のUNIX互換OSのAPI設計の基礎として機能し、OS間でのソースコードレベルの移植性を確保する。ISO/IEC 9945として国際規格化。組み込みLinux・クラウドコンピューティングの基盤技術。', toc:['Base Definitions (XBD): Definitions, headers, general concepts','System Interfaces (XSH): C API (open, read, write, fork, exec, etc.)','Shell and Utilities (XCU): Shell language, utilities (ls, grep, awk, etc.)','Rationale (XRAT): Background information','POSIX Threads (pthreads): Thread creation, synchronization','Real-Time: Timers, signals, IPC','Networking: Sockets API'] },
    { id:'IEEE 1284',     cat:'インタフェース', name:'パラレルポートインタフェース', desc:'プリンタ・スキャナ等の周辺機器をPCに接続するパラレルインタフェース（Centronics/IEEE 1284）の電気的特性・信号線・プロトコル（ニブルモード・バイトモード・EPP・ECP）を規定した規格（1994年）。現在はUSB・ネットワーク印刷に置き換えられほぼ使用されていないが、一部の産業用制御機器・計測装置・CNC工作機械との接続では依然として参照される。PC周辺機器インタフェースの技術史上重要な規格。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Electrical specifications','5. Signal definitions','6. Compatibility mode (Centronics)','7. Nibble mode','8. Byte mode','9. ECP (Enhanced Capability Port)','10. EPP (Enhanced Parallel Port)','11. Device ID'] },
    { id:'IEEE 1394',     cat:'インタフェース', name:'FireWire シリアルバス', desc:'高速シリアルバス（FireWire・iLink・Lynx）の物理層・データリンク層・トランザクション層・シリアルバス管理プロトコルを規定する規格（1995年）。400Mbps（FireWire 400）・800Mbps（FireWire 800：IEEE 1394b）のアイソクロナス転送（等時性保証）により、ビデオカメラ・HDDなどリアルタイム性が求められる機器に採用された。現在は民生機器でのUSBへの移行が進んでいるが、航空宇宙・産業用機器・ARINC 1394Bでは継続使用される。', toc:['1. Scope','2. Architecture overview','3. Physical layer','4. Link layer','5. Transaction layer','6. Serial Bus Management','7. Isochronous transfer','8. Asynchronous transfer','9. Node addressing','Annex: Cable and connector specifications'] },
    { id:'IEEE 1547',     cat:'エネルギー',   name:'分散エネルギー資源の系統連系', desc:'太陽光・風力・燃料電池・蓄電池等の分散エネルギー資源（DER）を低圧・高圧の電力系統に接続する際の技術要件（インタフェース要件・保護協調・電圧・周波数調整・アイランド検出・再閉路）を規定する。2018年改訂（IEEE 1547-2018）でスマートインバータ機能（電圧制御への積極的参加・低電圧ライドスルー・リアクティブパワー制御）が大幅強化。米国での太陽光発電系統連系の事実上の国家基準として機能し、日本の系統連系規程の参考規格としても活用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. DER interconnection requirements','5. Voltage regulation','6. Frequency regulation','7. Cease to energize and trip settings','8. Ride-through requirements (LVRT/HVRT/LFRT)','9. Interconnection test','10. Smart inverter functions','Annex A: Informative annexes'] },
    { id:'IEEE 1588',     cat:'ネットワーク',  name:'高精度時刻同期プロトコル（PTP）', desc:'ネットワーク上の機器間でGPSなしにナノ秒〜マイクロ秒精度の時刻同期を実現するPTP（Precision Time Protocol）の通信手順・メッセージ形式・BMCA（ベストマスタークロックアルゴリズム）・ハードウェアタイムスタンプ方式を規定する。版（v2/v2.1）・プロファイル（電力系統用C37.238・通信網用G.8275.1・産業自動化用）に応じた適用が進む。5G通信インフラ・TSN（タイムセンシティブネットワーキング）・電力系統の位相測定・証券取引の時刻同期で必須規格として採用されている。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. PTP overview','5. PTP data sets','6. PTP clock types (GM, BC, TC, OC)','7. BMCA (Best Master Clock Algorithm)','8. PTP message formats','9. Synchronization mechanism (Sync/Follow-Up/Delay-Req)','10. Profiles','11. Security'] },
    { id:'IEEE 1609',     cat:'ネットワーク',  name:'車車間・路車間通信（WAVE）', desc:'路車間・車車間通信（V2X：Vehicle to Everything）に使用するWAVE（Wireless Access in Vehicular Environments）通信アーキテクチャを規定するシリーズ規格。WAVE Short Message Protocol（WSMP）・セキュリティサービス（1609.2：証明書管理・プライバシー保護）・ネットワーク層（IPv6利用）・DSRC（Dedicated Short Range Communication：5.9GHz帯）物理層を規定する。米国の自動運転・ITS（高度道路交通システム）の基礎技術規格として幹線・交差点での実証が進む。', toc:['IEEE 1609.2: Security services (certificates, privacy)','IEEE 1609.3: Networking services (WSMP, IPv6)','IEEE 1609.4: Multi-channel operation','IEEE 1609.12: Identifier allocation','Physical layer: DSRC at 5.9GHz (802.11p)','Application layer: Basic Safety Message (BSM)'] },
    { id:'IEEE 2030',     cat:'エネルギー',   name:'スマートグリッドの相互運用性', desc:'スマートグリッド（次世代電力系統）における電力システム・情報通信技術（ICT）・エンドユーザーの3層の相互運用性フレームワークを規定する規格シリーズ。需給調整（デマンドレスポンス）・分散エネルギー資源の統合・電力系統の自動化・マイクログリッド・電気自動車（V2G：Vehicle to Grid）統合等のスマートグリッドアーキテクチャの設計指針を提供する。再生可能エネルギーの大量導入に対応した次世代電力インフラの国際標準。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Smart grid interoperability architecture','5. Power system domain perspective','6. Communications technology domain perspective','7. Information technology domain perspective','8. Interoperability reference model','Annex: Related IEEE smart grid standards'] },
    { id:'IEEE 7000',     cat:'AI・倫理',    name:'倫理的考慮を組み込んだシステム設計', desc:'AI・自動化システム・ロボット等の技術システムの設計・開発・展開において、倫理的考慮事項（人権・プライバシー・公正性・自律性・ウェルビーイング等）を体系的に組み込むためのプロセスとアーキテクチャ要件を規定する。バリュー特定・ステークホルダーエンゲージメント・倫理的影響評価（EIS）・透明性・説明責任のフレームワークを提示するAI時代の倫理規格。EU AI Act・各国AI規制対応の実装ガイドとしても注目を集めている。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Overview of value-based engineering','5. Concept of operations (ConOps) for ethics','6. Stakeholder value elicitation','7. Ethical value requirements (EVRs)','8. Ethical risk/impact assessment','9. Ethical design','10. Verification and validation','Annex A: Ethical value mapping examples'] },
    { id:'IEEE 12207',    cat:'ソフトウェア', name:'ソフトウェアライフサイクルプロセス', desc:'ソフトウェアシステムの取得・供給・開発・保守・廃棄・サポートの各ライフサイクルプロセスの要求事項と推奨事項を規定するISO/IEC/IEEE 12207:2017対応規格。ソフトウェア調達契約・開発プロセス標準化・品質管理プロセス定義のフレームワークとして機能する。CMMIやSPICE（ISO/IEC 15504）とも関連し、防衛・航空・金融等の規制業界のソフトウェア開発プロセス要件として参照される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Software life cycle processes overview','5. Agreement processes (acquisition, supply)','6. Organizational project-enabling processes','7. Technical management processes','8. Technical processes (requirements, architecture, design, implement, test)','9. Software-specific processes','Annex A: Process reference model'] },
    { id:'IEEE 829',      cat:'ソフトウェア', name:'ソフトウェアテスト文書化標準', desc:'ソフトウェアテストの計画・設計・実施・報告で作成すべきドキュメント（テスト計画書・テスト設計仕様書・テスト手順書・テスト項目一覧・テスト結果報告書・テスト完了報告書等）の内容・形式を規定するソフトウェアテスト文書化規格。現在はISO/IEC/IEEE 29119シリーズに統合発展しているが、ソフトウェア検収・契約管理・テストプロセス標準化の参考書として活用され、特に医療機器・官公庁システムの品質保証で参照される。', toc:['1. Scope','2. Overview','3. Test plan document','4. Test design specification','5. Test case specification','6. Test procedure specification','7. Test item transmittal report','8. Test log','9. Test incident report','10. Test summary report'] },
    { id:'IEEE 1016',     cat:'ソフトウェア', name:'ソフトウェア設計記述', desc:'ソフトウェアシステムのアーキテクチャ設計・詳細設計を記述するためのデザイン記述（SDD：Software Design Description）の内容要件—関心事（Concerns）・設計ビュー・設計言語・設計要素・ラショナル（設計根拠）—を規定するISO/IEC/IEEE 42010と整合した規格。UML図・SysML・ERD等の設計ビューを統合したSDDの作成標準として、システム開発の設計審査・納品物要件・設計書品質評価に活用される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. Software design description overview','5. Design viewpoints (context, composition, logical, dependency, information, patterns)','6. SDD conformance','7. SDD documentation requirements','Annex A: Rationale'] },
    { id:'IEEE 30141',    cat:'IoT',          name:'IoTリファレンスアーキテクチャ', desc:'IoT（Internet of Things）システムのリファレンスアーキテクチャとして、エンティティ（物理ドメイン・情報ドメイン・サービスドメイン・ユーザードメイン・オペレーションドメイン）・概念モデル・共通用語・特性（安全性・セキュリティ・スケーラビリティ・相互運用性・可用性）を規定するISO/IEC 30141と整合した規格。IoTシステムの設計・調達・評価の共通フレームワークとして、スマートホーム・スマートシティ・産業IoT（IIoT）・コネクテッドカーのアーキテクチャ設計の基準として参照される。', toc:['1. Scope','2. Normative references','3. Terms and definitions','4. IoT reference architecture overview','5. IoT conceptual model (5 domains)','6. IoT reference architecture model','7. IoT characteristics (safety, security, scalability, interoperability)','8. IoT use cases','Annex A: Mapping to ISO/IEC 30141'] },
  ],
};

// STANDARDS_DB 定義後に初期化
initStandardsDB();

function getSearchUrl(org, id) {
  const num = id.replace(/^(JIS|ISO|IEC|IEEE)\s*/i, '');
  const q = encodeURIComponent(num);
  switch (org) {
    case 'jis':  return `https://www.jisc.go.jp/`;
    case 'iso':  return `https://www.iso.org/search.html#q=${encodeURIComponent(id)}`;
    case 'iec':  return `https://www.iec.ch/`;
    case 'ieee': return `https://standards.ieee.org/search/?q=${q}`;
    default:     return '#';
  }
}

function buildDetailedSearch(org, container) {
  const db = STANDARDS_DB[org];
  if (!db || db.length === 0) return;

  const wrap = document.createElement('div');

  const titleEl = document.createElement('p');
  titleEl.className = 'modal-section-title';
  titleEl.textContent = '詳細規格番号一覧（検索可）';
  wrap.appendChild(titleEl);

  // 検索入力
  const searchWrap = document.createElement('div');
  searchWrap.className = 'modal-detail-search-wrap';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'modal-detail-search';
  searchInput.placeholder = '🔍 規格番号・キーワードで絞り込み...';
  searchWrap.appendChild(searchInput);
  wrap.appendChild(searchWrap);

  // カテゴリフィルター
  const cats = ['すべて', ...new Set(db.map(s => s.cat))];
  const filterWrap = document.createElement('div');
  filterWrap.className = 'modal-detail-filters';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal-detail-filter' + (cat === 'すべて' ? ' active' : '');
    btn.textContent = cat;
    btn.dataset.cat = cat;
    filterWrap.appendChild(btn);
  });
  wrap.appendChild(filterWrap);

  // 件数表示
  const counter = document.createElement('p');
  counter.className = 'modal-detail-counter';
  wrap.appendChild(counter);

  // 一覧
  const list = document.createElement('div');
  list.className = 'modal-detail-list';
  wrap.appendChild(list);
  container.appendChild(wrap);

  let activeCat = 'すべて';

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = db.filter(s => {
      const matchesCat = activeCat === 'すべて' || s.cat === activeCat;
      const matchesQ = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q) || (s.toc && s.toc.some(t => t.toLowerCase().includes(q)));
      return matchesCat && matchesQ;
    });

    counter.textContent = `${filtered.length} 件`;

    if (filtered.length === 0) {
      list.innerHTML = '<p class="modal-detail-empty">該当する規格が見つかりませんでした。</p>';
      return;
    }

    list.innerHTML = filtered.map(s => `
      <div class="modal-detail-item">
        <div class="modal-detail-item-head">
          <span class="card-tag ${org}" style="margin:0;font-size:0.7rem;padding:2px 7px;">${s.id}</span>
          <span class="modal-detail-item-cat">${s.cat}</span>
        </div>
        <div class="modal-detail-item-name">${s.name}</div>
        <div class="modal-detail-item-overview-label">📝 概要</div>
        <div class="modal-detail-item-desc">${s.desc}</div>
        ${s.toc && s.toc.length ? `<details class="db-item-toc">
          <summary>📋 目次を表示（${s.toc.length}章）</summary>
          <ol class="db-item-toc-list">${s.toc.map(t => `<li>${t}</li>`).join('')}</ol>
        </details>` : ''}
        <a class="modal-detail-item-link ${org}" href="${getSearchUrl(org, s.id)}" target="_blank" rel="noopener noreferrer">🔗 公式サイトで確認</a>
      </div>`).join('');
  }

  render();

  searchInput.addEventListener('input', render);
  filterWrap.querySelectorAll('.modal-detail-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      filterWrap.querySelectorAll('.modal-detail-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      render();
    });
  });
}

function buildModalContent(org) {
  const d = ORG_DATA[org];
  if (!d) return;

  // ヘッダー
  document.getElementById('modal-logo').className = 'modal-logo ' + d.color;
  document.getElementById('modal-logo').textContent = org.toUpperCase();
  document.getElementById('modal-title-h2').textContent = d.name;
  document.getElementById('modal-title-sub').textContent = d.nameEn;

  // ボディ
  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  // 概要文
  if (d.intro) {
    const introEl = document.createElement('p');
    introEl.style.cssText = 'color:var(--text-muted);font-size:0.9rem;margin-bottom:4px;line-height:1.7;';
    introEl.textContent = d.intro;
    body.appendChild(introEl);
  }

  // 公式リンク
  const linksTitle = document.createElement('p');
  linksTitle.className = 'modal-section-title';
  linksTitle.textContent = '公式サイト・リンク';
  body.appendChild(linksTitle);

  const linkWrap = document.createElement('div');
  linkWrap.className = 'modal-official-links';
  d.officialLinks.forEach(l => {
    const a = document.createElement('a');
    a.className = 'official-link ' + d.color;
    a.href = l.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = l.label;
    linkWrap.appendChild(a);
  });
  body.appendChild(linkWrap);

  // 分類一覧
  const catTitle = document.createElement('p');
  catTitle.className = 'modal-section-title';
  catTitle.textContent = '分類一覧';
  body.appendChild(catTitle);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'modal-table-wrapper';
  const colLabel = org === 'jis' ? '部門記号' : org === 'ieee' ? '規格番号帯' : '技術委員会';
  tableWrap.innerHTML = `
    <table>
      <thead><tr><th>${colLabel}</th><th>分野</th><th>代表的な規格例</th></tr></thead>
      <tbody>${d.categories.map(c => `<tr><td><strong>${c.code}</strong></td><td>${c.field}</td><td>${c.examples}</td></tr>`).join('')}</tbody>
    </table>`;
  body.appendChild(tableWrap);

  // 主要規格
  const stdTitle = document.createElement('p');
  stdTitle.className = 'modal-section-title';
  stdTitle.textContent = '主要規格';
  body.appendChild(stdTitle);

  const grid = document.createElement('div');
  grid.className = 'modal-card-grid';
  d.standards.forEach(s => {
    const card = document.createElement('div');
    card.className = 'modal-card';
    card.innerHTML = `
      <div class="card-tag ${d.color}">${s.id}</div>
      <h4>${s.name}</h4>
      <p>${s.desc}</p>
      <a class="card-official ${d.color}" href="${s.url}" target="_blank" rel="noopener noreferrer">🔗 ${s.urlLabel}</a>`;
    grid.appendChild(card);
  });
  body.appendChild(grid);

  // 詳細規格番号一覧（検索UI）
  buildDetailedSearch(org, body);

  // 審議プロセス（ISOのみ）
  if (d.process) {
    const procTitle = document.createElement('p');
    procTitle.className = 'modal-section-title';
    procTitle.textContent = '規格の審議プロセス';
    body.appendChild(procTitle);

    const timeline = document.createElement('div');
    timeline.className = 'modal-timeline';
    timeline.innerHTML = d.process.map(p => `
      <div class="modal-timeline-item">
        <div class="modal-timeline-dot"></div>
        <div class="modal-timeline-step">${p.step}</div>
        <div class="modal-timeline-content"><strong>${p.title}</strong> ${p.desc}</div>
      </div>`).join('');
    body.appendChild(timeline);
  }

  // JISマーク等のTipBox
  if (d.tipBox) {
    const tip = document.createElement('div');
    tip.className = 'modal-tip-box';
    tip.innerHTML = d.tipBox;
    body.appendChild(tip);
  }
}

const modal = document.getElementById('org-modal');
const modalClose = document.getElementById('modal-close');

function openModal(org) {
  buildModalContent(org);
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

if (modalClose) {
  modalClose.addEventListener('click', closeModal);
}
if (modal) {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
});

// ナビ・バッジの data-modal-org リンク
document.querySelectorAll('[data-modal-org]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    openModal(el.dataset.modalOrg);
  });
});

// ボタン直接クリック
document.querySelectorAll('.more-btn[data-org]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    openModal(btn.dataset.org);
  });
});

// ボックス全体クリック（ボタン・リンク以外）
document.querySelectorAll('.overview-box[data-org]').forEach(box => {
  box.addEventListener('click', e => {
    if (e.target.closest('.official-links') || e.target.closest('.more-btn')) return;
    openModal(box.dataset.org);
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(box.dataset.org);
    }
  });
});

// ===== スムーススクロール（ナビ） =====
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href || href === '#' || link.dataset.modalOrg) return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (nav) nav.classList.remove('open');
    }
  });
});
