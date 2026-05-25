# Clipper Marketing Site — Color Scheme

> **Updated**: 2026-05-24  
> **Source**: `styles.css` in this repo

---

## Brand purple

| Name | Hex | CSS variable | Usage |
|---|---|---|---|
| **Primary** | `#6E5CE1` | `--brand` | Buttons, links, selection, gradients |
| **Light** | `#7851E0` | `--brand-light` | Hover, gradient mid, dark-section labels |
| **Dark** | `#4B34CB` | `--brand-dark` | Note headings, active tabs, badge text |
| **Indigo** | `#6664E1` | — | Hero mock SVG accent |

---

## Neutrals

| Hex | Variable | Usage |
|---|---|---|
| `#FAFAFA` | `--zinc-50` | Page background |
| `#F4F4F5` | `--zinc-100` | Alt sections |
| `#E4E4E7` | `--zinc-200` | Borders |
| `#D4D4D8` | `--zinc-300` | Muted text |
| `#52525B` | `--zinc-600` | Metadata |
| `#3F3F46` | `--zinc-700` / `--text-body` | Body text |
| `#27272A` | `--zinc-800` | Footer |
| `#18181B` | `--zinc-900` | Dark bands |
| `#222222` | `--text-primary` | Headings |
| `#E1E1E1` | `--tile-bg` | Tiles |
| `#D4D4D4` | `--tile-mid` | Tiles |
| `#C0C0C0` | `--border-gray` | Borders |

---

## Semantic colors

| Hex | Usage |
|---|---|
| `#28C840` | Live transcript dot, macOS green chrome |
| `#FF5F57` | macOS close dot |
| `#FEBC2E` | macOS minimize dot |
| `#FFFFFF` | Cards, windows |
| `#F3F1FC` | Demo section gradient mid |
| `#FDFCFF` | Notes panel gradient end |

---

## Brand RGBA overlays

| Value | Usage |
|---|---|
| `rgba(110, 92, 225, 0.22)` | Notes window border |
| `rgba(110, 92, 225, 0.14)` | Transcript bubble (us) |
| `rgba(110, 92, 225, 0.10)` | On-device badges |
| `rgba(110, 92, 225, 0.35)` | Card hover, send-button shadow |
| `rgba(168, 168, 168, 0.25)` | `--soft-shadow` |

---

## Typography

| Role | Font |
|---|---|
| Headings / buttons | **New Spirit** |
| Body / nav | **Paralucent Text** |

See `fonts.css` for Typekit `@font-face` URLs.

---

## Full `:root` tokens

```css
:root {
  --brand: #6e5ce1;
  --brand-light: #7851e0;
  --brand-dark: #4b34cb;
  --text-primary: #222;
  --text-body: #3f3f46;
  --zinc-50: #fafafa;
  --zinc-100: #f4f4f5;
  --zinc-200: #e4e4e7;
  --zinc-300: #d4d4d8;
  --zinc-600: #52525b;
  --zinc-700: #3f3f46;
  --zinc-800: #27272a;
  --zinc-900: #18181b;
}
```
