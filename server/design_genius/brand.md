# BRAND.md — Super AI Design System & Frozen Rules

## Design Philosophy

Super AI's visual language is built on three pillars:
1. **Precision** — Every element has a reason to exist. No decoration for decoration's sake.
2. **Depth** — Layered glassmorphism, subtle glows, real spatial hierarchy.
3. **Urgency** — The UI should feel alive. Always moving, always aware.

---

## Color System

### Primary Accent
```
White (Primary):     #FFFFFF
White Glow:          rgba(255, 255, 255, 0.4)
White Dim:           rgba(255, 255, 255, 0.15)
```

### Backgrounds
```
Deep Black:         #050505
Panel BG:           rgba(5, 5, 5, 0.85)
Glass Surface:      rgba(255, 255, 255, 0.04)
Border Default:     rgba(255, 255, 255, 0.25)
Border Active:      rgba(255, 255, 255, 0.65)
```

### Semantic Colors
```
Success / Green:    #22C55E  (cyan-500 family)
Warning / Amber:    #F59E0B
Error / Red:        #EF4444
Info / Cyan:        #22D3EE
```

### Text Hierarchy
```
Primary Text:       #FFFFFF      (brand White)
Secondary Text:     #FFFFFF at 70% opacity
Muted Text:         #FFFFFF at 40% opacity
Code Text:          #22D3EE      (cyan)
```

---

## Typography

### Font Stack
```css
Primary:   'Outfit', 'Inter', system-ui, sans-serif
Mono:      'JetBrains Mono', 'Fira Code', 'Courier New', monospace
```

### Type Scale (rem-based, 16px root)
```
xs:    0.625rem  (10px)  — labels, microcopy, timestamps
sm:    0.75rem   (12px)  — secondary text, captions
base:  0.875rem  (14px)  — body text, chat messages
md:    1rem      (16px)  — UI elements, buttons
lg:    1.125rem  (18px)  — section titles
xl:    1.25rem   (20px)  — panel headers
2xl:   1.5rem    (24px)  — card titles
3xl:   1.875rem  (30px)  — page headings
4xl:   2.25rem   (36px)  — hero headings
display: 3rem+   (48px+) — SUPER AI brand title
```

### Letter Spacing
```
Default body:     normal
Labels/UI:        tracking-wider   (0.05em)
Headings:         tracking-tight   (-0.025em)
Mono/Code:        tracking-normal
Caps/Category:    tracking-widest  (0.1em+)
Brand italic:     tracking-tighter (-0.05em)
```

---

## Spacing System (8px base grid)

```
space-1:  4px   — micro gaps (icon padding)
space-2:  8px   — tight (within components)
space-3:  12px  — compact (between related elements)
space-4:  16px  — default (component padding)
space-5:  20px  — comfortable (section spacing)
space-6:  24px  — relaxed (panel margins)
space-8:  32px  — generous (section breaks)
space-10: 40px  — section-level gaps
space-12: 48px  — major layout divisions
```

---

## Border Radius

```
sm:   4px   — inputs, tags, badges
md:   8px   — cards, panels, buttons
lg:   12px  — modals, drawers
xl:   16px  — main containers
full: 9999px — pills, avatars
```

---

## Shadow / Glow System

```css
/* Subtle White presence */
glow-sm:    0 0 8px rgba(255, 255, 255, 0.25)
glow-md:    0 0 16px rgba(255, 255, 255, 0.35)
glow-lg:    0 0 32px rgba(255, 255, 255, 0.45)
glow-pulse: 0 0 20px rgba(255, 255, 255, 0.6)

/* Error state */
glow-error: 0 0 12px rgba(239, 68, 68, 0.35)

/* Success / Active */
glow-cyan:  0 0 12px rgba(34, 211, 238, 0.35)
```

---

## Animation Timing

```
instant:   0ms     — state changes that must feel immediate
fast:      100ms   — hover feedback, button press
normal:    200ms   — panel transitions, reveals
slow:      350ms   — modal open/close, page transitions
ambient:   2000ms+ — breathing glows, idle pulse
```

### Easing Functions
```
default:   cubic-bezier(0.4, 0, 0.2, 1)  — standard material ease
bounce:    cubic-bezier(0.34, 1.56, 0.64, 1) — spring effect
sharp:     cubic-bezier(0.4, 0, 0.6, 1)  — quick snap
```

---

## Layout Rules

- **Max content width:** 4xl (896px) for chat/feeds
- **Panel widths:** Sidebar panels = 280px (collapsed: 48px)
- **Chat input:** Centered, max-w-4xl, sticky bottom
- **Z-index ladder:** background(0) → canvas(1) → panels(10) → nav(20) → modals(50) → toasts(100)
- **Responsive breakpoints:** sm(640) md(768) lg(1024) xl(1280)

---

## Component Rules (Frozen)

### Buttons
- White outline style default. No solid White fills unless primary CTA.
- Hover: `bg-[#FFFFFF]/15 border-[#FFFFFF]/60`
- Active: `bg-[#FFFFFF]/25 scale-95`
- Disabled: `opacity-40 cursor-not-allowed`

### Cards / Panels
- Background: `bg-black/60 backdrop-blur-md`
- Border: `border border-[#FFFFFF]/20`
- Hover border: `border-[#FFFFFF]/45`

### Inputs
- `bg-white/5 border border-[#FFFFFF]/20`
- Focus: `border-[#FFFFFF]/65 shadow-[0_0_20px_rgba(255,255,255,0.2)]`

### Status Pills
- Use `font-mono font-bold tracking-widest uppercase text-[11px]`
- Animate the left dot with `animate-pulse`
