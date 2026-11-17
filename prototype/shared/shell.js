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
    { key:'marketing', label:'行銷SENSE', c:'var(--mod-marketing)', strong:'var(--mod-marketing-strong)', href:'marketing-sense.html',
      subs:[ { key:'browse', label:'瀏覽受眾包', href:'marketing-sense.html#browse' } ] },
    { key:'strategy',  label:'策略SENSE', c:'var(--mod-strategy)',  strong:'var(--mod-strategy-strong)',  href:'strategy-sense.html',
      subs:[ { key:'browse', label:'瀏覽策略', href:'strategy-sense.html#browse' } ] },
    { key:'exchange',  label:'兌換SENSE', c:'var(--mod-exchange)',  strong:'var(--mod-exchange-strong)',  href:'exchange-sense.html',
      subs:[ { key:'cases', label:'瀏覽案例', href:'exchange-sense.html#cases' }, { key:'products', label:'瀏覽票券商品', href:'exchange-sense.html#products' } ] },
    { key:'points',    label:'點數SENSE', c:'var(--mod-points)',    strong:'var(--mod-points-strong)',    href:'points-sense.html',
      subs:[ { key:'browse', label:'瀏覽企業', href:'points-sense.html#browse' } ] },
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
      // 連結可寫成字串（尚未製作）或 { key, label, href }；頁面 data-module="mine" 且 data-page 等於 key 時標示目前位置
      links:[ '我的上架', '受眾包管理', '我的合作', { key:'company', label:'公司資料', href:'company-details.html' } ] },
    { label:'代管單位內容', c:'#49BFBB', line:'#DBF2F1', strong:'#2E8F8B',
      links:[ '上架管理', '受眾包管理', '合作管理', '帳戶與結算', '公司資料', '成員與角色' ] },
    { label:'後台管理', c:'var(--black-400)', line:'var(--black-200)', strong:'var(--black-800)',
      links:[ '單位管理', '商家帳號', '平台人員', '平台角色', '權限目錄', '鑰匙管理', '提領查帳' ] }
  ];

  const USER = { name:'使用者名稱', badge:'已認證商家' };

  // 麵包屑根層「SENSE」連到後台首頁；首頁尚未製作，決定網址後填入（null 時點了提示尚未製作）
  const ROOT_HREF = null;

  /* ── 通知（2026-11-17）：header 鈴鐺展開下拉預覽，「查看全部」到 notifications.html。
     本階段不含財務、公關。level：action 需處理／progress 進度／system 系統／announce 公告；
     time 為相對時間（m 分、h 小時、d 天）；day 為舊版分組欄位，目前未使用。read:true 為示範的預設已讀；
     使用者點過的 id 記在 localStorage（失敗時只用預設）。
     行銷事件為推測，待確認實際流程。
     已讀規則（2026-11-17 使用者確認，C＋D 混合）：
     - 看過（seen）：打開鈴鐺下拉或進到通知中心頁，鈴鐺數字歸零；數字只算之後的新通知。
     - 已讀（read）：點了那則通知，淡藍底消失。（「全部標為已讀」2026-11-17 使用者要求先刪除）
     - 完成（resolved）：需處理通知要等事情處理完才結束，未完成前固定排在最上面；
       點擊不會讓它完成。完成由各模組流程呼叫 SenseShell.notify.resolve(id)；
       目前各模組頁還沒有可完成的流程（點數頁內頁暫時一律顯示已開通），所以原型裡需處理通知會一直置頂 ── */
  const NOTIFY_LEVELS = { action:'需處理', progress:'進度', system:'系統', announce:'公告' };
  // 通知左側 icon：模組用 2026-11-12 選定的細線 icon（assets/mod-*.svg）；不屬於模組的來源（公司資料、平台）
  // 共用同風格的通知 icon（assets/ic-notify.svg，2026-11-17）
  const NOTIFY_SOURCES = { mine:{ label:'公司資料', icon:'ic-notify.svg' }, system:{ label:'SENSE 平台', icon:'ic-notify.svg' } };
  const NOTIFS = [
    { id:'n1',  src:'points',    level:'action',   day:'today',   time:'10m',
      title:'拾光百貨邀請你開通雙向點數交換', desc:'比例依雙方點數兌台幣比值自動換算，同意後即可開始交換。', cta:'前往處理', href:'points-sense.html#co=c5' },
    { id:'n2',  src:'product',   level:'action',   day:'today',   time:'5h',
      title:'商品「手沖咖啡體驗組」審核未通過', desc:'商品主圖解析度不足，請修改後重新送出審核。', cta:'修改後重送', href:'product-sense-add-product.html' },
    { id:'n3',  src:'mine',      level:'action',   day:'today',   time:'6h',
      title:'公司資料還有 2 個欄位未填寫', desc:'尚未填寫：公司簡介、退貨地址。', cta:'前往補齊', href:'company-details.html' },
    { id:'n4',  src:'strategy',  level:'progress', day:'today',   time:'7h',
      title:'媒合預估已完成', desc:'預估交集人數已更新，可以查看結果。', cta:'查看結果', href:'strategy-sense.html#browse' },
    { id:'n5',  src:'product',   level:'progress', day:'week',    time:'1d', read:true,
      title:'商品「冬季保暖禮盒」已通過審核並上架', desc:'合作夥伴現在可以在瀏覽商品看到這項商品。', cta:'查看商品', href:'product-sense.html#browse' },
    { id:'n6',  src:'exchange',  level:'progress', day:'week',    time:'1d', read:true,
      title:'兌換平台申請已受理', desc:'專人將與你聯繫，洽談 SSO 與點數串接細節。', cta:'查看申請', href:'exchange-sense.html' },
    { id:'n7',  src:'points',    level:'progress', day:'week',    time:'2d', read:true,
      title:'與禾豐超市的單向交換已開通', desc:'會員現在可以把點數換成禾豐超市點數。', cta:'查看交換', href:'points-sense.html#browse' },
    { id:'n8',  src:'marketing', level:'progress', day:'week',    time:'3d', read:true,
      title:'受眾包「都會通勤族｜北北基桃地區」已更新', desc:'名單人數已依最新資料重新計算。', cta:'查看受眾包', href:'marketing-sense.html#browse' },
    { id:'n9',  src:'system',    level:'system',   day:'week',    time:'4d', read:true,
      title:'新成員王小明已加入公司', desc:'可以到成員與角色調整權限。', cta:'成員與角色', todo:'成員與角色' },
    { id:'n10', src:'system',    level:'system',   day:'earlier', time:'9d', read:true,
      title:'系統維護公告：11/20（五）02:00–04:00', desc:'維護期間暫停服務，造成不便敬請見諒。' },
    { id:'n11', src:'system',    level:'announce', day:'earlier', time:'14d', read:true,
      title:'點數 SENSE 開放申請', desc:'加入後可以和其他企業直接交換點數。', cta:'了解點數 SENSE', href:'points-sense.html' }
  ];
  const NOTIFY_KEY = 'sense.notifyRead', SEEN_KEY = 'sense.notifySeen', RESOLVED_KEY = 'sense.notifyResolved';
  const NOTIFY_PREVIEW = 5;
  function loadIds(key){ try { const v = JSON.parse(localStorage.getItem(key)); if (Array.isArray(v)) return new Set(v); } catch(e){} return new Set(); }
  function saveIds(key, set){ try { localStorage.setItem(key, JSON.stringify([...set])); } catch(e){} }
  const readIds = loadIds(NOTIFY_KEY), seenIds = loadIds(SEEN_KEY), resolvedIds = loadIds(RESOLVED_KEY);
  const notifyListeners = [];
  const saveRead = () => saveIds(NOTIFY_KEY, readIds);
  const isUnread = (n) => !n.read && !readIds.has(n.id);
  const isPending = (n) => n.level === 'action' && !resolvedIds.has(n.id);
  // 未完成的需處理通知排最上面，其餘依時間（資料順序）
  const notifyItems = () => NOTIFS.filter(isPending).concat(NOTIFS.filter(n => !isPending(n)));
  const unreadCount = () => NOTIFS.filter(isUnread).length;
  // 鈴鐺數字：未讀且還沒在下拉／通知中心看過的
  const newCount = () => NOTIFS.filter(n => isUnread(n) && !seenIds.has(n.id)).length;
  function notifySource(key){
    const m = MODULES.find(x => x.key === key);
    return m ? { label:m.label, icon:`mod-${m.key}.svg` } : NOTIFY_SOURCES[key];
  }
  function changed(){ updateBell(); notifyListeners.forEach(fn => fn()); }
  function markRead(id){ if (!readIds.has(id)){ readIds.add(id); saveRead(); changed(); } }
  function markSeen(){
    if (!newCount()) return;
    NOTIFS.forEach(n => seenIds.add(n.id)); saveIds(SEEN_KEY, seenIds); changed();
  }
  // 事情處理完（由各模組頁呼叫）：通知結束置頂，也一併標為已讀
  function resolve(id){
    resolvedIds.add(id); saveIds(RESOLVED_KEY, resolvedIds);
    readIds.add(id); saveRead(); changed();
  }

  const escHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  /* 一則通知（樣式參考使用者提供的截圖，2026-11-17）：左側來源 icon（圓框）、中間內文、右上相對時間；未讀為淡藍底。
     整列可點，帶到下一步（href）；尚未製作的目的地用 data-todo；沒有目的地的只顯示內容。點了即標為已讀 */
  function notifyRow(n){
    const s = notifySource(n.src), unread = isUnread(n);
    const inner = `<span class="ntf-avatar" title="${s.label}"><img src="${A(s.icon)}" alt=""></span>
      <span class="ntf-text">${unread ? '<span class="visually-hidden">未讀：</span>' : ''}<span class="ntf-title">${escHtml(n.title)}</span>${n.desc ? `<span class="ntf-desc">${escHtml(n.desc)}</span>` : ''}</span>
      <time class="ntf-time">${escHtml(n.time)}</time>`;
    const cls = `ntf-item${unread ? ' is-unread' : ''}`;
    if (n.href) return `<a class="${cls}" href="${n.href}" data-ntf="${n.id}">${inner}</a>`;
    if (n.todo) return `<button type="button" class="${cls}" data-ntf="${n.id}" data-todo="${escHtml(n.todo)}">${inner}</button>`;
    return `<div class="${cls}" data-ntf="${n.id}">${inner}</div>`;
  }

  function bellHtml(){
    const n = newCount();
    return `<img src="${A('ic-bell.svg')}" alt="">${n ? `<span class="ntf-count">${n > 99 ? '99+' : n}</span>` : ''}`;
  }
  function panelListHtml(){
    const list = notifyItems().slice(0, NOTIFY_PREVIEW);
    return list.length ? list.map(notifyRow).join('') : '<p class="ntf-empty">目前沒有通知</p>';
  }
  function updateBell(){
    const bell = document.querySelector('.ntf-bell'); if (!bell) return;
    const n = newCount();
    bell.innerHTML = bellHtml();
    bell.setAttribute('aria-label', n ? `通知，${n} 則新通知` : '通知');
    const list = document.querySelector('.ntf-panel .ntf-list'); if (list) list.innerHTML = panelListHtml();
  }
  function setPanel(open){
    const panel = document.getElementById('ntf-panel'), bell = document.querySelector('.ntf-bell');
    if (!panel || !bell) return;
    panel.hidden = !open;
    if (open) markSeen();
    bell.setAttribute('aria-expanded', open);
    bell.classList.toggle('is-on', open);
  }

  const CHEVRON_LEFT ='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>';

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

  /* ── Toast：右上角提示（Figma 4288:883）。關閉鈕外圈 5 秒倒數（滑鼠移入時暫停），倒數完 ✕ 變 ✓ 再關閉 ── */
  const TOAST_IC = `<svg class="toast-ic" viewBox="0 0 24 28" aria-hidden="true"><ellipse cx="11.5" cy="23" rx="11.5" ry="5" fill="#EEEEEE"/>`
    + `<path d="M12 3C6.49 3 2 6.59 2 11C2 13.91 3.9 16.51 7 17.93V21C7 21.38 7.21 21.73 7.55 21.89C7.69 21.96 7.84 22 8 22C8.21 22 8.42 21.93 8.6 21.8L12.34 19C17.7 18.86 22 15.32 22 11C22 6.68 17.51 3 12 3ZM12 17C11.78 17 11.57 17.07 11.4 17.2L9 19V17.27C9 16.86 8.75 16.49 8.36 16.34C5.67 15.3 4 13.26 4 11C4 7.69 7.59 5 12 5C16.41 5 20 7.69 20 11C20 14.31 16.41 17 12 17Z" fill="#BDBDBD"/>`
    + `<circle class="dot" cx="8" cy="11" r="1" fill="#66ABF9"/><circle class="dot" cx="12" cy="11" r="1" fill="#FFD666"/><circle class="dot" cx="16" cy="11" r="1" fill="#FF904D"/></svg>`;
  const TOAST_CLOSE = `<button type="button" class="toast-close" aria-label="關閉提示"><svg viewBox="0 0 24 24" aria-hidden="true">`
    + `<circle class="track" cx="12" cy="12" r="11"/><circle class="ring" cx="12" cy="12" r="11" pathLength="100"/>`
    + `<path class="x" d="M8.5 8.5l7 7M15.5 8.5l-7 7"/><path class="ok" d="M7.5 12.3l3.1 3.1 5.9-6.3" pathLength="100"/></svg></button>`;
  let toastTimer;
  function hideToast(el){ clearTimeout(toastTimer); el.classList.remove('show', 'is-done'); }
  function toast(msg){
    let el = document.getElementById('toast');
    if (!el){
      el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status');
      el.innerHTML = TOAST_IC + '<p class="toast-msg"></p>' + TOAST_CLOSE;
      el.querySelector('.toast-close').addEventListener('click', () => hideToast(el));
      // 倒數動畫跑完（含暫停的時間）才換成 ✓，再稍等一下關閉
      el.querySelector('.ring').addEventListener('animationend', () => { el.classList.add('is-done'); toastTimer = setTimeout(() => hideToast(el), 500); });
    }
    // 對話框開著時放進對話框裡，才不會被擋在後面
    (document.querySelector('dialog[open]') || document.body).appendChild(el);
    el.querySelector('.toast-msg').textContent = msg;
    hideToast(el); void el.offsetWidth;   // 連續觸發時重新開始倒數與跳動
    el.classList.add('show');
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
        <a class="sb-cta" href="partners.html"${mod === 'partners' ? ' aria-current="page"' : ''}>
          <img class="cta-bg" src="${A('cta-white-bg.svg')}" alt="">
          <img class="cta-line" src="${A('cta-white-line.svg')}" alt="">
          <span class="cta-icon"><span><img src="${A('ic-ionic.svg')}" alt=""></span></span>
          <span class="cta-text">找商務合作</span>
        </a>`;

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
      s.links.forEach(l => {
        const st = `style="--line:${s.line};--strong:${s.strong}"`;
        if (typeof l === 'string'){ h += `<button class="sb-link" ${st} data-todo="${l}">${l}</button>`; return; }
        const active = mod === 'mine' && page === l.key;
        h += `<a class="sb-link${active ? ' active' : ''}" ${st} href="${l.href}"${active ? ' aria-current="page"' : ''}>${l.label}</a>`;
      });
    });
    h += `</div>
      <div class="sb-user">
        <div class="sb-user-info"><span class="sb-user-name">${USER.name}</span><span class="sb-badge">${USER.badge}</span></div>
        <button class="sb-logout" data-todo="登出">登出</button>
      </div>`;
    document.getElementById('sidebar').innerHTML = h;
    updateSidebarFade();
  }

  // 使用者區塊固定在側欄底部；下方還有項目沒捲到時，在它上方加一層漸層提示（.has-more）
  function updateSidebarFade(){
    const sb = document.getElementById('sidebar');
    sb.classList.toggle('has-more', sb.scrollTop + sb.clientHeight < sb.scrollHeight - 1);
  }

  /* 麵包屑：SENSE / 模組 / 子頁。入口頁到模組為止；子頁名稱取自 subs，
     不在 subs 裡的子頁可在 .app 加 data-crumb="頁面名稱" */
  function crumbs(app){
    const m = MODULES.find(x => x.key === app.dataset.module);
    const list = [ { label:'SENSE', href:ROOT_HREF, todo:'後台首頁' } ];
    // 我的專屬內容（側欄下方連結）：SENSE / 頁面名稱
    if (app.dataset.module === 'mine'){
      const l = SECTIONS[0].links.find(x => x.key === app.dataset.page);
      list.push({ label:app.dataset.crumb || (l ? l.label : app.dataset.page) });
      return list;
    }
    // 找商務合作（側欄 CTA，2026-11-17）：SENSE / 找商務合作
    if (app.dataset.module === 'partners'){ list.push({ label:'找商務合作' }); return list; }
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
      <div class="ntf-wrap">
        <button type="button" class="icon-btn ntf-bell" data-ntf-toggle aria-haspopup="true" aria-expanded="false" aria-controls="ntf-panel">${bellHtml()}</button>
        <div class="ntf-panel" id="ntf-panel" role="region" aria-label="通知預覽" hidden>
          <div class="ntf-panel-head"><b>通知</b></div>
          <div class="ntf-list">${panelListHtml()}</div>
          <a class="ntf-panel-foot" href="notifications.html">查看全部通知</a>
        </div>
      </div></div>`;
    updateBell();
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

    document.getElementById('sidebar').addEventListener('scroll', updateSidebarFade, { passive:true });
    window.addEventListener('resize', updateSidebarFade);

    if (!document.querySelector('.backdrop')){
      const bd = document.createElement('div'); bd.className = 'backdrop'; bd.dataset.navToggle = ''; app.appendChild(bd);
    }

    app.addEventListener('click', (e) => {
      // 手機抽屜：點側欄連結（含同頁錨點）後收起
      if (e.target.closest('.sidebar a')) app.classList.remove('nav-open');
      // 通知：點任一則（下拉或通知中心）先標為已讀，再照原本的連結／data-todo 走
      const item = e.target.closest('[data-ntf]');
      if (item) markRead(item.dataset.ntf);
      if (e.target.closest('[data-ntf-toggle]')){ setPanel(document.getElementById('ntf-panel').hidden); return; }
      // 下拉裡點了下一步才收起；只點列上其他地方（標為已讀）維持展開
      // 下拉裡點了可前往的通知就收起；沒有目的地的只標為已讀，維持展開（重畫後元素已不在，擋下冒泡免得被當成點在外面）
      if (item && item.closest('.ntf-panel') && item.matches('a,button')) setPanel(false);
      else if (item) e.stopPropagation();
      const t =e.target.closest('[data-toggle],[data-todo],[data-toast],[data-nav-toggle],[data-collapse]');
      if (!t) return;
      if ('collapse' in t.dataset){
        app.classList.add('nav-anim');
        clearTimeout(animTimer); animTimer = setTimeout(() => app.classList.remove('nav-anim'), 250);
        const on = app.classList.toggle('nav-collapsed');
        saveCollapsed(on);
        updateSidebarFade();
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
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      app.classList.remove('nav-open');
      const panel = document.getElementById('ntf-panel');
      if (panel && !panel.hidden){ setPanel(false); document.querySelector('.ntf-bell').focus(); }
    });
    // 點下拉以外的地方收起通知
    document.addEventListener('click', (e) => { if (!e.target.closest('.ntf-wrap')) setPanel(false); });
  }

  // 通知中心頁用：資料、分級、來源、已讀狀態與變更通知
  const notify = {
    items:notifyItems, levels:NOTIFY_LEVELS, source:notifySource, row:notifyRow,
    isUnread, isPending, unreadCount, markRead, markSeen, resolve,
    onChange:(fn) => notifyListeners.push(fn)
  };

  window.SenseShell = { mount, refresh, toast, notYet, asset:A, notify };
})();
