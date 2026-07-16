# Cinematic AI Generation Edge Glow Design

## Status

This specification replaces the previous uniform CSS conic-gradient viewport glow. The existing composer border beam remains unchanged.

## Goal

Create an Oryzo-inspired viewport edge-lighting mechanism for AI generation without copying Oryzo branding, assets, or exact color choreography. The result must read as several independent cinematic light sources entering from outside the viewport, not as a regular CSS rainbow border.

## Scope

- Modify only the outer viewport glow.
- Preserve page dimensions, canvas behavior, side panels, toolbars, modals, composer, generation flow, and interaction logic.
- Display the effect only while the existing AI generation state is active.
- Remove the current body-level conic-gradient and its synchronized breathing animation.
- Do not add Three.js, React Three Fiber, PixiJS, or another large rendering dependency.

## Architecture

### `edgeGlowConfig.ts`

Exports one `edgeGlowConfig` object containing every visual and animation parameter:

```ts
const edgeGlowConfig = {
  cornerRadius: 30,
  coreWidth: 1.5,
  bloomWidth: 24,
  atmosphericWidth: 110,
  globalIntensity: 0.8,
  grainAmount: 0.025,
  animationSpeed: 0.65,
  maxDevicePixelRatio: 2,
  mobileBreakpoint: 640,
  mobileAtmosphericWidth: 72,
  lights: edgeGlowLights,
};
```

Each light stores `basePosition`, `color`, `radius`, `intensity`, `period`, `phase`, `driftAmplitude`, and `inwardSpread`. Seven lights independently represent hot pink, deep red, warm orange, amber yellow, acid green, cyan, and violet. Their periods range from 12 to 28 seconds.

### `edgeGlowShaders.ts`

Exports a full-screen triangle vertex shader and WebGL2 fragment shader.

The fragment shader:

1. Converts `gl_FragCoord` into centered viewport coordinates.
2. Evaluates a signed distance field for a rounded rectangle with a 24 to 36 pixel corner radius.
3. Finds the closest rounded-perimeter point and its normalized perimeter coordinate.
4. Animates each light with two or three low-frequency sine terms using different speed multipliers and phases.
5. Measures wrapped perimeter distance between each fragment and each light.
6. Applies independent Gaussian falloff along the perimeter and inward normal.
7. Produces three contributions per light:
   - 1 to 2 pixel core edge
   - 8 to 30 pixel bloom
   - 40 to 140 pixel atmospheric spill
8. Adds the light contributions without normalizing them into a complete rainbow.
9. Applies a phase-separated visibility envelope so only two to four lights are prominent at once.
10. Adds shader-generated grain at 0.015 to 0.04 opacity only where glow exists.

The shader output remains transparent in the center and uses premultiplied alpha suitable for screen compositing.

### `edgeGlowRenderer.ts`

Owns raw WebGL2 setup without third-party rendering dependencies:

- Creates and compiles the shader program.
- Draws one full-screen triangle.
- Uploads viewport resolution, DPR, time, reduced-motion state, config values, and light arrays as uniforms.
- Caps DPR at `2`.
- Updates resolution on window resize and `ResizeObserver` notifications.
- Returns a cleanup function that cancels RAF, removes listeners and observers, deletes buffers and programs, and releases the WebGL context through `WEBGL_lose_context` when available.
- Returns a failure result rather than throwing into React when WebGL2 or shader compilation is unavailable.

### `AiEdgeGlow.tsx`

Receives `active: boolean` from the existing AI generation state.

- Renders a fixed canvas with `inset: 0`, `pointer-events: none`, and a z-index above canvas, panels, toolbars, and modals.
- Starts animation only while active, visible, and focused.
- Pauses RAF on `document.visibilitychange`, `window.blur`, and inactive generation state.
- Resumes on `window.focus` or visibility restoration only when generation remains active.
- On deactivation, retains the last rendered frame long enough for a short CSS opacity fade, then clears it.
- Selects CSS fallback mode when WebGL initialization fails.
- Cleans up all renderer resources when unmounted.

### `AiEdgeGlow.css`

The primary canvas layer uses:

```css
position: fixed;
inset: 0;
pointer-events: none;
mix-blend-mode: screen;
```

The component remains outside layout and does not create scrolling.

The CSS fallback contains seven blurred blob elements positioned partly outside the viewport. Each uses a distinct radial gradient, size, opacity, transform path, and 12 to 28 second animation period. It supplies separate core, bloom, and atmospheric layers through box-shadow, filter blur, and masked pseudo-elements. It must preserve dark gaps and cannot use conic-gradient, border-image, hue rotation, or a single rotating gradient.

## Visual Behavior

- Light centers remain outside the viewport; only their falloff enters the page.
- Desktop atmospheric reach is 50 to 140 pixels. Mobile atmospheric reach is 24 to 80 pixels.
- Light intensity differs visibly across all four edges at every sampled frame.
- Corners use the same rounded SDF as straight edges, preventing seams or sharp conic transitions.
- Screen compositing gently colors panels and canvas content near an active source.
- The center remains clear and receives no white haze.
- Animation is nearly imperceptible over ten seconds and does not resemble a spinner.
- No complete or orderly rainbow sequence is visible around the perimeter.

## Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- Stop continuous positional drift.
- Render one deterministic low-intensity frame with two or three visible sources.
- Continue showing the generation state without relying on animation alone.

## Failure Handling

- WebGL2 unavailable: activate CSS blob fallback.
- Shader compile or link failure: clean partial GPU resources and activate fallback.
- WebGL context loss: prevent default restoration behavior only as needed, switch to fallback, and avoid repeated initialization loops.
- Resize to zero dimensions: pause drawing until non-zero dimensions return.

## Performance

- One canvas and one full-screen triangle.
- Seven fixed light iterations in the fragment shader, no dynamic allocations per frame.
- DPR capped at `2`.
- RAF runs only while generation is active and the page is focused and visible.
- Uniform values and buffers are reused.
- Fallback DOM is inert and animation stops under reduced motion.

## Testing

- Config tests validate seven lights, period range, unique phases, width ranges, DPR cap, and centralized visual values.
- Shader source tests verify rounded-rectangle SDF, three glow bands, additive light loop, and procedural noise contracts.
- Renderer helper tests validate DPR clamping, responsive atmospheric width, pause conditions, and resize resolution.
- Component markup tests verify fixed canvas and fallback presence without interaction semantics.
- CSS regression test rejects body-level conic-gradient and verifies fixed, non-interactive, screen-blended overlay and reduced-motion fallback.
- Manual browser verification captures frames at least ten seconds apart and confirms asymmetric edge intensity, more than 50 pixels of inward spill, seamless corners, readable controls, and unchanged canvas interaction.
- Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

## Acceptance Criteria

- A static frame cannot be mistaken for a standard gradient border.
- Two to four areas are visibly active while the remaining perimeter stays dark.
- At least one active source spills 50 pixels or more inward on desktop.
- Rounded corners contain no visible seam or rectangular join.
- Ten seconds of observation reveals drift but no obvious loop.
- Text, buttons, panels, modal layering, and canvas operations remain unaffected.
- Resize, DPR, reduced motion, focus pause, unmount cleanup, WebGL failure, and fallback behavior are implemented and verified.
