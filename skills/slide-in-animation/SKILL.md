---
name: "slide-in-animation"
description: "Rules for side slide-in entrance animations of text and buttons in WeChat Mini Program. Invoke when adding GPU-accelerated slide/fade-in entrance animations."
---

# Text & Button Slide-in Animation (WeChat Mini Program)

Guidelines and rules for entrance animations where text and buttons slide in from the side (or from above) and fade in. Treat every point as a rule to apply to the *current* project, not a fixed recipe.

## When to Use

- Text/buttons sliding in from the left or right (`translateX`).
- Text sliding down from above (`translateY`).
- Slide-in combined with a fade from a mid opacity to full opacity.
- Two groups entering at different times (staggered, for depth).

## Core Rules

### 1. Animate only `transform` and `opacity`
Move with `translateX` / `translateY` / `scale`, fade with `opacity`. These run on the compositor and stay smooth on low-end Android. Add `will-change: transform, opacity` on animated elements. Never animate `top` / `left` / `margin` — those cause layout reflow.

### 2. Use a state-class toggle
Keep a single boolean (or index) in `data` and toggle an `.active` class in WXML (`class="box {{isActive ? 'active' : ''}}"`). Define the inactive and active transforms in CSS so the transition is declarative:

- inactive: `translateX(-100%) scale(0.98); opacity: 0; pointer-events: none;`
- active: `translateX(0) scale(1); opacity: 1; pointer-events: auto;`

### 3. Choose direction per layout
- Left group → `translateX(-100%) → 0`.
- Right group → `translateX(100%) → 0`.
- Top/drop-in group → `translateY(-120%) → 0`.

Pick based on where the element sits in the actual design, not on a memorized value.

### 4. Fade from a mid opacity for depth
Start at `opacity: 0.5` (not `0`) and animate to `1`. The element becomes gradually clearer as it slides in, which reads as higher quality than a plain fade. Adjust the start opacity to the design's contrast needs.

### 5. Stagger with transition delay
For two sides, give the second group a longer delay (e.g. left `0.1s`, right `0.25s`) via the `transition` delay argument. Use a single easing such as `cubic-bezier(0.16, 1, 0.3, 1)` for a fast-out feel, and keep durations consistent (≈ 0.7–0.8s).

### 6. Keep `pointer-events` in sync
Set `pointer-events: none` while inactive so transparent elements do not capture taps, and `pointer-events: auto` when active. This also gates the button's clickability until it has fully entered.

### 7. Strip the default `<button>` styling
The Mini Program `<button>` has default borders and a pressed state that distort thin/transparent buttons. Use `hover-class="none"` on the tag and `button::after { border: none; }` in WXSS. Then style the button freely (pill border, transparent background, etc.).

### 8. Trigger only after the screen settles
Activate the animation after the page/swiper has settled (`bindanimationfinish`) or after the element enters the viewport (`IntersectionObserver`), not during a drag. This avoids mid-transition jank and makes the entrance read as intentional.

## Implementation Checklist

- [ ] Only `transform` + `opacity` animated, with `will-change`.
- [ ] Boolean-driven `.active` class toggle.
- [ ] Direction (`left` / `right` / `top`) matches the element's layout position.
- [ ] Mid-opacity fade (e.g. `0.5 → 1`).
- [ ] Staggered delays for multi-group entrances.
- [ ] `pointer-events` gated by active state.
- [ ] `<button>` defaults stripped (`hover-class="none"`, `::after` border removed).
- [ ] Activation triggered on settle / viewport entry, not mid-drag.

## Reference

See `demo.wxml` / `demo.wxss` / `demo.js` for a minimal staggered slide-in example (left text group + right logo/button group). Adapt direction, delay, and styling to the current project.
