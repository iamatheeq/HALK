---
name: Utilitarian Financial Kernel
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a3d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7b6c'
  outline-variant: '#bccbb9'
  surface-tint: '#006e2f'
  primary: '#006e2f'
  on-primary: '#ffffff'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#4ae176'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#855300'
  on-tertiary: '#ffffff'
  tertiary-container: '#ef9900'
  on-tertiary-container: '#5c3800'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  currency-display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers a calm, deterministic, and dependable financial management interface crafted specifically for everyday household decision-makers. It rejects overwhelming fintech jargon, speculative trading gamification, and manipulative notifications in favor of structural clarity, privacy, and actionable arithmetic.

The aesthetic fuses modern minimalist utility with native mobile ergonomics. By pairing generous breathing room, structured card grouping, and sharp tabular numerals, the interface demystifies complex cash-flow dynamics—transforming household budget allocation, recurring liabilities, and surplus planning into an effortless, transparent routine.

## Colors

The color palette establishes functional clarity where every hue maps to a household financial state:

- **Primary Green (`#22C55E`):** Represents positive surplus, verified savings, complete allocations, and successful reconciliation actions.
- **Dark Slate (`#1E293B`):** Represents fixed structural obligations, primary structural headers, and committed must-pay bills.
- **Alert Red (`#EF4444`):** Flags uncovered deficits, loan penalties, overdue dates, and negative balances.
- **Amber / Orange (`#F59E0B`):** Denotes discretionary categories, flexible spending, and near-limit warnings.
- **Backgrounds & Surfaces:** A base canvas of pure `#FFFFFF` layered with `#F8FAFC` card containers and `#E2E8F0` hairline dividers ensures crisp contrast and legibility without visual fatigue. Deep `#0F172A` is reserved for foundational brand surfaces, high-contrast security indicators, and offline privacy badges.

## Typography

Typography relies on `Inter` across all text tiers. For monetary amounts, ledger balances, and financial percentages, tabular lining figures (`font-variant-numeric: tabular-nums`) must be enabled to preserve vertical decimal alignment across rows and comparative views. 

Uppercase treatments are restricted exclusively to `label-sm` metadata tags, ledger status pills, and localized offline markers to maintain an approachable, non-intimidating tone.

## Layout & Spacing

The layout is built for mobile ergonomics using a single-column fluid card model constrained between standard phone screen safe margins (16px / 1rem). 

To balance high information density with visual calm:
- Card internal paddings strictly follow `space-lg` (16px) for major balance summaries and `space-md` (12px) for transactional list items.
- Vertical section groupings enforce `space-xl` (24px) margins to prevent cognitive overload.
- Touch targets maintain an absolute minimum hit dimension of 44×44px, using invisible hit slops when compact visual icons are required.

## Elevation & Depth

Visual hierarchy is communicated through structural card surfaces and subtle low-contrast boundaries rather than heavy drop shadows:

- **Level 0 (Canvas):** Pure `#FFFFFF`, serving as the neutral floor for views.
- **Level 1 (Card Containers):** Tinted `#F8FAFC` background paired with a crisp `1px solid #E2E8F0` border.
- **Level 2 (Active/Floating Modals & Snackbars):** `#FFFFFF` surface accompanied by a diffused ambient shadow: `0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Emphasized Floating Action / Keypad):** Primary Green `#22C55E` with an ambient glow: `0 8px 20px -4px rgba(34, 197, 94, 0.35)`.

## Shapes

The design system implements a balanced rounded geometry (Level 2):
- Standard cards and sheet containers use `rounded-lg` (16px / 1rem) to frame data softly without wasting boundary space.
- Interactive controls, buttons, text inputs, and quick-filter pills employ `rounded-md` (8px / 0.5rem).
- Status indicators and categorical pill tags use full continuous rounding (`rounded-full`) for quick visual identification.

## Components

### Buttons
- **Primary:** `#22C55E` solid background with pure white typography, `font-weight: 600`, 48px height, and `rounded-md` corners. Active state dims to `#16A34A`.
- **Secondary (Liability / Bill Actions):** `#1E293B` slate background, providing authoritative weight for permanent commitments or fixed-bill payments.
- **Tertiary / Ghost:** Transparent background with `#1E293B` text, shifting to `#F1F5F9` on press.

### Cards & Ledger Blocks
- Enclosed within `#F8FAFC` with a `1px` border of `#E2E8F0`. 
- Metric headers display the category name in `body-sm` neutral slate (`#64748B`), with large tabular figures anchored below in `currency-display`.

### Input Fields
- Structured at 48px height with a `#FFFFFF` fill and a `#CBD5E1` border.
- Upon focus, transitions to a `1.5px` border of `#22C55E` accompanied by an ambient green halo ring (`rgba(34, 197, 94, 0.12)`).

### Offline Status Badge
- Anchored pill element using `#0F172A` fill and crisp `#F8FAFC` typography, housing a discrete Lucide `shield-check` or `hard-drive` icon indicating zero cloud dependencies and client-side financial encryption.

### Lists & Progress Trackers
- Segmented linear allocation progress bars with a `#E2E8F0` track. The active progress fill uses `#22C55E` for surplus headroom, smoothly transitioning to `#EF4444` when allocations exceed threshold caps.