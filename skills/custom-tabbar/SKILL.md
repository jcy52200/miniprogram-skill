---
name: "custom-tabbar"
description: "Rules for building custom tab bars in WeChat Mini Program: glassmorphism, floating pill, auto-hide, centered raised logo. Invoke when the native tabBar is insufficient."
---

# Custom TabBar (WeChat Mini Program)

Guidelines and rules for building a fully custom tab bar. Treat every point as a rule to apply to the *current* project, not a fixed recipe. Choose the variant that matches the project's navigation style, then adapt the CSS to the actual design.

## When to Use

- The native `app.json` `tabBar` cannot express the design (centered raised logo, glass blur, animation).
- A centered, raised brand-logo button.
- A glassmorphism / frosted-glass tab bar.
- An auto-hiding tab bar that reveals on scroll.
- A permanent floating, large-radius capsule ("dock" / pill) tab bar.

## Why Custom

The native tab bar is a closed system component: it cannot do a centered raised button, `backdrop-filter` blur, per-part animations, or partial hide. Build a custom `Component` instead and switch tabs in-page (or via navigation) rather than relying on native tab pages.

## Style Variants (choose by scenario)

Pick one below; the middle raised logo (Variant D) can be combined with any of A–C.

### Variant A — Auto-hide + reveal on scroll (immersive)
Best when content should be unobstructed (reading, video, gallery).
- Full-width bar docked at the bottom, top-rounded.
- Idle for N seconds → bar slides down out of view (`translateY(100%)`); the center logo stays floating.
- Any scroll → bar slides back up and the idle timer resets.

### Variant B — Permanent floating pill (premium dock)
Best for a refined, non-intrusive look over full-screen content.
- Bar does **not** touch the screen edges: add `left`/`right`/`bottom` insets and a large `border-radius` (half the height) to form a capsule.
- Always visible (no auto-hide); glass blur + subtle shadow.

### Variant C — Standard bottom glass bar
Best for conventional, always-available navigation.
- Full-width bar docked at the bottom, top-rounded, always visible.

### Variant D — Centered raised logo button
Best when the brand/primary action sits in the middle.
- A circular logo button positioned at the horizontal center, raised above the bar top edge.
- Keep it a **separate sibling** of the bar (not a child), so the bar can slide away while the logo stays floating.

## Core Rules

### 1. Three-layer structure
Lay out the component as three siblings:

1. **Spacer**: an in-flow view with the same height as the bar, so fixed content does not cover page bottom.
2. **Bar body**: the actual tab bar (fixed, glass).
3. **Raised logo** (optional): a fixed, higher `z-index` sibling, independent of the bar's transform.

### 2. Glassmorphism with a fallback
Use `backdrop-filter: blur(...)` plus a translucent `background-color` (e.g. `rgba(...)`). On low-end Android where blur silently fails, the translucent background still reads correctly. Keep a toggle/flag if blur must be disabled explicitly.

### 3. Animate with `transform`, never `display`
Hide by translating off-screen (`transform: translateY(100%)`) with a `transition` on `transform`. Do not toggle `display: none` — it cannot be animated and causes reflow.

### 4. State + timer (for Variant A)
Keep a `status: show | hide` and an idle timer. Any interaction (tab tap, scroll, logo tap) resets the timer. From `hide`, only a scroll/gesture restores `show` (Safari-style), not the timer alone.

### 5. Wire scroll into the component
The component cannot receive `onPageScroll` directly. The page forwards it: `this.selectComponent('#tabbar').onPageScroll(e.scrollTop)`. For a `swiper`-based page (where `onPageScroll` does not fire), forward `bindtransition` / `bindchange` instead.

### 6. Clean up the timer
Clear the idle timer in the component's `detached` lifecycle to avoid timers from leaked instances.

### 7. Safe area
Reserve `env(safe-area-inset-bottom)` via `padding-bottom` on the bar, and offset the raised logo's `bottom` by the same inset.

### 8. Icons: line icons or plain text only
Use **outline (stroke-only) line icons** or **plain text labels**. Avoid filled-color glyphs and emoji — they clash with a monochrome glass surface and render inconsistently across devices.

- Line icons: reference a local SVG (stroke-based, `fill="none"`) via `<image>`, or use an iconfont with an outline icon set.
- Plain text: a short label (optionally uppercase, letter-spaced) is acceptable when icons are not required.
- Keep active/inactive states as a color/opacity change of the same outline glyph, not a different filled glyph.

## Implementation Checklist

- [ ] Native `app.json` tabBar abandoned; custom `Component` used.
- [ ] Spacer + bar body + optional raised logo laid out as siblings.
- [ ] `backdrop-filter: blur(...)` with a translucent background fallback.
- [ ] Hide/show driven by `transform: translateY` + `transition`.
- [ ] Idle timer reset on every interaction; cleared in `detached`.
- [ ] Scroll forwarded into the component (page scroll or swiper transition).
- [ ] `env(safe-area-inset-bottom)` respected on bar and raised logo.
- [ ] Icons are line-style or plain text (no filled glyphs / emoji).

## Reference

See `demo.wxml` / `demo.wxss` / `demo.js` for a minimal **Variant B + D** example (permanent floating pill with a centered raised logo). Variant A's auto-hide logic is described above and can be layered onto the same structure.
