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
    { id:'JIS A 0001', cat:'A', name:'建築製図通則',                    desc:'建築設計図面における線の種類・尺度・文字・材料表示記号などの基本規則を定める。' },
    { id:'JIS A 1108', cat:'A', name:'コンクリートの圧縮強度試験方法',  desc:'円柱供試体を用いたコンクリートの圧縮強度試験の手順・装置・計算方法を規定。' },
    { id:'JIS A 1109', cat:'A', name:'細骨材の密度及び吸水率試験方法', desc:'コンクリート用細骨材（砂）の密度・吸水率の測定方法を規定。' },
    { id:'JIS A 5308', cat:'A', name:'レディーミクストコンクリート',     desc:'工場で製造・配達されるコンクリートの品質・製造・試験・検査方法を規定。建設工事で最も使用される材料規格の一つ。' },
    { id:'JIS A 5371', cat:'A', name:'プレキャスト無筋コンクリート製品', desc:'工場生産された無筋コンクリート製品（縁石・側溝・U字溝等）の品質・試験方法を規定。' },
    { id:'JIS A 5406', cat:'A', name:'建設用セラミックタイル',            desc:'床・壁に使用するセラミックタイルの寸法・品質・試験方法を規定。' },
    { id:'JIS A 6005', cat:'A', name:'アスファルト系防水シート',          desc:'屋根・地下外壁等の防水に使用するアスファルト系シートの品質・試験を規定。' },
    // B - 一般機械
    { id:'JIS B 0001', cat:'B', name:'機械製図',                         desc:'機械・設備の図面作成における線の種類・寸法記入法・投影法・公差記入法などを規定。製造現場で最も参照される製図標準。' },
    { id:'JIS B 0205', cat:'B', name:'メートル並目ねじ',                  desc:'M規格一般用メートルねじの基準山形・基準寸法を規定。ほとんどの機械部品のねじに使用。' },
    { id:'JIS B 0209', cat:'B', name:'メートル並目ねじの公差',            desc:'M規格ねじの寸法許容差・はめあい区分（1〜3級）を規定。' },
    { id:'JIS B 0401', cat:'B', name:'リニアサイズの公差及びはめあい',    desc:'寸法の公差・はめあい（すきまばめ・しまりばめ・中間ばめ）を規定。精密機械加工の基礎規格。' },
    { id:'JIS B 1521', cat:'B', name:'深みぞ玉軸受',                      desc:'最も一般的なラジアル型ボールベアリングの寸法・公差・品質を規定。' },
    { id:'JIS B 2220', cat:'B', name:'鋼製管フランジ',                    desc:'配管接続に用いる鋼製フランジの形式・寸法・圧力クラスを規定。' },
    { id:'JIS B 8101', cat:'B', name:'ボルト及びナットの機械的性質',      desc:'鋼製ボルト・ナットの引張強さ・耐力・硬さの等級（4.6・8.8・10.9等）を規定。' },
    // C - 電気・電子
    { id:'JIS C 0920', cat:'C', name:'電気機械器具の外郭による保護等級（IPコード）', desc:'固体異物・水の浸入に対する保護等級をIPxx形式で表記するIEC 60529対応規格。IP67等の表記の根拠。' },
    { id:'JIS C 3307', cat:'C', name:'600Vビニル絶縁電線（IV電線）',      desc:'一般電気工作物の配線に使用するビニル絶縁電線の構造・品質・試験方法を規定。' },
    { id:'JIS C 4201', cat:'C', name:'配線用遮断器',                       desc:'過電流・短絡保護用ブレーカの性能・試験方法を規定。' },
    { id:'JIS C 6802', cat:'C', name:'レーザ製品の安全基準',               desc:'レーザ製品のクラス分類（1〜4）・安全要求事項・表示方法を規定。IEC 60825対応。' },
    { id:'JIS C 8105', cat:'C', name:'照明器具',                           desc:'蛍光灯器具・LED器具等の安全要求事項・試験方法を規定。' },
    { id:'JIS C 8201', cat:'C', name:'低圧開閉装置及び制御装置',           desc:'低圧（AC 1000V・DC 1500V以下）の開閉装置の性能・構造・試験を規定。' },
    { id:'JIS C 60068', cat:'C', name:'環境試験方法（電気・電子）',        desc:'温度・湿度・振動・衝撃など環境試験の種類と方法を規定。IEC 60068対応。' },
    // D - 自動車
    { id:'JIS D 0023', cat:'D', name:'自動車部品の電磁両立性（EMC）',     desc:'自動車用電子部品・システムの電磁放射・イミュニティ試験方法を規定。' },
    { id:'JIS D 1601', cat:'D', name:'自動車部品振動試験方法',             desc:'自動車用部品の振動耐久性を評価するための試験条件・手順を規定。' },
    { id:'JIS D 5301', cat:'D', name:'始動用鉛蓄電池',                     desc:'エンジン始動・照明用の自動車用鉛蓄電池の形式・性能・試験方法を規定。' },
    // G - 鉄鋼
    { id:'JIS G 3101', cat:'G', name:'一般構造用圧延鋼材',                 desc:'SS400・SS490・SS540など建築・橋梁・船舶等の一般構造用鋼材の引張強さ・化学成分を規定。' },
    { id:'JIS G 3106', cat:'G', name:'溶接構造用圧延鋼材',                 desc:'SM490など溶接構造物に使用する鋼材の機械的性質・化学成分を規定。' },
    { id:'JIS G 3131', cat:'G', name:'熱間圧延軟鋼板及び鋼帯',             desc:'SPHC等のプレス・曲げ加工に適した熱延鋼板の寸法・品質を規定。' },
    { id:'JIS G 3141', cat:'G', name:'冷間圧延鋼板及び鋼帯',               desc:'SPCC・SPCD等の冷延鋼板の品質・寸法を規定。家電・自動車外板に広く使用。' },
    { id:'JIS G 4051', cat:'G', name:'機械構造用炭素鋼鋼材',               desc:'S45C・S35Cなど歯車・シャフト・ボルト等の機械部品用炭素鋼の炭素量・機械的性質を規定。' },
    { id:'JIS G 4303', cat:'G', name:'ステンレス鋼棒',                     desc:'SUS304・SUS316等のステンレス鋼棒の化学成分・機械的性質を規定。' },
    { id:'JIS G 4401', cat:'G', name:'炭素工具鋼鋼材',                     desc:'SK3〜SK7など工具・刃物用炭素鋼の化学成分・熱処理特性を規定。' },
    // H - 非鉄金属
    { id:'JIS H 4000', cat:'H', name:'アルミニウム及びアルミニウム合金の板及び条', desc:'1000〜7000系アルミニウム合金板の化学成分・機械的性質・調質記号（H・T等）を規定。' },
    { id:'JIS H 4040', cat:'H', name:'アルミニウム及びアルミニウム合金の棒及び線', desc:'A6061等の押出棒・引抜線の寸法・機械的性質を規定。' },
    { id:'JIS H 3100', cat:'H', name:'銅及び銅合金の板及び条',             desc:'無酸素銅・黄銅・リン青銅等の銅合金板の品質・寸法を規定。' },
    // K - 化学
    { id:'JIS K 6251', cat:'K', name:'加硫ゴム及び熱可塑性ゴム—引張特性', desc:'ゴム材料の引張強さ・伸び・応力の試験方法を規定。ISO 37対応。' },
    { id:'JIS K 6253', cat:'K', name:'加硫ゴム及び熱可塑性ゴム—硬さ',    desc:'デュロメータ（タイプA・D）によるゴムの硬さ試験方法を規定。' },
    { id:'JIS K 7161', cat:'K', name:'プラスチック—引張特性',              desc:'プラスチック材料の引張強さ・伸び・弾性率の試験方法を規定。ISO 527対応。' },
    // L - 繊維
    { id:'JIS L 0001', cat:'L', name:'繊維製品の取扱いに関する表示記号及びその表示方法', desc:'衣類等のケアラベルの洗濯・乾燥・アイロン・クリーニングの絵表示を規定。ISO 3758対応。' },
    { id:'JIS L 1913', cat:'L', name:'一般不織布試験方法',                 desc:'不織布の質量・厚さ・引張強さ等の試験方法を規定。' },
    // Q - マネジメント
    { id:'JIS Q 9000', cat:'Q', name:'品質マネジメントシステム—基本及び用語',            desc:'ISO 9000対応。QMSの基本概念と用語を定義。QMS規格群理解の基礎。' },
    { id:'JIS Q 9001', cat:'Q', name:'品質マネジメントシステム—要求事項',               desc:'ISO 9001対応。顧客満足と品質改善のためのQMS要求事項。世界最多認証取得規格。' },
    { id:'JIS Q 9003', cat:'Q', name:'品質マネジメントシステム—パフォーマンス改善指針', desc:'ISO 9004対応。QMSの持続的成功のための指針。' },
    { id:'JIS Q 14001', cat:'Q', name:'環境マネジメントシステム—要求事項',              desc:'ISO 14001対応。PDCAサイクルに基づく環境管理の要求事項。' },
    { id:'JIS Q 19011', cat:'Q', name:'マネジメントシステム監査のための指針',           desc:'ISO 19011対応。QMS・EMS等の監査の原則・管理・実施方法を規定。' },
    { id:'JIS Q 27001', cat:'Q', name:'情報セキュリティマネジメントシステム—要求事項',  desc:'ISO/IEC 27001対応。情報資産保護のためのISMSの要求事項。' },
    { id:'JIS Q 27002', cat:'Q', name:'情報セキュリティ管理策の実践のための規範',       desc:'ISO/IEC 27002対応。情報セキュリティ管理策の実施指針。' },
    { id:'JIS Q 31000', cat:'Q', name:'リスクマネジメント—指針',                        desc:'ISO 31000対応。組織のリスク管理の原則・枠組み・プロセスを規定。' },
    { id:'JIS Q 45001', cat:'Q', name:'労働安全衛生マネジメントシステム—要求事項',      desc:'ISO 45001対応。労働者の安全・健康保護のためのOH&SMS要求事項。' },
    // T - 医療
    { id:'JIS T 0601', cat:'T', name:'医用電気機器—基本安全及び基本性能に関する一般要求事項', desc:'IEC 60601対応。医用電気機器の電気的安全性・EMCの基本要求事項。医療機器承認で必須。' },
    { id:'JIS T 1022', cat:'T', name:'病院電気設備の安全基準',             desc:'手術室・ICU等の医療機器が使用される病院内電気設備の安全基準を規定。' },
    { id:'JIS T 3250', cat:'T', name:'在宅医療用輸液ポンプ',               desc:'在宅医療で使用する輸液ポンプの安全・性能要求事項を規定。' },
    // X - 情報処理
    { id:'JIS X 0001', cat:'X', name:'情報処理用語—基本用語',              desc:'コンピュータ・情報処理分野の基本用語を定義。ISO/IEC 2382対応。' },
    { id:'JIS X 0208', cat:'X', name:'情報交換用漢字符号集合',              desc:'6879字の漢字・ひらがな・カタカナを収録した2バイト文字集合。Shift-JIS・EUC-JPの基盤。' },
    { id:'JIS X 0213', cat:'X', name:'4バイト符号化拡張漢字集合',          desc:'JIS X 0208の拡張版。第3・第4水準漢字を追加し約11000字を収録。' },
    { id:'JIS X 0301', cat:'X', name:'日付及び時刻の表示',                 desc:'ISO 8601対応。YYYY-MM-DD形式の日付・時刻表記を規定。' },
    { id:'JIS X 3010', cat:'X', name:'プログラム言語C',                    desc:'ISO/IEC 9899対応。C言語の文法・標準ライブラリを規定。組み込み・システムプログラミングの基礎。' },
    { id:'JIS X 3014', cat:'X', name:'プログラム言語C++',                  desc:'ISO/IEC 14882対応。C++言語の文法・標準ライブラリを規定。' },
    { id:'JIS X 4051', cat:'X', name:'日本語文書の組版方法',               desc:'日本語テキストのレイアウト・組版規則（行送り・禁則処理・ルビ等）を規定。' },
    { id:'JIS X 5321', cat:'X', name:'開放型システム間相互接続—基本参照モデル（OSI 7層）', desc:'ISO/IEC 7498対応。OSI 7層モデルを規定。ネットワークアーキテクチャの基礎概念。' },
    { id:'JIS X 9150', cat:'X', name:'電子データ交換（EDI）',              desc:'企業間の電子データ交換の標準メッセージ形式・手順を規定。' },
    { id:'JIS X 25010', cat:'X', name:'システム及びソフトウェア品質モデル', desc:'ISO/IEC 25010対応。ソフトウェア製品品質の8特性（機能性・信頼性・使用性等）を定義。' },
    // Z - その他
    { id:'JIS Z 0200', cat:'Z', name:'包装方法通則',                       desc:'各種製品の包装設計・材料選択・包装方法の通則を規定。' },
    { id:'JIS Z 0237', cat:'Z', name:'粘着テープ・粘着シートの試験方法',   desc:'粘着テープ類の粘着力・保持力・引張強さ等の試験方法を規定。' },
    { id:'JIS Z 8301', cat:'Z', name:'規格票の様式及び作成方法',           desc:'JIS規格文書の書き方・様式・用語の使い方を規定するメタ規格。' },
    { id:'JIS Z 8401', cat:'Z', name:'数値の丸め方',                       desc:'計算結果・測定値を指定桁数に丸める方法（四捨五入等）の規則を規定。' },
    { id:'JIS Z 9001', cat:'Z', name:'抜取検査通則',                       desc:'品質管理における統計的抜取検査の原則・手順・各種方式を規定。' },
  ],
  iso: [
    { id:'ISO 9001:2015',       cat:'品質',        name:'品質マネジメントシステム—要求事項',          desc:'顧客満足と品質の継続的改善のためのQMS要求事項。世界170か国以上で普及。' },
    { id:'ISO 9000:2015',       cat:'品質',        name:'品質マネジメントシステム—基本及び用語',      desc:'QMSの基本概念・7原則と用語の定義。' },
    { id:'ISO 9004:2018',       cat:'品質',        name:'組織の品質—持続的成功のための指針',          desc:'QMSのパフォーマンス改善・持続的成功のための指針。' },
    { id:'ISO 19011:2018',      cat:'品質',        name:'マネジメントシステム監査のための指針',       desc:'QMS・EMS等のマネジメントシステム監査の原則・管理・実施方法を規定。' },
    { id:'ISO 14001:2015',      cat:'環境',        name:'環境マネジメントシステム—要求事項',          desc:'PDCAサイクルに基づく環境管理の国際規格。' },
    { id:'ISO 14040:2006',      cat:'環境',        name:'環境マネジメント—ライフサイクルアセスメント', desc:'製品のライフサイクル全体の環境負荷評価（LCA）の原則・枠組みを規定。' },
    { id:'ISO 14064:2018',      cat:'環境',        name:'温室効果ガス（GHG）の定量化及び報告',        desc:'組織・プロジェクトレベルのGHG排出量の計測・報告・検証の方法を規定。' },
    { id:'ISO 45001:2018',      cat:'安全衛生',    name:'労働安全衛生マネジメントシステム—要求事項',  desc:'旧OHSAS 18001の後継。労働者の安全・健康保護の国際規格。' },
    { id:'ISO/IEC 27001:2022',  cat:'セキュリティ', name:'情報セキュリティマネジメントシステム—要求事項', desc:'情報資産のリスク管理・ISMS認証の基礎規格。' },
    { id:'ISO/IEC 27002:2022',  cat:'セキュリティ', name:'情報セキュリティ管理策',                    desc:'93の情報セキュリティ管理策の実施指針。' },
    { id:'ISO/IEC 27005:2022',  cat:'セキュリティ', name:'情報セキュリティリスクマネジメント',         desc:'情報セキュリティリスクの特定・分析・評価・対応プロセスの指針。' },
    { id:'ISO/IEC 27017:2015',  cat:'セキュリティ', name:'クラウドサービスの情報セキュリティ管理策',   desc:'クラウドサービス提供者・利用者向けの情報セキュリティ管理策の指針。' },
    { id:'ISO 50001:2018',      cat:'エネルギー',  name:'エネルギーマネジメントシステム—要求事項',    desc:'省エネ・CO₂削減のためのエネルギー管理規格。' },
    { id:'ISO 22000:2018',      cat:'食品',        name:'食品安全マネジメントシステム—要求事項',      desc:'HACCPを取り入れた食品サプライチェーン安全管理規格。' },
    { id:'ISO 22301:2019',      cat:'事業継続',    name:'事業継続マネジメントシステム—要求事項',      desc:'災害・障害時の事業継続を確保するBCMSの要求事項。' },
    { id:'ISO 13485:2016',      cat:'医療機器',    name:'医療機器の品質マネジメントシステム—要求事項', desc:'医療機器の設計・製造・供給組織のための品質管理規格。' },
    { id:'ISO 26000:2010',      cat:'CSR',         name:'社会的責任に関する手引',                    desc:'組織のCSRの指針規格。認証用ではなくガイダンス。SDGsやESG経営の基礎。' },
    { id:'ISO 37001:2016',      cat:'CSR',         name:'贈収賄防止マネジメントシステム',             desc:'組織における贈収賄防止のための管理システムの要求事項。' },
    { id:'ISO 55001:2014',      cat:'アセット',    name:'アセットマネジメントシステム—要求事項',      desc:'設備・インフラ等の資産を適切に管理するためのシステム要求事項。' },
    { id:'ISO 31000:2018',      cat:'リスク',      name:'リスクマネジメント—指針',                   desc:'汎用的なリスク管理の原則・枠組み・プロセスを規定。業種・規模を問わず適用可能。' },
    { id:'ISO 8601:2019',       cat:'情報技術',    name:'日付及び時刻の表現—情報交換',               desc:'YYYY-MM-DD、ISO週番号など日時表記の国際標準。' },
    { id:'ISO 4217:2015',       cat:'情報技術',    name:'通貨コード',                                desc:'JPY・USD・EURなど3文字の通貨コードと数字コードを規定。' },
    { id:'ISO 3166-1:2020',     cat:'情報技術',    name:'国名コード—第1部:国コード',                 desc:'JP・US・CNなど国・地域を表す2/3文字・数字コードを規定。' },
    { id:'ISO 639-1:2002',      cat:'情報技術',    name:'言語コード',                                desc:'ja・en・zhなど自然言語を表す2文字コードを規定。' },
    { id:'ISO/IEC 25010:2023',  cat:'情報技術',    name:'システム及びソフトウェア品質モデル',         desc:'ソフトウェア製品品質の8特性（機能性・信頼性・使用性・効率性等）を定義。' },
    { id:'ISO 80000',           cat:'計量',        name:'量及び単位',                                desc:'国際単位系（SI）の量・単位・記号を規定するシリーズ規格。' },
  ],
  iec: [
    { id:'IEC 60068',    cat:'環境試験',    name:'環境試験',                                        desc:'電子・電気製品の温度・湿度・振動・衝撃等の環境試験方法シリーズ。' },
    { id:'IEC 60364',    cat:'電気設備',    name:'建物の電気設備',                                  desc:'建物内低圧電気設備の設計・施工・検査に関する基本規格シリーズ。' },
    { id:'IEC 60529',    cat:'電気設備',    name:'外郭による保護等級（IPコード）',                  desc:'固体異物・水の浸入に対する機器の保護等級（IP××）を規定。IP67等の表記の根拠。' },
    { id:'IEC 60601',    cat:'医療機器',    name:'医用電気機器—基本安全及び基本性能',              desc:'医療機器の電気的安全・EMCの基本規格。JIS T 0601として日本でも採用。' },
    { id:'IEC 60664',    cat:'電気設備',    name:'低圧系統内機器の絶縁協調',                        desc:'低圧電気機器の絶縁設計・沿面距離・空間距離の規定方法を規定。' },
    { id:'IEC 60825',    cat:'光技術',      name:'レーザ製品の安全基準',                            desc:'レーザ製品のクラス分類（1M・2・3B・4等）・安全要求事項を規定。' },
    { id:'IEC 61000',    cat:'EMC',         name:'電磁両立性（EMC）',                               desc:'電磁放射・イミュニティに関する規格シリーズ。各種機器の認証で必須。' },
    { id:'IEC 61010',    cat:'測定機器',    name:'測定・制御・試験機器の安全',                      desc:'計測器・試験装置・制御機器の安全規格。' },
    { id:'IEC 61215',    cat:'再生可能',    name:'結晶シリコン太陽電池モジュール',                  desc:'太陽光発電パネルの設計・性能評価・試験方法を規定。' },
    { id:'IEC 61439',    cat:'電気設備',    name:'低圧開閉装置及び制御装置盤',                      desc:'電気盤・配電盤の設計・製造・試験に関する規格シリーズ。' },
    { id:'IEC 61508',    cat:'機能安全',    name:'電気・電子・プログラマブル電子安全関連系の機能安全', desc:'SIL（安全完全性レベル）を定義する機能安全の基礎規格。' },
    { id:'IEC 61511',    cat:'機能安全',    name:'プロセス産業向け安全計装システム',                desc:'化学プラント等のSIS（安全計装システム）の機能安全要求事項。' },
    { id:'IEC 62133',    cat:'電池',        name:'携帯機器用二次電池の安全要求事項',                desc:'スマートフォン・ノートPC等のリチウムイオン電池の安全規格。' },
    { id:'IEC 62368',    cat:'AV/IT機器',  name:'音響・映像及び情報技術機器—安全要求事項',         desc:'IEC 60065/60950を統合した次世代AV・IT機器安全規格。' },
    { id:'IEC 62443',    cat:'セキュリティ', name:'産業用オートメーション・制御システムのセキュリティ', desc:'工場・プラントのOT環境のサイバーセキュリティ規格シリーズ。' },
    { id:'IEC/ISO 31010', cat:'リスク',    name:'リスクアセスメント技法',                           desc:'リスク評価手法（FMEA・FTA・HAZOP等）のガイダンス。' },
    { id:'ISO/IEC 27001', cat:'セキュリティ', name:'情報セキュリティマネジメントシステム',          desc:'ISOとIECの共同規格。JTC 1/SC 27が担当。ISMS認証の国際規格。' },
  ],
  ieee: [
    { id:'IEEE 802.3',    cat:'ネットワーク',  name:'Ethernet（有線LAN）',                        desc:'10Mbps〜400Gbpsの有線ネットワーク規格。CSMA/CDアクセス制御を規定。' },
    { id:'IEEE 802.11',   cat:'ネットワーク',  name:'無線LAN（Wi-Fi）',                           desc:'Wi-Fi 4（802.11n）〜Wi-Fi 7（802.11be）まで進化。現代の無線通信インフラの標準。' },
    { id:'IEEE 802.11a',  cat:'ネットワーク',  name:'無線LAN 5GHz帯 54Mbps',                     desc:'5GHz帯を使用するOFDM方式の無線LAN規格（最大54Mbps）。' },
    { id:'IEEE 802.11n',  cat:'ネットワーク',  name:'無線LAN Wi-Fi 4（MIMO）',                   desc:'MIMOで最大600Mbpsを実現した無線LAN規格。2.4GHz/5GHz両対応。' },
    { id:'IEEE 802.11ac', cat:'ネットワーク',  name:'無線LAN Wi-Fi 5',                           desc:'5GHz帯のMIMO・ビームフォーミングを活用した高速無線LAN（最大6.9Gbps）。' },
    { id:'IEEE 802.11ax', cat:'ネットワーク',  name:'無線LAN Wi-Fi 6/6E',                        desc:'OFDMA・MU-MIMOで高密度環境での効率を向上（最大9.6Gbps）。' },
    { id:'IEEE 802.15.1', cat:'ネットワーク',  name:'Bluetooth無線通信',                          desc:'2.4GHz帯の短距離無線通信Bluetoothの基本仕様。後にBluetooth SIGが管理。' },
    { id:'IEEE 802.15.4', cat:'ネットワーク',  name:'ZigBee / 低速PAN',                          desc:'ZigBee・ThreadなどIoTデバイス向け低速・低消費電力PAN規格。' },
    { id:'IEEE 754',      cat:'コンピュータ', name:'浮動小数点演算の標準',                         desc:'単精度（32bit）・倍精度（64bit）の浮動小数点数表現と演算を規定。多くの言語の数値演算の基盤。' },
    { id:'IEEE 1003',     cat:'ソフトウェア', name:'POSIX—ポータブルOS仕様',                      desc:'UnixベースシステムのアプリケーションポータビリティのためのOS API規格（POSIX）。' },
    { id:'IEEE 1284',     cat:'インタフェース', name:'パラレルポートインタフェース',               desc:'プリンタ等の接続に使われたパラレルインタフェースの規格（現在はUSB移行済み）。' },
    { id:'IEEE 1394',     cat:'インタフェース', name:'FireWire シリアルバス',                      desc:'高速シリアルバスFireWire（400/800Mbps）の規格。映像機器・ストレージで使用。' },
    { id:'IEEE 1547',     cat:'エネルギー',   name:'分散エネルギー資源の系統連系',                 desc:'太陽光・風力発電等の分散電源を電力系統に接続するための技術要件。' },
    { id:'IEEE 1588',     cat:'ネットワーク',  name:'高精度時刻同期プロトコル（PTP）',             desc:'ネットワーク上でナノ秒級の時刻同期を実現するPTPプロトコルの規格。5G・産業ネットワークで重要。' },
    { id:'IEEE 1609',     cat:'ネットワーク',  name:'車車間・路車間通信（WAVE）',                  desc:'車両と路側機の無線通信（V2X/DSRC）の通信規格シリーズ。' },
    { id:'IEEE 2030',     cat:'エネルギー',   name:'スマートグリッドの相互運用性',                 desc:'電力系統とITシステムの相互運用性に関する規格。再生可能エネルギー統合を支援。' },
    { id:'IEEE 7000',     cat:'AI・倫理',    name:'倫理的考慮を組み込んだシステム設計',            desc:'AI・自動化システムの設計に倫理・人権・プライバシーを組み込むプロセス規格。' },
    { id:'IEEE 12207',    cat:'ソフトウェア', name:'ソフトウェアライフサイクルプロセス',            desc:'ISO/IEC 12207対応。ソフトウェアの取得・開発・保守・廃棄の各プロセスを規定。' },
    { id:'IEEE 829',      cat:'ソフトウェア', name:'ソフトウェアテスト文書化標準',                 desc:'テスト計画書・テスト設計仕様・テスト報告書等のソフトウェアテスト文書の形式を規定。' },
    { id:'IEEE 1016',     cat:'ソフトウェア', name:'ソフトウェア設計記述',                         desc:'ソフトウェアアーキテクチャ・詳細設計の記述方法を規定。' },
    { id:'IEEE 30141',    cat:'IoT',          name:'IoTリファレンスアーキテクチャ',                desc:'IoTシステムの標準的なアーキテクチャ・用語・概念フレームワークを規定。' },
  ],
};

function getSearchUrl(org, id) {
  const q = encodeURIComponent(id);
  switch (org) {
    case 'jis':  return `https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList`;
    case 'iso':  return `https://www.iso.org/search.html#q=${q}`;
    case 'iec':  return `https://webstore.iec.ch/en/search?q=${q}`;
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
      const matchesQ = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q);
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
        <div class="modal-detail-item-desc">${s.desc}</div>
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
