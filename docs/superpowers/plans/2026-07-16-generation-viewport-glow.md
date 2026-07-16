# AI Generation Viewport Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed Oryzo-inspired multicolor perimeter glow that appears only while AI generation is active.

**Architecture:** Reuse the existing `.app-shell.is-ai-generating` state class and render two non-interactive CSS pseudo-elements: a broad blurred spectrum and a crisp inner perimeter. The color field stays spatially anchored while only intensity breathes; reduced motion removes continuous animation.

**Tech Stack:** React 19, TypeScript, CSS masks and gradients, Node test runner via `tsx`.

## Global Constraints

- The viewport glow appears only during `analyzing`, `structuring`, `linking`, and `revealing` through the existing `is-ai-generating` class.
- The color positions remain fixed: violet upper-left, red-orange upper-right, yellow lower-right, cyan lower-left.
- The overlay must not change layout, scrolling, or pointer behavior.
- The effect must not obscure application controls or genogram content.
- `prefers-reduced-motion: reduce` removes breathing animation and retains a static lower-intensity glow.
- The existing composer border beam remains unchanged.

---

### Task 1: Generation-only viewport perimeter glow

**Files:**
- Modify: `src/App.css`
- Create: `tests/styles/generationViewportGlow.test.ts`

**Interfaces:**
- Consumes: `.app-shell.is-ai-generating` from `src/App.tsx`.
- Produces: fixed `::before` and `::after` viewport glow layers with no DOM or JavaScript API changes.

- [x] **Step 1: Write the failing CSS contract test**

Create a Node test that reads `src/App.css` and asserts all of these contracts:

```ts
assert.match(css, /\.app-shell::before[\s\S]*?pointer-events:\s*none/);
assert.match(css, /\.app-shell\.is-ai-generating::before/);
assert.match(css, /\.app-shell\.is-ai-generating::after/);
assert.match(css, /@keyframes ai-viewport-glow-breathe/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.app-shell\.is-ai-generating::before[\s\S]*?animation:\s*none/);
```

- [x] **Step 2: Run the focused test and confirm RED**

Run: `npx tsx --test tests/styles/generationViewportGlow.test.ts`

Expected: FAIL because the viewport glow selectors and keyframes do not exist.

- [x] **Step 3: Implement the two viewport layers**

Add inactive base pseudo-elements with `position: fixed`, `inset: 0`, `pointer-events: none`, masked OKLCH conic gradients, and opacity `0`. Activate only under `.app-shell.is-ai-generating`; use the blurred `::before` layer for the ambient halo and `::after` for the precise edge.

- [x] **Step 4: Add breathing and reduced-motion behavior**

Animate only opacity and filter in `ai-viewport-glow-breathe`. In the existing reduced-motion media block, set `animation: none` and a lower static opacity for both layers.

- [x] **Step 5: Verify behavior and presentation**

Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`. Use a temporary local-only preview state to visually confirm the fixed color placement, edge attachment, unobstructed controls, and generation-only visibility; delete that preview before completion.
