/* SENSE 共用元件（產生 HTML 字串＋少量互動）。需先載入 shell.js。 */
(function(){
  const A = (f) => window.SenseShell.asset(f);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* 數字縮寫：860、3.4K、12K */
  function compact(n){
    if (n < 1000) return String(n);
    const k = n / 1000;
    return (k >= 10 ? Math.round(k) : Math.round(k * 10) / 10) + 'K';
  }

  /* 公司 logo：股感用品牌標誌，其他公司用首字色塊 */
  function orgLogo(org){
    if (org.mark === 'stockfeel'){
      return `<span class="org-logo"><span class="mark"><span class="layer">
        <img class="v1" src="${A('stockfeel-mark-1.svg')}" alt=""><img class="v2" src="${A('stockfeel-mark-2.svg')}" alt=""><img class="v3" src="${A('stockfeel-mark-3.svg')}" alt="">
      </span></span></span>`;
    }
    return `<span class="org-logo"><span class="mono" style="--mono-bg:${org.color}" aria-hidden="true">${esc(org.name[0])}</span></span>`;
  }

  /* ResourceCard：主圖＋瀏覽數＋標題＋公司＋兩格指標
     metrics: [{label, value}, {label, value}] */
  function resourceCard({ id, title, image, views, org, metrics }){
    return `
      <button class="r-card" data-card="${esc(id)}" aria-label="${esc(title)}，${esc(org.name)}">
        <span class="r-card-media">
          <span class="r-card-img">${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : ''}</span>
          ${views != null ? `<span class="r-card-views" aria-label="瀏覽數 ${views}">
            <img class="fillet l" src="${A('view-shape-left.svg')}" alt="">
            <span class="tag"><img src="${A('ic-eye.svg')}" alt="">${compact(views)}</span>
            <img class="fillet r" src="${A('view-shape-right.svg')}" alt="">
            <span class="outline"><img src="${A('view-outline.svg')}" alt=""></span>
          </span>` : ''}
        </span>
        <span class="r-card-title">${esc(title)}</span>
        <span class="r-card-org">${orgLogo(org)}<span class="org-name">${esc(org.name)}</span></span>
        <span class="r-card-metrics">
          ${metrics.map(m => `<span class="metric"><small>${esc(m.label)}</small><b>${esc(m.value)}</b></span>`).join('<span class="divider"></span>')}
        </span>
      </button>`;
  }

  /* Pagination：1 2 3 4 … 20 */
  function pageList(cur, total){
    if (total <= 6) return Array.from({length:total}, (_, i) => i + 1);
    if (cur <= 3) return [1, 2, 3, 4, '…', total];
    if (cur >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
    return [1, '…', cur - 1, cur, cur + 1, '…', total];
  }
  function pagination(cur, total){
    if (total <= 1) return '';
    return `<nav class="pagination" aria-label="分頁">
      <button data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''} aria-label="上一頁"><img src="${A('ic-prev.svg')}" alt=""></button>
      ${pageList(cur, total).map(p => p === '…' ? `<span class="gap" aria-hidden="true">...</span>`
        : `<button data-page="${p}"${p === cur ? ' aria-current="page"' : ''}>${p}</button>`).join('')}
      <button data-page="${cur + 1}" ${cur === total ? 'disabled' : ''} aria-label="下一頁"><img src="${A('ic-next.svg')}" alt=""></button>
    </nav>`;
  }

  /* ListToolbar：搜尋（點開成輸入框）＋排序（下拉） */
  function listActions({ query = '', sorts, sort, placeholder = '搜尋' }){
    const open = !!query;
    return `
      <div class="search-box${open ? ' open' : ''}">
        <button class="search-toggle" data-search-toggle aria-label="搜尋" aria-expanded="${open}"><img src="${A('ic-search.svg')}" alt=""></button>
        <input type="search" data-search-input placeholder="${esc(placeholder)}" value="${esc(query)}" aria-label="${esc(placeholder)}">
        <button class="search-clear" data-search-clear aria-label="清除搜尋">×</button>
      </div>
      <div class="dropdown">
        <button class="icon-btn raised" data-sort-toggle aria-haspopup="menu" aria-expanded="false" aria-label="排序：${esc(sorts.find(s => s.key === sort).label)}">
          <img src="${A('ic-sort.svg')}" alt=""></button>
        <div class="dropdown-menu" role="menu" hidden>
          <span class="dropdown-label">排序方式</span>
          ${sorts.map(s => `<button role="menuitemradio" aria-checked="${s.key === sort}" data-sort="${s.key}">${esc(s.label)}</button>`).join('')}
        </div>
      </div>`;
  }

  /* 綁定 ListToolbar 互動；onQuery(q) 於輸入時呼叫，onSort(key) 於選擇排序時呼叫 */
  function bindListActions(root, { onQuery, onSort }){
    const box = root.querySelector('.search-box');
    const input = root.querySelector('[data-search-input]');
    const toggle = root.querySelector('[data-search-toggle]');
    const setOpen = (on) => { box.classList.toggle('open', on); toggle.setAttribute('aria-expanded', on); if (on) input.focus(); };

    toggle.addEventListener('click', () => {
      if (!box.classList.contains('open')) setOpen(true);
      else if (!input.value) setOpen(false);
      else input.focus();
    });
    input.addEventListener('input', () => onQuery(input.value.trim()));
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape'){ input.value = ''; onQuery(''); setOpen(false); toggle.focus(); } });
    input.addEventListener('blur', () => { setTimeout(() => { if (!input.value && !box.contains(document.activeElement)) setOpen(false); }, 120); });
    root.querySelector('[data-search-clear]').addEventListener('click', () => { input.value = ''; onQuery(''); input.focus(); });

    const sortBtn = root.querySelector('[data-sort-toggle]');
    const menu = root.querySelector('.dropdown-menu');
    const close = () => { menu.hidden = true; sortBtn.setAttribute('aria-expanded', 'false'); sortBtn.classList.remove('is-on'); };
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = menu.hidden;
      menu.hidden = !on; sortBtn.setAttribute('aria-expanded', on); sortBtn.classList.toggle('is-on', on);
      if (on) menu.querySelector('[aria-checked="true"]').focus();
    });
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sort]'); if (!b) return;
      menu.querySelectorAll('[data-sort]').forEach(x => x.setAttribute('aria-checked', x === b));
      sortBtn.setAttribute('aria-label', '排序：' + b.textContent);
      close(); sortBtn.focus(); onSort(b.dataset.sort);
    });
    menu.addEventListener('keydown', (e) => {
      const items = [...menu.querySelectorAll('[data-sort]')], i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown'){ e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp'){ e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape'){ close(); sortBtn.focus(); }
    });
    document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.dropdown')) close(); });
  }

  /* FilterChips */
  function chips(items, active){
    return items.map(c => `<button class="chip" data-chip="${esc(c.key)}" aria-pressed="${c.key === active}">${esc(c.label)}</button>`).join('');
  }

  /* TicketHero 內框線：沿票券外形（四角內凹圓弧＋撕線兩端的 V 形缺口）往內縮 --ticket-line-inset 描一條白線。
     依實際尺寸計算，尺寸改變或手機版拿掉撕線時自動重畫；用 offset 量測，票券之後若加上 transform 也不受影響。 */
  const TICKET = { r:20, notchA:7.28, notchB:7.64 };  // 依 Figma：角半徑 20、缺口深度（上 7.28、下 7.64）
  function ticketPath(W, H, nx, d){
    const { r } = TICKET, R = r + d, a = Math.sqrt(R * R - d * d), k = d * Math.SQRT2;
    const f = (n) => +n.toFixed(2);
    const arc = (x, y) => `A${f(R)} ${f(R)} 0 0 0 ${f(x)} ${f(y)}`;
    const wA = TICKET.notchA + k - d, wB = TICKET.notchB + k - d;
    let p = `M${f(a)} ${f(d)}`;
    if (nx != null) p += `H${f(nx - wA)}L${f(nx)} ${f(TICKET.notchA + k)}L${f(nx + wA)} ${f(d)}`;
    p += `H${f(W - a)}` + arc(W - d, a);
    p += `V${f(H - a)}` + arc(W - a, H - d);
    if (nx != null) p += `H${f(nx + wB)}L${f(nx)} ${f(H - TICKET.notchB - k)}L${f(nx - wB)} ${f(H - d)}`;
    p += `H${f(a)}` + arc(d, H - a);
    p += `V${f(a)}` + arc(a, d) + 'Z';
    return p;
  }
  function ticketLine(ticket){
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ticket-line'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(path); ticket.appendChild(svg);
    const draw = () => {
      const W = ticket.offsetWidth, H = ticket.offsetHeight, perf = ticket.querySelector('.ticket-perf');
      const d = parseFloat(getComputedStyle(ticket).getPropertyValue('--ticket-line-inset')) || 8;
      const nx = perf && perf.offsetParent ? perf.offsetLeft + perf.offsetWidth / 2 : null;  // 撕線的 x
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      path.setAttribute('d', ticketPath(W, H, nx, d));
    };
    new ResizeObserver(draw).observe(ticket);
    draw();
  }
  document.querySelectorAll('.ticket').forEach(ticketLine);

  /* 關閉票券：淡出並收合（連同下方的區塊間距），之後焦點移到同區塊的主要按鈕 */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.ticket-close'); if (!btn) return;
    const ticket = btn.closest('.ticket'), section = ticket.parentElement;
    const gap = parseFloat(getComputedStyle(section).rowGap) || 0;
    const done = () => {
      ticket.hidden = true;
      // 優先移到同區塊的主要按鈕；沒有的話找票券以外第一個可聚焦元素
      const next = section.querySelector('.cta-btn') || [...section.querySelectorAll('button, a[href]')].find(el => !ticket.contains(el));
      if (next) next.focus({ preventScroll:true });
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
    ticket.style.overflow = 'hidden';
    ticket.animate([
      { opacity:1, height:ticket.offsetHeight + 'px', marginBottom:'0px' },
      { opacity:0, height:'0px', marginBottom:-gap + 'px' }
    ], { duration:260, easing:'cubic-bezier(.4,0,.2,1)' }).onfinish = done;
  });

  window.SenseUI = { esc, compact, orgLogo, resourceCard, pagination, listActions, bindListActions, chips, ticketLine };
})();
