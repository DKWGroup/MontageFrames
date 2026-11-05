---
name: web-interface-guidelines
description: Vercel's Web Interface Guidelines as a review and build checklist for websites and apps - keyboard and focus, hit targets, forms, motion (reduced-motion variant, transform and opacity only), layout, content states, accessibility. Use when building, reviewing or fixing a web page or UI, or when asked to check a screen against the Vercel guidelines.
---

# Web Interface Guidelines (condensed checklist)

Source: https://vercel.com/design/guidelines (a living list). This is our condensed copy from 2026-11-04. For anything not listed here, or to check for changes, read the source page.

## How to use
1. Open the page, screen or component code.
2. Walk through the sections below and note each miss as: rule, location, fix (exact value, word or component).
3. Mark what a static screenshot cannot show (focus order, keyboard, screen reader) as "not tested".
4. Do not restyle the whole product. Fix the rule that is broken.

## Interactions
- Keyboard works everywhere; flows follow the WAI-ARIA Authoring Patterns.
- Visible focus ring with `:focus-visible`; sticky headers, footers and overlays never cover the focused element; manage focus (traps, return focus).
- Hit targets at least 24 px (44 px on mobile). Mobile input font size at least 16 px, or the viewport meta without `maximum-scale`. Never disable zoom. Never block paste.
- Loading: keep the original label; show a delayed spinner (about 150-300 ms) with a minimum visible time (about 300-500 ms).
- Optimistic updates roll back or offer Undo. Destructive actions need confirmation or a safe Undo window.
- Ellipsis (`…`) on menu items that open a follow-up and on in-progress labels ("Saving…").
- URL holds state (filters, tabs, pagination, open panels); Back/Forward restores scroll.
- Navigation uses `<a>` or `<Link>` (Cmd/Ctrl+click and middle-click must work). Never fake links with `<div>` or `<button>`.
- No dead zones: if it looks interactive, it is. Every drag, swipe or pinch also has a click or keyboard alternative.
- Toasts and inline validation use `aria-live="polite"`. `touch-action: manipulation` on controls.
- Tooltips: the first in a group is delayed, peers are not. `overscroll-behavior: contain` in modals and drawers. Autofocus only on desktop screens with one primary input.

## Animations
- A `prefers-reduced-motion` variant is required.
- Prefer CSS, then Web Animations API, then JS libraries.
- Animate `transform` and `opacity` only. Never `transition: all`.
- Animate only to show cause and effect or deliberate delight. No autoplay loops longer than 5 s without pause, stop or hide. Animations are interruptible by input.
- Anchor `transform-origin` to where motion physically starts. For SVG, apply transforms to `<g>` wrappers with `transform-box: fill-box`.

## Layout
- Every element aligns to something on purpose (grid, baseline, edge, optical centre). Optical correction of about 1 px where needed.
- Balance weights in icon and text lockups.
- Check mobile, laptop and ultra-wide (zoom to 50% to simulate).
- Respect safe areas (notch, insets). Remove unwanted scrollbars.
- Let CSS handle flow (flex, grid, intrinsic sizing) rather than measuring in JS.

## Content and states
- Inline help before tooltips. Skeletons mirror the final layout exactly.
- `<title>` reflects the current context. Every screen offers a next step or recovery path.
- Design empty, sparse, dense and error states. Test very short and very long user content.
- Curly quotes; avoid widows; `font-variant-numeric: tabular-nums` in numeric comparisons.
- Never rely on colour alone. Icon-only buttons get an `aria-label`.
- Scroll margin on anchored headings. Locale-aware dates, numbers and currency; detect language from `Accept-Language` or `navigator.languages`, never from IP.
- Wrap brand names and code tokens in `translate="no"`.

## Accessibility
- Native elements before ARIA (`button`, `a`, `label`, `table`).
- Hierarchical `h1`-`h6` and a "Skip to content" link.
- Captions for speech, transcripts for audio-only media, decorative media hidden from assistive tech.
- Non-breaking spaces to keep units and shortcuts together (`10&nbsp;MB`, `⌘&nbsp;+&nbsp;K`).

## Forms
- Enter submits when the field is the only control. In a textarea, Cmd/Ctrl+Enter submits and Enter adds a line.
- Every control has a label; clicking a label focuses its control.
- Keep the submit button enabled until submission starts, then disable it.
- The source page has more rules for forms, performance and navigation: read it.
