# Cinematic AI Edge Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the uniform CSS viewport border with a dependency-free WebGL2 edge-light shader driven by seven independent slow-moving light sources, with a CSS blob fallback.

**Architecture:** A focused `AiEdgeGlow` component owns a fixed canvas and fallback blobs. A raw WebGL2 renderer draws one full-screen triangle using a rounded-rectangle SDF, wrapped perimeter coordinates, three glow bands, additive light accumulation, and procedural grain. All visual values live in `edgeGlowConfig`, while pure sizing and lifecycle helpers remain separately testable.

**Tech Stack:** React 19, TypeScript 6, WebGL2 / GLSL ES 3.00, CSS, Node test runner via `tsx`.

## Global Constraints

- Do not add Three.js, React Three Fiber, PixiJS, or another rendering dependency.
- Modify only the outer viewport glow; keep the composer border beam and all editor layout and interaction logic unchanged.
- Use seven independent lights covering hot pink, deep red, warm orange, amber yellow, acid green, cyan, and violet.
- Keep only two to four prominent light regions per frame.
- Use 1 to 2 pixel core, 8 to 30 pixel bloom, and 40 to 140 pixel atmospheric spill.
- Use fixed overlay positioning, no pointer interception, DPR capped at `2`, resize support, reduced-motion support, focus and visibility pausing, and complete cleanup.
- Remove the body-level conic-gradient, border-image, and synchronized 2.8 second CSS breathing implementation.

---

### Task 1: Centralized configuration and render helpers

**Files:**
- Create: `src/components/AiEdgeGlow/edgeGlowConfig.ts`
- Create: `tests/components/AiEdgeGlowConfig.test.ts`

**Interfaces:**
- Produces `EdgeGlowLight`, `EdgeGlowConfig`, `edgeGlowConfig`, `clampEdgeGlowDpr(value)`, `resolveEdgeGlowWidths(viewportWidth, config)`, and `shouldAnimateEdgeGlow(active, visible, focused, reducedMotion)`.
- Consumed by the shader renderer and React component in later tasks.

- [x] **Step 1: Write failing config tests**

Assert that the configuration contains exactly seven lights, the seven requested color names, unique phases, periods between 12 and 28 seconds, atmospheric width of at least 50 pixels on desktop, mobile width between 24 and 80 pixels, DPR clamping to `2`, and lifecycle animation only when active, visible, focused, and not reduced-motion.

- [x] **Step 2: Run focused test and confirm RED**

Run: `npx tsx --test tests/components/AiEdgeGlowConfig.test.ts`

Expected: FAIL because the configuration module does not exist.

- [x] **Step 3: Implement the centralized configuration**

Define a seven-light array with non-sequential perimeter positions, periods `17`, `23`, `14`, `27`, `19`, `25`, and `12.7`, distinct phases, different radii, intensities, drift amplitudes, inward spreads, and fallback positions outside the viewport. Export the pure DPR, responsive width, and lifecycle helpers.

- [x] **Step 4: Run focused test and confirm GREEN**

Run: `npx tsx --test tests/components/AiEdgeGlowConfig.test.ts`

Expected: all config tests pass.

---

### Task 2: Rounded-perimeter fragment shader

**Files:**
- Create: `src/components/AiEdgeGlow/edgeGlowShaders.ts`
- Create: `tests/components/AiEdgeGlowShaders.test.ts`

**Interfaces:**
- Produces `EDGE_GLOW_VERTEX_SHADER` and `EDGE_GLOW_FRAGMENT_SHADER` strings.
- Consumed by `createEdgeGlowRenderer()`.

- [x] **Step 1: Write failing shader contract tests**

Assert that the fragment shader contains `sdRoundedBox`, analytic closest-boundary projection, `roundedPerimeterPosition`, wrapped perimeter distance, a fixed seven-light loop, separate core, bloom, and atmospheric terms, low-frequency multi-sine drift, visibility gating, additive color accumulation, and procedural hash noise. Assert that it does not contain hue rotation or conic-gradient mechanisms.

- [x] **Step 2: Run focused test and confirm RED**

Run: `npx tsx --test tests/components/AiEdgeGlowShaders.test.ts`

Expected: FAIL because the shader module does not exist.

- [x] **Step 3: Implement the shader sources**

Use GLSL ES 3.00. Draw a full-screen triangle from `gl_VertexID`. In the fragment shader, calculate a rounded-box SDF, analytically project to the closest rounded boundary point, convert that point into a normalized rounded-perimeter coordinate, animate seven light positions through three low-frequency sine terms, gate light visibility with phase-separated smoothstep envelopes, calculate smooth perimeter falloff, and combine core, bloom, and atmospheric bands. Add hash noise only where accumulated alpha is non-zero and output premultiplied transparent color.

- [x] **Step 4: Run focused test and confirm GREEN**

Run: `npx tsx --test tests/components/AiEdgeGlowShaders.test.ts`

Expected: all shader contract tests pass.

---

### Task 3: WebGL2 renderer and resource lifecycle

**Files:**
- Create: `src/components/AiEdgeGlow/edgeGlowRenderer.ts`
- Create: `tests/components/AiEdgeGlowRenderer.test.ts`

**Interfaces:**
- Produces `EdgeGlowRenderer` with `resize()`, `render(timestampMs, reducedMotion)`, `clear()`, and `dispose()`.
- Produces `createEdgeGlowRenderer(canvas, config): EdgeGlowRenderer | null`.
- Uses the config and shader modules from Tasks 1 and 2.

- [x] **Step 1: Write failing renderer helper tests**

Test exported pure helpers `computeEdgeGlowResolution(cssWidth, cssHeight, dpr)` and `flattenEdgeGlowUniforms(lights)`. Verify integer backing sizes, DPR-capped values supplied by Task 1, seven packed colors, motion vectors, and shape vectors.

- [x] **Step 2: Run focused test and confirm RED**

Run: `npx tsx --test tests/components/AiEdgeGlowRenderer.test.ts`

Expected: FAIL because the renderer module does not exist.

- [x] **Step 3: Implement WebGL2 initialization and drawing**

Request WebGL2 with alpha, no depth, no stencil, no antialiasing, premultiplied alpha, and low-power preference. Compile and link shaders, create one VAO, cache every uniform location, upload packed light arrays once, update size-dependent and time uniforms, draw one full-screen triangle, and return `null` after cleaning partial resources when initialization fails.

- [x] **Step 4: Implement deterministic cleanup**

`dispose()` must be idempotent, delete the VAO and program, clear the canvas, and call `WEBGL_lose_context.loseContext()` when available. `render()` and `resize()` become no-ops after disposal.

- [x] **Step 5: Run focused test and confirm GREEN**

Run: `npx tsx --test tests/components/AiEdgeGlowRenderer.test.ts`

Expected: all renderer helper tests pass.

---

### Task 4: React lifecycle, CSS fallback, and app integration

**Files:**
- Create: `src/components/AiEdgeGlow/AiEdgeGlow.tsx`
- Create: `src/components/AiEdgeGlow/AiEdgeGlow.css`
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `tests/styles/generationViewportGlow.test.ts`
- Create: `tests/components/AiEdgeGlow.test.ts`

**Interfaces:**
- Produces `<AiEdgeGlow active={boolean} />`.
- Consumes existing `isGenerating` from `App.tsx`.
- Uses `createEdgeGlowRenderer`, config helpers, `ResizeObserver`, `matchMedia`, visibility events, and focus events.

- [x] **Step 1: Write failing component and CSS tests**

Render a pure exported `AiEdgeGlowMarkup` with seven lights and assert one inert canvas plus seven fallback blobs. Update the CSS test to require a fixed, inset-zero, pointer-inert overlay, slow independent blob periods, screen/additive presentation, and reduced-motion animation removal. Assert that the body-level `.app-shell::before` conic-gradient is absent.

- [x] **Step 2: Run focused tests and confirm RED**

Run: `npx tsx --test tests/components/AiEdgeGlow.test.ts tests/styles/generationViewportGlow.test.ts`

Expected: FAIL because the component and fallback CSS do not exist and the old conic-gradient remains.

- [x] **Step 3: Implement component lifecycle**

Render the canvas and fallback blobs outside layout. Initialize WebGL only while active. Cap DPR, update on window resize and `ResizeObserver`, pause RAF on blur, hidden document, reduced motion, or inactive state, and resume only when conditions permit. Draw one deterministic static frame for reduced motion. Switch to fallback on initialization failure or context loss. Cleanup RAF, timers, media listeners, focus and visibility listeners, observer, and renderer on deactivation or unmount.

- [x] **Step 4: Implement CSS fallback and remove old glow**

Delete the `.app-shell::before` and `.app-shell::after` conic-gradient implementation and its keyframes. Add fixed overlay styles, normal transparent compositing backed by additive shader accumulation, seven individually sized blurred radial blobs partly outside the viewport, three perceived glow depths, dark gaps, 12 to 28 second transform and opacity animations, mobile sizing, and reduced-motion static positioning. Keep z-index above the editor and pointer events disabled.

- [x] **Step 5: Integrate with the app**

Render `<AiEdgeGlow active={isGenerating} />` inside `.app-shell` after `ToastHost`, preserving every existing editor component and generation state calculation.

- [x] **Step 6: Run focused tests and confirm GREEN**

Run: `npx tsx --test tests/components/AiEdgeGlow.test.ts tests/styles/generationViewportGlow.test.ts`

Expected: all component and CSS contract tests pass.

---

### Task 5: Visual, performance, and full verification

**Files:**
- Modify only files from Tasks 1 through 4 if verification exposes a concrete defect.

**Interfaces:**
- Verifies the complete user-facing effect and cleanup contract.

- [x] **Step 1: Run complete automated verification**

Run: `npm test && npm run lint && npm run build && git diff --check`.

Expected: all tests and build pass; lint introduces no new warnings.

- [x] **Step 2: Inspect the active effect in the local browser**

Use a temporary local preview that sets `active=true` without calling an AI endpoint. Capture frames at time zero and after at least ten seconds. Confirm two to four prominent regions, unequal edge brightness, at least 50 pixels inward spill, seamless rounded corners, no complete rainbow ring, fixed layout, readable controls, and pointer-inert overlay.

- [x] **Step 3: Verify lifecycle behavior**

Confirm canvas backing resolution respects `min(devicePixelRatio, 2)`, resize changes resolution, reduced motion stops RAF, blur or hidden page stops time advancement, focus resumes, and temporary preview files are removed.

- [x] **Step 4: Re-run complete verification after visual adjustments**

Run: `npm test && npm run lint && npm run build && git diff --check`.

Expected: final verification remains green.
