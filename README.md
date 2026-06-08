# Clipper — Marketing Site

Static marketing website for [Clipper](https://offlyn.ai) by Offlyn.ai.

## Local development

```bash
python3 -m http.server 4321
```

Open http://localhost:4321/

## Deploy

Pushes to `main` deploy automatically to GitHub Pages via Actions.

Live site: https://clipper.offlyn.ai

Download: https://github.com/joelnishanth/clipper-website/releases/download/v1.8.0/Clipper-1.8.0.dmg

Color palette: [docs/color-scheme.md](docs/color-scheme.md)

Email signup: [docs/email-signup.md](docs/email-signup.md) — configure Formspree in `config.js`

Release pipeline: Runs from a private repo. Only the final DMG is published here as a GitHub Release.

## Structure

- `config.js` — download URL + Formspree endpoint
- `index.html` — landing page
- `styles.css` / `fonts.css` — design system
- `script.js` — interactive demos (GSAP)
- `assets/` — logo and hero mock
