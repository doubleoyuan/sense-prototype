/* SENSE 共用 AppShell：側欄＋header（header 左側為麵包屑，內容區不再放麵包屑）。
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

  // 側欄模組暫不提供下拉子選單（2026-10-19）；改回 true 即恢復展開箭頭與子選單。
  // 個別模組可用 showSubs:true 單獨開啟
  const SHOW_SUBS = false;
  const subsOn = (m) => SHOW_SUBS || !!m.showSubs;

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
    // 財務 SENSE 先試開子選單（2026-10-26）。單頁切換（#hash），roles 依示範視角顯示
    { key:'finance',   label:'財務SENSE', c:'var(--mod-finance)',   strong:'var(--mod-finance-strong)',   href:'finance-sense.html', showSubs:true,
      subs:[ { key:'browse',    label:'瀏覽投資',   href:'finance-sense.html#browse' },
             { key:'investors', label:'瀏覽投資人', href:'finance-sense.html#investors' },
             { key:'profile',   label:'我的檔案',   href:'finance-sense.html#profile' },
             { key:'views',     label:'誰看過我',   href:'finance-sense.html#views',     roles:['company'] },
             { key:'requests',  label:'連結請求',   href:'finance-sense.html#requests',  roles:['company'] },
             { key:'links',     label:'我的連結',   href:'finance-sense.html#links',     roles:['investor'] },
             { key:'roomadmin', label:'資料室',     href:'finance-sense.html#roomadmin', roles:['company'] },
             { key:'messages',  label:'訊息',       href:'finance-sense.html#messages' },
             { key:'financing', label:'融資服務',   href:'finance-sense.html#financing' },
             { key:'ma',        label:'併購顧問',   href:'finance-sense.html#ma' } ] }
  ];

  const SECTIONS = [
    { label:'我的專屬內容', c:'#49BFBB', line:'#DBF2F1', strong:'#2E8F8B',
      links:[ '我的上架', '受眾包管理', '我的合作', '公司資料' ] },
    { label:'後台管理', c:'var(--black-400)', line:'var(--black-200)', strong:'var(--black-800)',
      links:[ '單位管理', '帳號管理', '鑰匙管理' ] }
  ];

  const USER = { name:'使用者名稱', badge:'已認證商家' };

  // 麵包屑根層「SENSE」連到後台首頁；首頁尚未製作，決定網址後填入（null 時點了提示尚未製作）
  const ROOT_HREF = null;

  const CHEVRON_LEFT = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>';

  /* ── 展開狀態：可同時展開多個；記在 localStorage（失敗時就只用預設） ── */
  const STORE_KEY = 'sense.navOpen';
  function loadOpen(current){
    try { const v = JSON.parse(localStorage.getItem(STORE_KEY)); if (Array.isArray(v)) return new Set(v.concat(current)); } catch(e){}
    return new Set([current]);
  }
  function saveOpen(set){ try { localStorage.setItem(STORE_KEY, JSON.stringify([...set])); } catch(e){} }

  /* ── 側欄收合（桌機）：記在 localStorage，換頁維持；預設展開 ── */
  const COLLAPSE_KEY = 'sense.navCollapsed';
  function loadCollapsed(){ try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch(e){ return false; } }
  function saveCollapsed(on){ try { localStorage.setItem(COLLAPSE_KEY, on ? '1' : '0'); } catch(e){} }
  let animTimer;

  /* 收合／展開鈕的箭頭（Figma 4127:357、4127:716）。直接內嵌 SVG：用 CSS 遮罩套圖檔時，
     直接開本機檔案（file://）會被瀏覽器擋掉而整個看不見 */
  const SB_CHEVRON = { left:'M7.20052 7.99987L9.80052 10.5999C9.92274 10.7221 9.98385 10.8776 9.98385 11.0665C9.98385 11.2554 9.92274 11.411 9.80052 11.5332C9.6783 11.6554 9.52274 11.7165 9.33385 11.7165C9.14497 11.7165 8.98941 11.6554 8.86719 11.5332L5.80052 8.46654C5.73385 8.39987 5.68663 8.32765 5.65885 8.24987C5.63108 8.17209 5.61719 8.08876 5.61719 7.99987C5.61719 7.91098 5.63108 7.82765 5.65885 7.74987C5.68663 7.67209 5.73385 7.59987 5.80052 7.5332L8.86719 4.46654C8.98941 4.34431 9.14497 4.2832 9.33385 4.2832C9.52274 4.2832 9.6783 4.34431 9.80052 4.46654C9.92274 4.58876 9.98385 4.74431 9.98385 4.9332C9.98385 5.12209 9.92274 5.27765 9.80052 5.39987L7.20052 7.99987Z', right:'M8.40052 7.99987L5.80052 5.39987C5.6783 5.27765 5.61719 5.12209 5.61719 4.9332C5.61719 4.74431 5.6783 4.58876 5.80052 4.46654C5.92274 4.34431 6.0783 4.2832 6.26719 4.2832C6.45608 4.2832 6.61163 4.34431 6.73385 4.46654L9.80052 7.5332C9.86719 7.59987 9.91441 7.67209 9.94219 7.74987C9.96997 7.82765 9.98385 7.91098 9.98385 7.99987C9.98385 8.08876 9.96997 8.17209 9.94219 8.24987C9.91441 8.32765 9.86719 8.39987 9.80052 8.46654L6.73385 11.5332C6.61163 11.6554 6.45608 11.7165 6.26719 11.7165C6.0783 11.7165 5.92274 11.6554 5.80052 11.5332C5.6783 11.411 5.61719 11.2554 5.61719 11.0665C5.61719 10.8776 5.6783 10.7221 5.80052 10.5999L8.40052 7.99987Z' };
  function sbChevron(dir){
    return `<svg class="sb-collapse-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="${SB_CHEVRON[dir]}"/></svg>`;
  }

  /* ── Toast ── */
  let toastTimer;
  function toast(msg){
    let el = document.getElementById('toast');
    if (!el){ el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role','status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  const notYet = (what) => toast(`「${what}」尚未製作，之後補上`);

  /* 子選單可依角色顯示：子項目帶 roles:['company'] 時，只有 .app 的 data-role（空白分隔）含該角色才顯示 */
  function visibleSubs(app, m){
    const roles = (app.dataset.role || '').split(' ').filter(Boolean);
    return m.subs.filter(s => !s.roles || !roles.length || s.roles.some(r => roles.includes(r)));
  }

  /* ── Render ── */
  function renderSidebar(app, open){
    const mod = app.dataset.module, page = app.dataset.page;
    // 收合時只剩窄欄：標誌（回首頁）＋展開鈕（Figma 4127:537）
    let h = `
      <div class="sb-rail">
        <a class="sb-rail-logo" href="../index.html" aria-label="SENSE 原型首頁"><img src="${A('logo.svg')}" alt=""></a>
        <button class="sb-expand" data-collapse aria-label="展開側欄" title="展開側欄" aria-controls="sidebar" aria-expanded="false">
          ${sbChevron('right')}
        </button>
      </div>
      <div class="sb-card">
        <a class="sb-logo" href="../index.html" aria-label="SENSE 原型首頁">
          <img class="sb-logotype" src="${A('sense-logotype.svg')}" alt="SENSE">
        </a>
        <button class="sb-collapse" data-collapse aria-label="收合側欄" title="收合側欄" aria-controls="sidebar" aria-expanded="true">
          ${sbChevron('left')}
        </button>
        <button class="sb-cta" data-todo="找商務合作">
          <img class="cta-bg" src="${A('cta-white-bg.svg')}" alt="">
          <img class="cta-line" src="${A('cta-white-line.svg')}" alt="">
          <span class="cta-icon"><span><img src="${A('ic-ionic.svg')}" alt=""></span></span>
          <span class="cta-text">找商務合作</span>
        </button>`;

    MODULES.forEach(m => {
      const hasSubs = subsOn(m) && m.subs.length;
      const isOpen = hasSubs && open.has(m.key);
      const isCur = m.key === mod;
      const label = m.href
        ? `<a class="sb-mod-label" href="${m.href}"${isCur && page === 'home' ? ' aria-current="page"' : ''}>${m.label}</a>`
        : `<button class="sb-mod-label" data-todo="${m.label}">${m.label}</button>`;
      const chev = !subsOn(m) ? ''
        : m.subs.length
        ? `<button class="sb-chev" data-toggle="${m.key}" aria-expanded="${!!isOpen}" aria-controls="sub-${m.key}" aria-label="${isOpen?'收合':'展開'} ${m.label}">
             <img src="${A(isOpen ? 'ic-chevron-up.svg' : 'ic-chevron-down.svg')}" alt=""></button>`
        : `<button class="sb-chev" data-todo="${m.label}" aria-label="${m.label}（尚未製作）"><img src="${A('ic-chevron-down.svg')}" alt=""></button>`;
      h += `
        <div class="sb-mod${isCur ? ' is-current' : ''}" style="--c:${m.c};--strong:${m.strong}">
          <div class="sb-mod-head"><span class="sb-blocker"></span>${label}${chev}</div>
          ${hasSubs ? `<div class="sb-sub" id="sub-${m.key}"${isOpen ? '' : ' hidden'}>
            ${visibleSubs(app, m).map(s => {
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

  /* 麵包屑：SENSE / 模組 / 子頁。入口頁到模組為止；子頁名稱取自 subs，
     不在 subs 裡的子頁可在 .app 加 data-crumb="頁面名稱" */
  function crumbs(app){
    const m = MODULES.find(x => x.key === app.dataset.module);
    const list = [ { label:'SENSE', href:ROOT_HREF, todo:'後台首頁' } ];
    if (!m) return list;
    list.push({ label:m.label, href:m.href, todo:m.label });
    const page = app.dataset.page;
    if (page && page !== 'home'){
      const sub = m.subs.find(s => s.key === page);
      list.push({ label:app.dataset.crumb || (sub ? sub.label : page) });
    }
    return list;
  }

  function renderBreadcrumb(app){
    const list = crumbs(app);
    const last = list.length - 1;
    const items = list.map((c, i) => {
      if (i === last) return `<li aria-current="page">${c.label}</li>`;
      return c.href
        ? `<li><a href="${c.href}">${c.label}</a></li>`
        : `<li><a href="#" data-todo="${c.todo}">${c.label}</a></li>`;
    }).join('');
    // 手機只顯示「‹ 上一層」；入口頁的上一層是 SENSE 根層，改為只顯示目前模組名稱
    const parent = last >= 2 ? list[last - 1] : null;
    const back = parent
      ? `<a class="breadcrumb-back" href="${parent.href || '#'}"${parent.href ? '' : ` data-todo="${parent.todo}"`} aria-label="回到${parent.label}">${CHEVRON_LEFT}${parent.label}</a>`
      : '';
    return `<nav class="breadcrumb${parent ? ' is-deep' : ''}" aria-label="麵包屑"><ol>${items}</ol>${back}</nav>`;
  }

  function renderHeader(app){
    document.getElementById('header').innerHTML = `<div class="header-inner">
      <button class="hamburger" data-nav-toggle aria-label="開啟選單" aria-controls="sidebar" aria-expanded="false">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
      </button>
      ${renderBreadcrumb(app)}
      <span class="header-spacer"></span>
      <button class="icon-btn" data-toast="目前沒有新通知" aria-label="通知"><img src="${A('ic-bell.svg')}" alt=""></button></div>`;
  }

  let mounted = null;   // { app, open }：refresh() 用
  /* 單頁切換子頁（改了 .app 的 data-page／data-crumb／data-role）後呼叫，重畫側欄與麵包屑 */
  function refresh(){
    if (!mounted) return;
    renderSidebar(mounted.app, mounted.open);
    renderHeader(mounted.app);
  }

  function mount(){
    const app = document.querySelector('.app');
    const open = loadOpen(app.dataset.module);
    mounted = { app, open };
    app.classList.toggle('nav-collapsed', loadCollapsed());
    renderSidebar(app, open);
    renderHeader(app);

    if (!document.querySelector('.backdrop')){
      const bd = document.createElement('div'); bd.className = 'backdrop'; bd.dataset.navToggle = ''; app.appendChild(bd);
    }

    app.addEventListener('click', (e) => {
      // 手機抽屜：點側欄連結（含同頁錨點）後收起
      if (e.target.closest('.sidebar a')) app.classList.remove('nav-open');
      const t = e.target.closest('[data-toggle],[data-todo],[data-toast],[data-nav-toggle],[data-collapse]');
      if (!t) return;
      if ('collapse' in t.dataset){
        app.classList.add('nav-anim');
        clearTimeout(animTimer); animTimer = setTimeout(() => app.classList.remove('nav-anim'), 250);
        const on = app.classList.toggle('nav-collapsed');
        saveCollapsed(on);
        // 用鍵盤按的（click 的 detail 為 0）才把焦點移到另一顆鈕，可以直接再按回來；滑鼠點擊不移，避免出現焦點框
        if (e.detail === 0) document.querySelector(on ? '.sb-expand' : '.sb-collapse').focus();
      } else if (t.dataset.toggle){
        const k = t.dataset.toggle;
        open.has(k) ? open.delete(k) : open.add(k);
        saveOpen(open); renderSidebar(app, open);
        document.querySelector(`[data-toggle="${k}"]`).focus();
      } else if (t.dataset.todo){
        e.preventDefault();  // 尚未製作的連結（href="#"）不要跳回頁首
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

  window.SenseShell = { mount, refresh, toast, notYet, asset:A };
})();
