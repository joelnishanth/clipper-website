# Clipper — Marketing Site

Static marketing website for [Clipper](https://github.com/offlyn-ai/clipper) by Offlyn.ai.

## Local development

```bash
python3 -m http.server 4321
```

Open http://localhost:4321/

## Deploy

Pushes to `main` deploy automatically to GitHub Pages via Actions.

Live site: https://joelnishanth.github.io/clipper-website/

Download: https://github.com/joelnishanth/clipper-website/releases/latest/download/Clipper-latest.dmg

Color palette: [docs/color-scheme.md](docs/color-scheme.md)

Email signup: [docs/email-signup.md](docs/email-signup.md) — configure Formspree in `config.js`

Release pipeline: [docs/release-setup.md](docs/release-setup.md)

## Structure

- `config.js` — download URL + Formspree endpoint
- `index.html` — landing page
- `styles.css` / `fonts.css` — design system
- `script.js` — interactive demos (GSAP)
- `assets/` — logo and hero mock
