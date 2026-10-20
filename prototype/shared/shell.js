/* SENSE 共用 AppShell：側欄＋header。
   data-page="home" 為模組入口頁（只標示模組名稱）；其他值對應子選單 key，會標示該子項目。
   用法：<div class="app" data-module="product" data-page="home">
           <aside class="sidebar" id="sidebar"></aside>
           <div class="main"><header class="header" id="header"></header> …頁面內容… </div>
         </div>
   載入本檔後呼叫 SenseShell.mount()。 */
(function(){
  const BASE = (document.currentScript && document.currentScript.src.replace(/shell\.js(\?.*)?$/, '')) || 'shared/';
  // 打包成單一檔案時，素材由頁面提供的 window.SENSE_ASSETS（data URI）取代
  const A = (f) => (window.SENSE_ASSETS && window.SENSE_ASSETS[f]) || BASE + 'assets/' + f;

  // 側欄模組暫不提供下拉子選單（2026-10-19）；改回 true 即恢復展開箭頭與子選單
  const SHOW_SUBS = false;

  // 模組清單：subs 有內容的才能展開；href 為 null 表示尚未製作
  const MODULES = [
    { key:'product',   label:'商品SENSE', c:'var(--mod-product)',   strong:'var(--mod-product-strong)',   href:'product-sense.html',
      subs:[ { key:'new', label:'新增商品', href:'product-sense-add-product.html' }, { key:'browse', label:'瀏覽商品', href:'product-sense.html#browse' } ] },
    { key:'marketing', label:'行銷SENSE', c:'var(--mod-marketing)', strong:'var(--mod-marketing-strong)', href:null, subs:[] },
    { key:'strategy',  label:'策略SENSE', c:'var(--mod-strategy)',  strong:'var(--mod-strategy-strong)',  href:null, subs:[] },
    { key:'pr',        label:'公關SENSE', c:'var(--mod-pr)',        strong:'var(--mod-pr-strong)',        href:'pr-sense.html',
      // 子頁尚未製作，先跳到一覽頁的對應區塊
      subs:[ { key:'directory', label:'公司名冊', href:'pr-sense.html#directory' },
             { key:'academy',   label:'近期活動', href:'pr-sense.html#academy' },
             { key:'reports',   label:'活動回顧', href:'pr-sense.html#reports' },
             { key:'clubs',     label:'俱樂部',   href:'pr-sense.html#clubs' } ] },
    { key:'finance',   label:'財務SENSE', c:'var(--mod-finance)',   strong:'var(--mod-finance-strong)',   href:null, subs:[] }
  ];

  const SECTIONS = [
    { label:'我的專屬內容', c:'#49BFBB', line:'#DBF2F1', strong:'#2E8F8B',
      links:[ '我的上架', '受眾包管理', '我的合作', '公司資料' ] },
    { label:'後台管理', c:'var(--black-400)', line:'var(--black-200)', strong:'var(--black-800)',
      links:[ '單位管理', '帳號管理', '鑰匙管理' ] }
  ];

  const USER = { name:'使用者名稱', badge:'已認證商家' };

  // header 頁籤外形（153×36）：Figma 的 left-block、中段 100px、right-block 合成一條路徑，
  // 外框 2px 向外描（stroke 4 + paint-order），陰影為 y+2、y+4 的 #EEE
  const TAB_PATH = 'M7.30 3.13C7.71 1.30 9.33 0 11.20 0H148.01C150.57 0 152.47 2.37 151.92 4.87L145.70 32.87C145.29 34.70 143.67 36 141.79 36H4.98C2.42 36 .52 33.63 1.08 31.13Z';

  /* ── 展開狀態：可同時展開多個；記在 localStorage（失敗時就只用預設） ── */
  const STORE_KEY = 'sense.navOpen';
  function loadOpen(current){
    try { const v = JSON.parse(localStorage.getItem(STORE_KEY)); if (Array.isArray(v)) return new Set(v.concat(current)); } catch(e){}
    return new Set([current]);
  }
  function saveOpen(set){ try { localStorage.setItem(STORE_KEY, JSON.stringify([...set])); } catch(e){} }

  /* ── Toast ── */
  let toastTimer;
  function toast(msg){
    let el = document.getElementById('toast');
    if (!el){ el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role','status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  const notYet = (what) => toast(`「${what}」尚未製作，之後補上`);

  /* ── Render ── */
  function renderSidebar(app, open){
    const mod = app.dataset.module, page = app.dataset.page;
    let h = `
      <div class="sb-card">
        <a class="sb-logo" href="../index.html" aria-label="SENSE 原型首頁">
          <img class="sb-logotype" src="${A('sense-logotype.svg')}" alt="SENSE">
        </a>
        <button class="sb-cta" data-todo="找商務合作">
          <img class="cta-bg" src="${A('cta-white-bg.svg')}" alt="">
          <img class="cta-line" src="${A('cta-white-line.svg')}" alt="">
          <span class="cta-icon"><span><img src="${A('ic-ionic.svg')}" alt=""></span></span>
          <span class="cta-text">找商務合作</span>
        </button>`;

    MODULES.forEach(m => {
      const hasSubs = SHOW_SUBS && m.subs.length;
      const isOpen = hasSubs && open.has(m.key);
      const isCur = m.key === mod;
      const label = m.href
        ? `<a class="sb-mod-label" href="${m.href}"${isCur && page === 'home' ? ' aria-current="page"' : ''}>${m.label}</a>`
        : `<button class="sb-mod-label" data-todo="${m.label}">${m.label}</button>`;
      const chev = !SHOW_SUBS ? ''
        : m.subs.length
        ? `<button class="sb-chev" data-toggle="${m.key}" aria-expanded="${!!isOpen}" aria-controls="sub-${m.key}" aria-label="${isOpen?'收合':'展開'} ${m.label}">
             <img src="${A(isOpen ? 'ic-chevron-up.svg' : 'ic-chevron-down.svg')}" alt=""></button>`
        : `<button class="sb-chev" data-todo="${m.label}" aria-label="${m.label}（尚未製作）"><img src="${A('ic-chevron-down.svg')}" alt=""></button>`;
      h += `
        <div class="sb-mod${isCur ? ' is-current' : ''}" style="--c:${m.c};--strong:${m.strong}">
          <div class="sb-mod-head"><span class="sb-blocker"></span>${label}${chev}</div>
          ${hasSubs ? `<div class="sb-sub" id="sub-${m.key}"${isOpen ? '' : ' hidden'}>
            ${m.subs.map(s => {
              const active = isCur && s.key === page;
              return s.href
                ? `<a class="sb-sub-item${active ? ' active' : ''}" href="${s.href}"${active ? ' aria-current="page"' : ''}><span>${s.label}</span></a>`
                : `<button class="sb-sub-item" data-todo="${s.label}"><span>${s.label}</span></button>`;
            }).join('')}
          </div>` : ''}
        </div>`;
    });

    SECTIONS.forEach(s => {
      h += `<div class="sb-sec" style="--c:${s.c}"><span>${s.label}</span><img src="${A('nav-group-mask.svg')}" alt=""></div>`;
      s.links.forEach(l => { h += `<button class="sb-link" style="--line:${s.line};--strong:${s.strong}" data-todo="${l}">${l}</button>`; });
    });
    h += `</div>
      <div class="sb-user">
        <div class="sb-user-info"><span class="sb-user-name">${USER.name}</span><span class="sb-badge">${USER.badge}</span></div>
        <button class="sb-logout" data-todo="登出">登出</button>
      </div>`;
    document.getElementById('sidebar').innerHTML = h;
  }

  function renderHeader(app){
    const m = MODULES.find(x => x.key === app.dataset.module);
    // 規則：點 header 的模組頁籤一律回到該模組入口頁（模組沒有入口頁時不可點）
    const home = m && m.href;
    const tabTag = home ? 'a' : 'div';
    const tabAttr = home ? ` href="${home}" aria-label="回到${m.label}入口頁"` : '';
    document.getElementById('header').innerHTML = `<div class="header-inner">
      <button class="hamburger" data-nav-toggle aria-label="開啟選單" aria-controls="sidebar" aria-expanded="false">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
      </button>
      <${tabTag} class="title-tab"${tabAttr}>
        <svg class="tab-shape" viewBox="-2 -2 157 44" aria-hidden="true">
          <path class="shadow" d="${TAB_PATH}" transform="translate(0 4)"/>
          <path class="shadow" d="${TAB_PATH}" transform="translate(0 2)"/>
          <path class="body" d="${TAB_PATH}"/>
        </svg>
        <span class="tab-text">${m ? m.label : 'SENSE'}</span>
      </${tabTag}>
      <span class="header-spacer"></span>
      <button class="icon-btn" data-toast="目前沒有新通知" aria-label="通知"><img src="${A('ic-bell.svg')}" alt=""></button></div>`;
  }

  function mount(){
    const app = document.querySelector('.app');
    const open = loadOpen(app.dataset.module);
    renderSidebar(app, open);
    renderHeader(app);

    if (!document.querySelector('.backdrop')){
      const bd = document.createElement('div'); bd.className = 'backdrop'; bd.dataset.navToggle = ''; app.appendChild(bd);
    }

    app.addEventListener('click', (e) => {
      // 手機抽屜：點側欄連結（含同頁錨點）後收起
      if (e.target.closest('.sidebar a')) app.classList.remove('nav-open');
      const t = e.target.closest('[data-toggle],[data-todo],[data-toast],[data-nav-toggle]');
      if (!t) return;
      if (t.dataset.toggle){
        const k = t.dataset.toggle;
        open.has(k) ? open.delete(k) : open.add(k);
        saveOpen(open); renderSidebar(app, open);
        document.querySelector(`[data-toggle="${k}"]`).focus();
      } else if (t.dataset.todo){
        notYet(t.dataset.todo);
      } else if (t.dataset.toast){
        toast(t.dataset.toast);
      } else if ('navToggle' in t.dataset){
        const on = app.classList.toggle('nav-open');
        const hb = document.querySelector('.hamburger'); if (hb) hb.setAttribute('aria-expanded', on);
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') app.classList.remove('nav-open'); });
  }

  window.SenseShell = { mount, toast, notYet, asset:A };
})();
