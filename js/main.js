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

// ===== 規格詳細モーダル =====
const ORG_DATA = {
  jis: {
    name: 'JIS（日本産業規格）',
    nameEn: 'Japanese Industrial Standards',
    color: 'jis',
    officialLinks: [
      { label: '🌐 JISC公式サイト',  url: 'https://www.jisc.go.jp/' },
      { label: '📄 JIS規格票閲覧（JSA）', url: 'https://webdesk.jsa.or.jp/' },
      { label: '🏛 経済産業省 標準化',  url: 'https://www.meti.go.jp/policy/economy/hyojun-kijun/index.html' },
    ],
    categories: [
      { code: 'JIS A', field: '土木・建築',     examples: 'JIS A 5308（レディーミクストコンクリート）、JIS A 1108（圧縮強度試験）' },
      { code: 'JIS B', field: '一般機械',       examples: 'JIS B 0001（機械製図）、JIS B 1521（深みぞ玉軸受）' },
      { code: 'JIS C', field: '電子機器・電気機械', examples: 'JIS C 8105（照明器具）、JIS C 6802（レーザ製品の安全基準）' },
      { code: 'JIS D', field: '自動車',         examples: 'JIS D 0023（自動車部品の電磁両立性）' },
      { code: 'JIS E', field: '鉄道',           examples: 'JIS E 1001（鉄道用語）、JIS E 1101（普通レール）' },
      { code: 'JIS F', field: '船舶',           examples: 'JIS F 3301（船用消防設備）' },
      { code: 'JIS G', field: '鉄鋼',           examples: 'JIS G 3101（一般構造用圧延鋼材）、JIS G 4051（機械構造用炭素鋼）' },
      { code: 'JIS H', field: '非鉄金属',       examples: 'JIS H 4000（アルミニウム及びアルミニウム合金の板及び条）' },
      { code: 'JIS K', field: '化学',           examples: 'JIS K 6251（加硫ゴム—引張特性の求め方）' },
      { code: 'JIS L', field: '繊維',           examples: 'JIS L 0001（繊維製品の取扱いに関する表示記号）' },
      { code: 'JIS M', field: '鉱山',           examples: 'JIS M 1002（鉱山技術用語）' },
      { code: 'JIS P', field: 'パルプ・紙',     examples: 'JIS P 0001（紙・板紙及びパルプ用語）' },
      { code: 'JIS Q', field: 'マネジメントシステム', examples: 'JIS Q 9001（品質マネジメント）、JIS Q 14001（環境マネジメント）' },
      { code: 'JIS R', field: '窯業',           examples: 'JIS R 5210（ポルトランドセメント）' },
      { code: 'JIS S', field: '日用品',         examples: 'JIS S 1101（木製いす）、JIS S 2030（ガス燃焼機器）' },
      { code: 'JIS T', field: '医療安全用具',   examples: 'JIS T 0601（医用電気機器の安全通則）' },
      { code: 'JIS W', field: '航空',           examples: 'JIS W 1001（航空用語）' },
      { code: 'JIS X', field: '情報処理',       examples: 'JIS X 0208（2バイト情報交換用符号化漢字集合）、JIS X 0213' },
      { code: 'JIS Z', field: 'その他（包装・物流等）', examples: 'JIS Z 0200（包装方法通則）、JIS Z 8301（規格票の様式）' },
    ],
    standards: [
      { id: 'JIS Q 9001', name: '品質マネジメントシステム', desc: 'ISO 9001対応。製品・サービスの品質を継続的に改善するためのシステム要求事項。', url: 'https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList', urlLabel: 'JISC で検索' },
      { id: 'JIS Q 14001', name: '環境マネジメントシステム', desc: 'ISO 14001対応。環境負荷低減・法令遵守を目的としたシステム要求事項。', url: 'https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList', urlLabel: 'JISC で検索' },
      { id: 'JIS Q 27001', name: '情報セキュリティマネジメント', desc: 'ISO/IEC 27001対応。情報資産保護のためのISMS要求事項。', url: 'https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList', urlLabel: 'JISC で検索' },
      { id: 'JIS X 0208', name: '2バイト情報交換用符号化漢字集合', desc: '日本語文字コード規格。Shift-JIS・EUC-JPの基盤となった歴史的規格。', url: 'https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList', urlLabel: 'JISC で検索' },
      { id: 'JIS B 0001', name: '機械製図', desc: '図面作成の標準規格。線の種類・寸法記入法・投影法などを規定。', url: 'https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList', urlLabel: 'JISC で検索' },
      { id: 'JIS G 3101', name: '一般構造用圧延鋼材（SS400等）', desc: 'SS400などの建築・橋梁用鋼材の規格。引張強さ・化学成分を規定。', url: 'https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList', urlLabel: 'JISC で検索' },
      { id: 'JIS L 0001', name: '繊維製品の取扱い表示', desc: 'ケアラベルの洗濯・乾燥・アイロン等の絵表示を定めた規格。ISO 3758と整合。', url: 'https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList', urlLabel: 'JISC で検索' },
      { id: 'JIS T 0601', name: '医用電気機器の安全通則', desc: 'IEC 60601対応。医療機器の電気的安全性に関する基本要求事項。', url: 'https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList', urlLabel: 'JISC で検索' },
    ],
  },
  iso: {
    name: 'ISO（国際標準化機構）',
    nameEn: 'International Organization for Standardization',
    color: 'iso',
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
