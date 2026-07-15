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
  "persons": [],
  "relationships": [],
  "annotations": [],
  "viewport": { "scale": 1, "offsetX": 0, "offsetY": 0 }
}
```

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
