# Setup guide (website)

> **Updated**: 2026-05-28

Public first-time setup documentation for Clipper, published at:

- **URL:** `https://clipper.offlyn.ai/setup.html`
- **Source:** [`setup.html`](../setup.html), [`guide.css`](../guide.css)
- **Screenshots:** [`assets/setup/`](../assets/setup/)

## Purpose

User-facing install and onboarding walkthrough for the DMG direct-download channel. Modeled on Granola's help-center setup guide, adapted for Clipper's local-first flow (no sign-in, on-device models, macOS permissions).

## When to update

Refresh `setup.html` when any of these change:

- Onboarding steps or copy in `OnboardingView.swift`
- Required permissions or System Settings paths
- Minimum macOS version or RAM/disk requirements
- Download or update flow (Sparkle, Formspree modal)
- Settings tab names (Connectors, Detection, Models, Recording)

## Screenshot inventory

| ID | File | Section |
|---|---|---|
| `install-dmg` | `install-dmg.png` | Installing Clipper |
| `settings-connectors` | `settings-connectors.png` | Connect your calendar |
| `quick-note-toolbar` | `quick-note-toolbar.png` | Test your first capture — Quick note |
| `url-import` | `url-import.png` | Test your first capture — Import from URL |
| `meeting-banner` | `meeting-banner.png` | Test your first capture — Record a meeting |
| `recording-active` | `recording-active.png` | Test your first capture — Record a meeting |
| `notes-enhancing` | `notes-enhancing.png` | Test your first capture — Record a meeting |
| `home-view` | `home-view.png` | You're all set |

See [`assets/setup/README.md`](../assets/setup/README.md) for replacement guidelines.

## Local preview

```bash
cd website && python3 -m http.server 4321
```

Open http://localhost:4321/setup.html

## Deploy

Push to `clipper-website` `main` — GitHub Pages deploys via [`deploy-website.yml`](../.github/workflows/deploy-website.yml).
