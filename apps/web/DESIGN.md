---
name: LinguaCraft
description: Focused academic language studio with crisp cobalt accents, tactile 2px borders, and dual light/dark slate surfaces.
colors:
  cobalt-signal: "#2563eb"
  cobalt-glow: "#3b82f6"
  cobalt-deep: "#1d4ed8"
  amber-crest: "#d97706"
  emerald-pass: "#16a34a"
  crimson-alert: "#dc2626"
  slate-paper: "#f8fafc"
  pure-canvas: "#ffffff"
  slate-wash: "#f1f5f9"
  ink-obsidian: "#0f172a"
  slate-muted: "#475569"
  slate-hairline: "#e2e8f0"
  night-abyss: "#090d16"
  night-card: "#0f172a"
  night-elevated: "#1e293b"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt-signal}"
    textColor: "{colors.pure-canvas}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-deep}"
  button-secondary:
    backgroundColor: "{colors.slate-wash}"
    textColor: "{colors.ink-obsidian}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-obsidian}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  card-surface:
    backgroundColor: "{colors.pure-canvas}"
    textColor: "{colors.ink-obsidian}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.pure-canvas}"
    textColor: "{colors.ink-obsidian}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "40px"
---

# Design System: LinguaCraft

## Overview

**Creative North Star: "The Focused Language Studio"**

LinguaCraft is built as a crisp, tactile academic study bench where learners spend extended sessions listening, typing dictation, shadowing phonetics, reviewing SM-2 flashcards, and taking timed IELTS/TOEIC simulations. Rather than heavy gradients or ornamental chrome, the interface relies on cool slate paper canvases, high-contrast ink typography, and deliberate 2px structural borders that separate active controls from surrounding study material.

Both the light workspace and the low-glare `.dark` theme are grounded in CSS custom properties in `globals.css` paired with Tailwind CSS v4 utility classes. Interactive affordances communicate state through crisp border shifts, subtle 1px bottom-lip compression on primary actions, and clear semantic feedback tones for accuracy, warnings, and PRO tier badges.

**Key Characteristics:**
- Cool slate paper backgrounds (`--bg`, `--surface`, `--surface-muted`) paired with high-contrast slate ink (`--fg`, `--fg-muted`).
- Single focused Cobalt Signal accent for primary CTAs, active navigation pills, and keyboard focus rings.
- Tactile 2px structural borders on cards, inputs, and outline controls (`border-2`), plus a 2px bottom lip on raised primary/danger buttons.
- Complete light (`:root`) and dark (`.dark`) theme parity across marketing and workspace shells.

## Colors

The palette pairs neutral cool-slate surfaces with one disciplined cobalt primary accent and strict semantic status colors for study feedback.

### Primary
- **Cobalt Signal**: Primary action fill (`button-primary`), active sidebar navigation highlight, loading spinner accent, and brand logomark tile. Used sparingly so primary drills and submit actions always stand out.
- **Cobalt Glow**: Dark-mode primary accent (`--primary` under `.dark`) and `focus-visible` ring (`ring-blue-500`) ensuring crisp legibility against deep slate surfaces.
- **Cobalt Deep**: Hover fill and tactile bottom border (`border-b-2`) for primary buttons.

### Secondary
- **Amber Crest**: Dedicated to PRO entitlement badges, warning callouts, and `"pro"` action gradients (`from-amber-500 to-orange-500`). Never used for ordinary navigation or neutral states.

### Tertiary
- **Emerald Pass & Crimson Alert**: Reserved strictly for verified learning outcomes—correct dictation/exam answers (`--success`), destructive actions, and validation/error boundaries (`--danger`).

### Neutral
- **Slate Paper**: Page-level workspace backdrop (`--bg`) keeping prolonged study sessions calm and glare-free.
- **Pure Canvas**: Elevated card, header, modal, and input surface (`--surface`) in light mode.
- **Slate Wash**: Muted surface (`--surface-muted`) for secondary buttons, default badges, and empty-state icon wells.
- **Ink Obsidian & Slate Muted**: High-contrast primary copy (`--fg`) and secondary metadata/helper copy (`--fg-muted`).
- **Slate Hairline**: Structural divider and card/input border (`--border`).
- **Night Abyss / Night Card / Night Elevated**: Dark-theme canvas, card, and muted surface equivalents under `.dark`.

### Named Rules
**The One Accent Rule.** Cobalt Signal drives primary actions, active route indicators, and focus rings; reserve Amber Crest strictly for PRO entitlements and warnings, and Emerald/Crimson strictly for pass/fail study feedback.

**The Semantic Token Parity Rule.** Every light-mode slate surface and border must define an explicit `.dark` counterpart so theme switching preserves >=4.5:1 body text contrast.

## Typography

**Display Font:** System Sans Stack (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
**Body Font:** System Sans Stack (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)

**Character:** Zero-latency native system sans-serif keeps text razor-sharp across Windows, macOS, and mobile browsers with zero webfont flash (FOUT) during rapid flashcard and exam sessions. Weight contrast (`800` display vs `600` controls vs `400` body) and tight negative tracking on headings establish clear hierarchy.

### Hierarchy
- **Display** (800, 2.25rem–3rem, 1.15 line-height, -0.025em tracking): Landing hero and major page headings.
- **Headline** (700, 1.5rem, 1.25 line-height, -0.02em tracking): Workspace section headers (Dashboard, Analytics, Exam overview).
- **Title** (700, 1rem, 1.35 line-height): Card titles, modal titles, and feature capability headers.
- **Body** (400, 0.875rem, 1.55 line-height): Transcripts, exam prompts, descriptions, and input text (keep prose measures around 60–75ch).
- **Label** (600, 0.75rem, 1.2 line-height): Navigation links, badges, pagination counters, and form labels.

### Named Rules
**The Weight-Over-Decoration Rule.** Separate headings from study copy through font weight (700–800 vs 400) and tight tracking rather than decorative fonts or gradient text.

## Layout

Marketing pages (`MarketingShell`) center content within `max-w-6xl` to `max-w-7xl` containers with `px-4 sm:px-6` horizontal gutters and responsive 1/2/4-column grids. Workspace routes (`WorkspaceShell`) pair a sticky 64px (`h-16`) top bar with a collapsible left sidebar (`w-64` expanded, `w-16` collapsed on `md+`) that switches to an off-canvas `w-72` dialog drawer below `768px`.

Spacing follows a 4px/8px rhythm: `8px` (`gap-2`) for tight control clusters, `12px` (`gap-3`) for action bars and pagination, `16px` (`gap-4`) for grid gutters, and `20px` (`p-5`) for card interior padding.

## Elevation & Depth

LinguaCraft is flat-by-default and conveys hierarchy through 2px crisp structural borders and background surface contrast (`--bg` vs `--surface`) rather than heavy drop shadows. Subtle shadows (`shadow-sm`) rest lightly on cards, while elevated overlays (`shadow-xl`) are reserved strictly for mobile drawers and modal dialogs (`LoginModal`, `DictionaryModal`) backed by a 50%-opacity dark slate scrim.

### Shadow Vocabulary
- **Card Resting** (`box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`): Subtle lift on resting `Card` containers paired with a 2px border.
- **Drawer & Modal Overlay** (`box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1)`): Reserved for temporary top-layer dialogs and mobile navigation drawers.

### Named Rules
**The Flat-By-Default Rule.** Surfaces stay flat at rest using 2px structural borders and tonal step contrast; reserve heavy `shadow-xl` elevation strictly for drawers and modals.

## Shapes

The system uses soft, approachable geometric rounding that stays consistent across controls and containers: `8px` (`rounded-lg`) for compact `sm` buttons, `12px` (`rounded-xl`) for standard buttons, inputs, and sidebar nav items, `16px` (`rounded-2xl`) for cards and modals, and full pills (`rounded-full`) exclusively for status badges and loading spinners.

## Components

Every interactive primitive prioritizes clear hit targets, tactile feedback, and unambiguous focus indicators.

### Buttons
- **Shape:** Gently rounded (`12px` on `md`/`lg`/`icon`; `8px` on `sm`).
- **Primary:** Solid Cobalt Signal fill with a 2px Cobalt Deep bottom lip (`border-b-2`) and `1px` active press (`active:translate-y-px`), height `40px` (`md`), `0 16px` horizontal padding.
- **Hover / Focus:** Darkens to Cobalt Deep on hover; renders a 2px `focus-visible` ring with 2px offset (`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`).
- **Secondary / Outline / Ghost / Danger / Pro:** Secondary uses Slate Wash fill with 1px hairline border; Outline uses 2px border shifting to cobalt on hover; Ghost stays transparent until hovered; Danger mirrors Primary in Crimson Alert; Pro uses Amber-to-Orange highlight strictly for paid upgrade CTAs.

### Chips
- **Style:** Full pill (`rounded-full`) with 1px border, `px-2.5 py-0.5`, `12px` semibold text (`Badge`).
- **State:** Five semantic variants (`default`, `success`, `warning`, `info`, `pro`)—used strictly for status, CEFR levels, and entitlement tier tags.

### Cards / Containers
- **Corner Style:** `16px` (`rounded-2xl`).
- **Background:** Pure Canvas (`#ffffff`) in light mode; Night Card (`#0f172a`) in dark mode.
- **Shadow Strategy:** Resting `shadow-sm` backed by a `2px` border (`border-2 border-slate-200 dark:border-slate-800`).
- **Internal Padding:** `20px` (`p-5`) header and content regions (`CardHeader` uses `pb-3`; `CardContent` uses `pt-0`).

### Inputs / Fields
- **Style:** `40px` height (`h-10`), `12px` radius (`rounded-xl`), `2px` border, `8px 14px` padding.
- **Focus:** `focus-visible` 2px cobalt ring (`ring-blue-500`) without clipping layout.
- **Error / Disabled:** `hasError` switches border and focus ring to Crimson (`border-red-500 focus-visible:ring-red-500`); disabled sets `50%` opacity and `not-allowed` cursor.

### Navigation
- **Style, typography, default/hover/active states, mobile treatment:** Sticky `64px` top bar (`backdrop-blur`) across both marketing and workspace shells. Sidebar items use `12px` radius, `14px` semibold text, `aria-current="page"` cobalt-tinted active pills, desktop collapse (`w-64` <-> `w-16`), and a `w-72` modal drawer (`role="dialog" aria-modal="true"`) on mobile.

### State Boundary & Pagination
- Consistent `LoadingState` (`role="status"`), `ErrorState` (crimson-tinted card with retry action), `EmptyState` (centered icon well + optional CTA), and `DataPagination` (`aria-label="Pagination"`) keep async views predictable across all 13 modules.

## Do's and Don'ts

### Do:
- **Do** reuse `Button`, `Card`, `Badge`, `Input`, `LoadingState`, `ErrorState`, `EmptyState`, and `DataPagination` from `src/shared/ui` before creating local markup.
- **Do** preserve `<= 40px` minimum control height (`40px` `md` / `icon` buttons, `44px`+ mobile touch clearance) and visible `focus-visible` rings on every interactive element.
- **Do** keep light (`:root`) and `.dark` contrast balanced whenever adding custom status surfaces or borders.
- **Do** use `EmptyState` and `ErrorState` honestly when the backend API is unavailable or returns empty study sets.

### Don't:
- **Don't** invent webfont stacks or decorative serif headings that diverge from the zero-FOUT system sans stack.
- **Don't** place heavy drop shadows (`shadow-lg`/`shadow-xl`) on static workspace cards—keep cards flat with `2px` borders and `shadow-sm`.
- **Don't** apply Amber PRO gradients to ordinary navigation or non-PRO controls.
- **Don't** fabricate acoustic phoneme/prosody bars or official exam scores in UI copy when backend `measurementTier` is transcript-only.
