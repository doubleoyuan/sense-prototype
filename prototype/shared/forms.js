/* SENSE 表單互動（暫定）：重複列、圖片上傳、欄位錯誤。純前端示意，不送出任何資料。 */
(function(){
  const X_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

  /* 欄位錯誤：field 為 .field 容器 */
  function setError(field, msg){
    field.classList.add('has-error');
    let el = field.querySelector('.field-error');
    if (!el){ el = document.createElement('p'); el.className = 'field-error'; el.id = (field.id || 'f' + Math.random().toString(36).slice(2)) + '-err'; field.appendChild(el); }
    el.textContent = msg;
    field.querySelectorAll('input,textarea').forEach(i => {
      i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', el.id);
      if (!i.value.trim()) i.classList.add('is-invalid');   // 只把空白的格子標紅
    });
  }
  function clearError(field){
    field.classList.remove('has-error');
    field.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
    field.querySelectorAll('.is-invalid').forEach(i => i.classList.remove('is-invalid'));
  }

  /* 重複列：rowHTML(i) 回傳一列的 HTML（列內移除鈕需帶 data-remove）。
     至少保留 min 列；到 max 列時停用新增鈕。 */
  function repeater(list, addBtn, rowHTML, { min = 1, max = 20, initial = 1, onChange } = {}){
    let seq = 0;
    const rows = () => [...list.children];
    const sync = () => {
      addBtn.disabled = rows().length >= max;
      rows().forEach(r => { const b = r.querySelector('[data-remove]'); if (b) b.hidden = rows().length <= min; });
      if (onChange) onChange();
    };
    const add = (focus) => {
      list.insertAdjacentHTML('beforeend', rowHTML(seq++));
      sync();
      if (focus) { const f = list.lastElementChild.querySelector('input,textarea'); if (f) f.focus(); }
    };
    addBtn.addEventListener('click', () => add(true));
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]'); if (!b) return;
      const row = b.closest('.rep-row, .sku-row'), next = row.nextElementSibling || row.previousElementSibling;
      row.remove(); sync();
      (next && next.querySelector('input') || addBtn).focus();
    });
    for (let i = 0; i < initial; i++) add(false);
    return { rows, add };
  }

  /* 圖片上傳（依 Figma 4042:1285）：大預覽框顯示封面＋檔案路徑＋「選擇檔案」。
     多張時下方出現縮圖列，點縮圖設為封面、右上角移除。可拖放到預覽框。限制格式、大小、張數。 */
  function upload(root, { max = 6, maxMB = 5, types = ['image/jpeg', 'image/png', 'image/webp'], placeholder, onChange, onReject } = {}){
    const files = [];
    root.innerHTML = `
      <div class="upload-preview" data-preview></div>
      <div class="upload-thumbs" data-thumbs></div>
      <div class="upload-bar">
        <div class="upload-path" data-path aria-live="polite">檔案路徑</div>
        <button type="button" class="btn-outline" data-pick>選擇檔案</button>
      </div>`;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = types.join(','); input.multiple = true; input.hidden = true;
    root.appendChild(input);
    const $ = (sel) => root.querySelector(sel);
    const esc = (t) => t.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

    const render = () => {
      const pv = $('[data-preview]');
      pv.classList.toggle('has-image', files.length > 0);
      pv.innerHTML = files.length
        ? `<img class="cover-img" src="${files[0].url}" alt="封面：${esc(files[0].name)}"><span class="cover-tag">封面</span>`
        : `<img class="placeholder" src="${placeholder}" alt="">`;
      $('[data-thumbs]').innerHTML = files.length > 1 ? files.map((f, i) => `
        <div class="upload-thumb${i === 0 ? ' is-cover' : ''}">
          <img src="${f.url}" alt="">
          <button type="button" class="set-cover" data-cover="${i}" aria-label="把 ${esc(f.name)} 設為封面"${i === 0 ? ' aria-pressed="true"' : ''}></button>
          <button type="button" class="remove" data-remove-img="${i}" aria-label="移除 ${esc(f.name)}">${X_ICON}</button>
        </div>`).join('') : '';
      const path = $('[data-path]');
      path.classList.toggle('filled', files.length > 0);
      path.textContent = files.length ? (files.length === 1 ? files[0].name : `已選 ${files.length} 張：${files.map(f => f.name).join('、')}`) : '檔案路徑';
      const pick = $('[data-pick]');
      pick.disabled = files.length >= max;
      pick.textContent = files.length >= max ? `已達 ${max} 張` : (files.length ? '再加圖片' : '選擇檔案');
      if (onChange) onChange(files.length);
    };
    const addFiles = (list) => {
      const rejected = [];
      [...list].forEach(f => {
        if (files.length >= max) rejected.push(`${f.name}：超過 ${max} 張上限`);
        else if (!types.includes(f.type)) rejected.push(`${f.name}：格式需為 JPG、PNG 或 WebP`);
        else if (f.size > maxMB * 1024 * 1024) rejected.push(`${f.name}：超過 ${maxMB}MB`);
        else files.push({ name:f.name, url:URL.createObjectURL(f) });
      });
      render();
      if (rejected.length && onReject) onReject(rejected);
    };

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-pick]')) input.click();
      const c = e.target.closest('[data-cover]');
      if (c){ const [f] = files.splice(+c.dataset.cover, 1); files.unshift(f); render(); }
      const r = e.target.closest('[data-remove-img]');
      if (r){ const [gone] = files.splice(+r.dataset.removeImg, 1); URL.revokeObjectURL(gone.url); render(); $('[data-pick]').focus(); }
    });
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    const pv = () => $('[data-preview]');
    root.addEventListener('dragover', (e) => { e.preventDefault(); pv().classList.add('dragover'); });
    root.addEventListener('dragleave', () => pv().classList.remove('dragover'));
    root.addEventListener('drop', (e) => { e.preventDefault(); pv().classList.remove('dragover'); addFiles(e.dataTransfer.files); });
    render();
    return {
      count: () => files.length,
      list: () => files.map(f => ({ name:f.name, url:f.url })),           // 唯讀確認頁用
      addUrl: (name, url) => { if (files.length < max){ files.push({ name, url }); render(); } }   // 示意資料用
    };
  }

  // 步驟數字的平行四邊形（取自 Figma 素材 step-block.svg，47.76×40）
  const STEP_PATH = 'M8.1214 3.02985C8.56657 1.24919 10.1665 0 12.002 0H43.7558C46.358 0 48.2675 2.44556 47.6363 4.97014L39.6363 36.9701C39.1912 38.7508 37.5912 40 35.7558 40H4.00197C1.39969 40 -.509746 37.5544 .1214 35.0299L8.1214 3.02985Z';

  /* 步驟條：steps 為 [{label}]，current 從 1 起算；已完成的步驟可點擊回去（onGo） */
  function stepper(el, steps, current, { onGo, check } = {}){
    el.innerHTML = steps.map((s, i) => {
      const n = i + 1, done = n < current, cur = n === current;
      const inner = `<span class="step-num"><svg class="step-shape" viewBox="0 0 47.7577 40" aria-hidden="true"><path d="${STEP_PATH}"/></svg><span class="n">${n}</span>${done ? `<span class="step-check"><img src="${check}" alt=""></span>` : ''}</span><span class="step-label">${s.label}</span>`;
      const line = i < steps.length - 1 ? '<li class="step-line" aria-hidden="true"></li>' : '';
      return (done
        ? `<li><button type="button" class="step done" data-go="${n}" aria-label="第 ${n} 步：${s.label}（已完成，點擊返回）">${inner}</button></li>`
        : `<li class="step"${cur ? ' aria-current="step"' : ''}>${inner}</li>`) + line;
    }).join('');
    if (onGo && !el._bound){ el._bound = true; el.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) onGo(+b.dataset.go); }); }
  }

  /* 分段標籤：點擊平滑捲到對應卡片；捲動時自動標示目前所在的分段；停在頂端時加上 is-stuck */
  function sectionTabs(nav){
    const tabs = [...nav.querySelectorAll('a[href^="#"]')];
    const cards = tabs.map(t => document.querySelector(t.getAttribute('href')));
    let lock = 0;   // 點擊後平滑捲動期間，暫停自動標示，避免標籤跳來跳去
    const setActive = (i) => tabs.forEach((t, j) => t.setAttribute('aria-current', j === i ? 'true' : 'false'));
    const offset = () => nav.getBoundingClientRect().bottom + 80;   // 卡片頂端進到標籤列下方 80px 內就算進入該段
    const spy = () => {
      if (Date.now() < lock || nav.offsetParent === null) return;
      let cur = 0;
      cards.forEach((c, i) => { if (c.getBoundingClientRect().top <= offset()) cur = i; });
      // 捲到頁底時，最後一段的卡片可能到不了標籤列下方，直接標示最後一個
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = cards.length - 1;
      setActive(cur);
      const top = parseFloat(getComputedStyle(nav).top) || 0;
      nav.classList.toggle('is-stuck', nav.getBoundingClientRect().top <= top + 0.5 && window.scrollY > 0);
    };
    nav.addEventListener('click', (e) => {
      const t = e.target.closest('a[href^="#"]'); if (!t) return;
      e.preventDefault();
      const i = tabs.indexOf(t);
      setActive(i); lock = Date.now() + 800;
      cards[i].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' });
      setTimeout(spy, 820);
    });
    window.addEventListener('scroll', spy, { passive:true });
    window.addEventListener('resize', spy);
    spy();
  }

  window.SenseForm = { X_ICON, setError, clearError, repeater, upload, stepper, sectionTabs };
})();
