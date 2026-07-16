# AI Generation Viewport Glow Design

## Goal

Add an Oryzo-inspired multicolor glow around the full viewport boundary while AI generation is active, complementing the existing composer border beam without competing with the genogram.

## Visual Direction

- Use a fixed perimeter spectrum: violet at the upper-left, red-orange at the upper-right, yellow at the lower-right, and cyan at the lower-left.
- Keep colors spatially anchored. Do not rotate the spectrum around the viewport.
- Animate only glow intensity with a restrained breathing cycle.
- Keep the inner canvas bright and readable. The effect must remain concentrated at the viewport edge.
- Retain the existing animated composer border beam as the local generation indicator.

## Architecture

- Render the effect with a non-interactive pseudo-element on `.app-shell`.
- Activate it through the existing `.app-shell.is-ai-generating` class, which already maps to `analyzing`, `structuring`, `linking`, and `revealing`.
- Use a masked multicolor gradient perimeter and blurred outer layer without adding React state, DOM nodes, timers, or API changes.
- Keep the overlay fixed to the viewport with `pointer-events: none` and a z-index above application chrome.

## Lifecycle

- Idle and error: hidden.
- AI generation: visible and breathing.
- Complete or cancel: fade out with the existing generation-state transition.
- Reduced motion: show a static, lower-intensity perimeter glow with no breathing animation.

## Constraints

- Do not change layout dimensions or viewport scrolling.
- Do not intercept pointer, keyboard, or canvas interactions.
- Do not obscure toolbar controls, property panels, symbols, or text.
- Do not add a constantly visible decorative state.
- Do not animate layout properties.

## Verification

- Automated regression test verifies the viewport class is active only for generation phases.
- CSS regression coverage verifies an active viewport glow selector and reduced-motion fallback exist.
- Visual inspection verifies color placement, readable controls, viewport attachment, and removal after generation.
- Run the full test suite, lint, and production build.
