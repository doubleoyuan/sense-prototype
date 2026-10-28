# SENSE Prototype 工作規則

SENSE 平台各模組的可互動原型（純 HTML／CSS／JS，無建置流程），用於內部討論與規格對齊。

> 這個 repo 與 GitHub Pages 都是公開的。本檔與所有上傳的檔案不得出現客戶名稱、金額、內部文件名稱或其他機密。

## 溝通
- 一律使用繁體中文（台灣用語），專有名詞可保留英文；進度說明與總結也一樣。
- 使用者問「你覺得呢」時，先回覆看法與待確認事項，等同意後才動手。
- 設計決策由使用者決定：不要自行重新設計畫面，也不要主動統一使用者尚未確認的樣式（例如各模組色）。

## 專案結構
- `index.html`：原型入口頁。列出各模組，更新時間取自 `dist/` 內該原型最新一版的檔名日期，需手動更新。
- `prototype/*.html`：各模組頁面。
- `prototype/shared/`：全模組共用。
  - `tokens.css`：設計變數（顏色、字體、圓角、模組色、版面尺寸）
  - `components.css`／`components.js`：共用元件
  - `forms.css`／`forms.js`：表單元件
  - `shell.js`：側欄＋header 外框（AppShell）
  - `assets/`：圖示與圖片
- `prototype/ui-library.html`：給人看的 UI Library 說明頁，不上傳。
- `scripts/build_share*.py`：把原型打包成單一 HTML 到 `dist/`，方便直接傳送。
- `doc/`：需求文件，內含機密，絕不上傳。

## AppShell
- 頁面結構為 `<div class="app" data-module="…" data-page="…">`，再呼叫 `SenseShell.mount()`。
  - `data-module` 決定側欄與模組色。
  - `data-crumb` 可自訂麵包屑最後一層的文字。
- header 只放麵包屑（SENSE / 模組 / 子頁），麵包屑文字不帶模組色。
  - 根節點「SENSE」可點，目的地尚未決定（`ROOT_HREF = null`）。
- 手機版：深層頁只顯示「‹ 上一層」，入口頁只顯示模組名稱。
- 側欄可收合成 70px，只留 logo 與展開鈕，收合狀態存在 `localStorage`（`sense.navCollapsed`）。
  - 收合鈕視覺 20px、可點範圍 32px；hover 時底色轉為 `--cta-orange`，箭頭變白、加粗。
- 改 shell 會影響所有模組頁，改完要逐頁確認。

## 改 UI 的規則
1. 先找 `shared/` 有沒有現成元件，有就沿用，沒有再新增。
2. 顏色、圓角、字體、模組色一律用 `tokens.css` 的變數，不要寫死色碼。
   - 間距與字級目前還沒有 token，先沿用 `components.css` 既有的數值，不要自創新數值。
3. 模組專屬、需求仍在確認的元件留在該頁內，不要搬進 `shared/` 或 UI Library。
   - 公關 SENSE 的元件放在 `pr-sense.html` 頁內。
   - 財務 SENSE 的元件放在 `finance-sense.html` 頁內，class 以 `fs-` 開頭。
   - 等需求定案，再跟使用者確認哪些要抽成共用。
4. 改了 `shared/` 的 CSS／JS，要把各頁引用的 `?v=` 版本號一起更新，避免讀到快取。
5. 圖示用 inline SVG。CSS `mask-image` 在 `file://` 開啟時會被瀏覽器擋掉。

## 驗證
- 改完要在瀏覽器實際確認，桌機與手機寬度（375px）都要看，並檢查主控台沒有錯誤。
- 細小的視覺元素（線條、缺口、疊層）先暫時改成高對比的除錯色，確認實際畫出來的形狀與位置正確，再換回正式顏色。
- 頁面也會直接用 `file://` 開啟或打包後傳送，兩種情況都要能正常運作。

## 上傳與發布
- `.gitignore` 採放行清單：預設全部不追蹤，新頁面要手動加進清單才會上傳。
- 推上 `main` 後，GitHub Pages 會自動重新發布：https://doubleoyuan.github.io/sense-prototype/
- 只有使用者要求時才 commit 或 push。
