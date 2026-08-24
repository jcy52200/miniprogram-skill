---
name: "vertical-swiper-homepage"
description: "Rules for full-screen vertical swiper homepages and nested horizontal switching in WeChat Mini Program. Invoke when building vertical page swiping or in-page horizontal transitions."
---

# Vertical Swiper Homepage (WeChat Mini Program)

Guidelines and rules for building a full-screen vertical swiping homepage and for handling any in-page horizontal switching reliably. Treat every point below as a rule to apply to the *current* project, not a fixed recipe.

## When to Use

- Full-screen vertical page swiping (one screen per page).
- In-page horizontal switching (e.g. product detail ↔ reviews, tabs ↔ panels).
- A sub-page that scrolls vertically and should stop at its bottom instead of flipping to the next screen.

## Core Rules

### 1. Never nest `swiper` inside `swiper`
A horizontal `swiper` placed inside a vertical `swiper` competes for the same touch events: the horizontal axis usually stops responding and vertical swiping can loop. The Mini Program runtime has no reliable option to resolve this.

**Rule**: for any horizontal movement *inside* a vertical swiper page, use a horizontal `scroll-view` — never a nested `swiper`.

### 2. Route gestures by axis direction
The reliability of `scroll-view` comes from axis-orthogonal routing:

- `scroll-x` ignores vertical gestures → they bubble to the outer vertical swiper (page flipping).
- `scroll-y` ignores horizontal gestures → they bubble to an enclosing horizontal `scroll-view` (panel switching).
- A single `scroll-view` cannot enable both axes at once; for two axes, nest (horizontal outside, vertical inside is the most reliable combination).

Use this to decide which container owns which gesture before writing any layout.

### 3. Resolve "scroll to bottom should not flip page"
When a sub-page has its own vertical `scroll-view`, reaching the bottom lets the gesture bubble to the outer vertical swiper and flip pages. Decide per-project how to stop this:

- Dynamically disable the outer swiper's touch (`disable-touch`) while the scrolling sub-page is active, or
- Keep the scrolling sub-page as the only vertical consumer and provide an explicit back control.

The chosen approach must be driven by the project's navigation model, not assumed.

### 4. Snapping with `scroll-into-view` has two traps
If you implement "snap to the nearest full panel" with `scroll-into-view`:

- **Same value does not re-trigger**: if the target id equals the current id, no scroll happens. Reset (set empty, then set the target) to force it.
- **Programmatic snap re-fires `scrollend`**: the animated snap itself triggers `bindscrollend`; if that handler snaps again it loops forever. Guard with an "already aligned, do nothing" check (compare current `scrollLeft` to the target position).

### 5. Horizontal scroll layout compatibility
On WebView, a horizontal `scroll-view` needs `enable-flex` (or `white-space: nowrap` with `display: inline-block` children). `bindscrollend` requires base library ≥ 2.14.4. Verify these against the project's target base library instead of assuming.

### 6. Trigger state only after the screen settles
Update the "active page" index on the outer swiper's animation-finish event (`bindanimationfinish`), not during the drag. Reset any nested sub-page state when leaving that page.

## Implementation Checklist

- [ ] Outer vertical `swiper` with `circular="false"`.
- [ ] Nested horizontal axis implemented with `scroll-view`, not `swiper`.
- [ ] Each panel sized to a full viewport width/height.
- [ ] Scrolling sub-page's bottom behavior decided (and outer flip disabled when needed).
- [ ] Snap logic guarded against the same-value and `scrollend`-loop traps.
- [ ] `enable-flex` / `nowrap` layout matching the target base library.
- [ ] Active-page state updated on animation finish.

## Reference

See `demo.wxml` / `demo.js` / `demo.wxss` for a minimal working example of the rules above. Adapt it to the current project's page structure and navigation model.
