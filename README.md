# Genogram Editor（家庭關係譜圖編輯器）

Figma / Canva 風格的無限畫布家庭關係譜編輯器。

## 技術棧

- React + TypeScript
- SVG 向量渲染（純 Document → Renderer）
- Zustand 狀態管理
- LocalStorage 持久化
- JSON Document 模型

## 開發

```bash
npm install
npm run dev
```

```bash
npm run build
```

## 架構原則

1. **畫布不是資料**：SVG 僅負責顯示，狀態皆來自 Document Model
2. **關係不是線條**：婚姻、親子、情感等以 Relationship Entity 表示
3. **符號不是圖片**：全部以 SVG 向量繪製，可縮放 / 旋轉 / 變色
4. **符號由 Layer 組合**：Base / Medical / Death / Text / Selection
5. **Data-Driven Rendering**：畫面更新由資料變更觸發

## Document 結構

```json
{
  "title": "未命名家系圖",
  "persons": [],
  "relationships": [],
  "annotations": [],
  "viewport": { "scale": 1, "offsetX": 0, "offsetY": 0 },
  "updatedAt": 0
}
```

## 產品閉環

| 步驟 | 方式 |
|------|------|
| 建立 | 拖曳符號 / 載入示範 / 匯入 JSON / **AI 描述產生** |
| 編輯 | 畫布操作 + 右側屬性 |
| 確認已存 | 工具列顯示「已儲存 · 剛剛」（LocalStorage） |
| 交付 | 工具列「匯出」→ PNG / SVG / JSON |

## AI 產生家系圖

底部 chatbox 用自然語言描述個案家庭關係，AI 會解析人物與關係並自動排版到畫布。

1. 本機：`npm run dev`；線上：部署到 Vercel（見下方）
2. 點 chatbox 左下角模型名稱 → **AI 設定**
3. 貼上你自己的 API Key（存在本機 `localStorage`，不會進 repo）
4. 保持「使用代理」開啟（避免 CORS；本機走 Vite middleware，Vercel 走 serverless）
5. 選擇供應商：
   - **DeepSeek**：`https://api.deepseek.com`（預設 `deepseek-v4-flash`）
   - **xAI (Grok)**：`https://api.x.ai/v1`（預設 `grok-4.5`）
   - **OpenAI**：`https://api.openai.com/v1`
   - **Custom**：OpenAI-compatible endpoint（線上代理需在 Vercel 環境變數允許該 host，見下）
6. 描述後送出，例如：

```text
指標個案小明，男，30 歲。父親王大明、母親林美華已婚。小明有妹妹小華。
```

畫布會被 AI 結果**取代**（可 `Ctrl+Z` 復原）。  
**安全**：瀏覽器會把 key 放在 `Authorization` 標頭，經同源代理轉發到供應商；key 不寫入本專案後端儲存。僅適合個人使用。

## 部署到 Vercel

本專案為 Vite SPA + `/api/llm-proxy` serverless 代理：

1. 匯入 GitHub repo 到 Vercel（或 `vercel` CLI）
2. Build 會讀 `vercel.json`（`npm run build` → `dist`）
3. 部署後保持 AI 設定中「使用代理」開啟即可呼叫 DeepSeek / xAI / OpenAI

**代理允許的 host（預設）**

- `api.deepseek.com`
- `api.x.ai`
- `api.openai.com`

若 Custom Base URL 使用其他網域，在 Vercel 專案設定加入環境變數：

```text
LLM_PROXY_ALLOWED_HOSTS=your-llm-host.example.com,another.example.com
```

（逗號分隔 hostname，不含 `https://`）

## 操作

| 操作 | 方式 |
|------|------|
| 新增人物 | 從左側符號庫拖曳至畫布 |
| 建立關係 | 點選關係符號 → 依序點兩個人物 |
| 平移 | 空白鍵 + 拖曳 / 中鍵 / 工具列「平移」 |
| 縮放 | 滑鼠滾輪 / 工具列 ± |
| 多選 | Shift 點選 / 框選 |
| 刪除 | Delete / Backspace |
| 複製貼上 | Ctrl+C / Ctrl+V |
| 復原重做 | Ctrl+Z / Ctrl+Y |
| 重命名文件 | 工具列標題欄 |
| 匯出 | 工具列「匯出」PNG / SVG / JSON |
| 匯入 | 工具列「匯入」JSON |
| AI 產生 | 底部 chatbox 描述家庭關係 → 自動產出家系圖 |
