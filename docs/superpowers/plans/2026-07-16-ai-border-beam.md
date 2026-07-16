# AI Border Beam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a restrained animated border beam around the AI composer only while an AI generation run is active.

**Architecture:** `AiChatbox` derives its busy state from the existing AI generation phase and exposes that state as a modifier class on the composer. CSS renders the beam with a non-interactive masked pseudo-element, preserving the existing border and layout, and disables rotation for reduced-motion users.

**Tech Stack:** React 19, TypeScript, CSS, Node test runner via `tsx`.

## Global Constraints

- Do not change the AI request, preview, commit, cancel, or error behavior.
- The effect must appear only during `analyzing`, `structuring`, `linking`, and `revealing`.
- The beam must not change composer dimensions or intercept pointer events.
- `prefers-reduced-motion: reduce` must remove continuous motion.

---

### Task 1: Generation-only composer border beam

**Files:**
- Modify: `src/components/AiChatbox.tsx`
- Create: `src/components/aiChatboxClassName.ts`
- Modify: `src/App.css`
- Test: `tests/components/AiChatbox.test.ts`

**Interfaces:**
- Consumes: existing local `busy: boolean` in `AiChatbox`.
- Produces: `.ai-chatbox.is-generating` DOM state and its border-beam presentation.

- [x] **Step 1: Write the failing test**

Render `AiChatbox` once with the AI generation store in `analyzing` and once in `idle`; assert that only the active render includes `ai-chatbox is-generating`.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/AiChatbox.test.ts`

Expected: FAIL because the composer does not yet expose the generation modifier class.

- [x] **Step 3: Write minimal implementation**

Set the composer class to `ai-chatbox is-generating` while `busy` is true. Add a masked `::before` conic-gradient beam with `pointer-events: none`, and animate its angle without affecting layout.

- [x] **Step 4: Add reduced-motion fallback**

In the existing reduced-motion block, disable the beam animation and leave a subtle static border highlight.

- [x] **Step 5: Verify**

Run `npm test`, `npm run lint`, and `npm run build`. Inspect the running local app during generation to confirm the beam follows the rounded composer border and disappears after completion or cancellation.
