# Cortex — Landing Page

The marketing / download site for **[Cortex](https://github.com/wasifhaq434701-png/Cortex)**, a local-first AI Data Intelligence OS. Pure static HTML/CSS/JS — no build step — hosted free on **GitHub Pages**.

Live (after deploy): **https://wasifhaq434701-png.github.io/cortex-web/**

---

## How downloads work

The `.exe` / `.dmg` / `.AppImage` installers are **not** stored in this repo (GitHub Pages blocks files over 100 MB). Instead they live as **GitHub Releases on the Cortex code repo**, and this page reads the **latest release via the GitHub API** and wires each OS button to the matching asset automatically.

- Publish a release → the buttons light up with the new version, date, and size.
- No release yet (or an asset missing) → that button shows **"Coming soon"**.
- **You never edit this site to ship a new build.**

All of it is driven by one config block at the top of [`assets/js/main.js`](assets/js/main.js):

```js
const REPO = "wasifhaq434701-png/Cortex";
const ASSET_MATCHERS = {
  windows:   /\.(exe|msi)$/i,
  mac_arm:   /(aarch64|arm64).*\.dmg$/i,
  mac_intel: /(x64|x86_64|intel).*\.dmg$/i,
  linux:     /\.appimage$/i,
};
```

Assets are matched by **filename pattern**, so Tauri's default versioned names (e.g. `Cortex_0.7.0_aarch64.dmg`, `Cortex_0.7.0_x64-setup.exe`) work with **no renaming** — just make sure each macOS `.dmg` filename contains `aarch64`/`arm64` or `x64`/`intel`.

### Publish a new version (add)
Via the GitHub web UI: Cortex repo → **Releases → Draft a new release** → tag it (e.g. `v0.7.0`) → drag in the `.exe` / `.dmg` / `.AppImage` → **Publish**. Or with the CLI:

```bash
gh release create v0.7.0 \
  Cortex_0.7.0_x64-setup.exe \
  Cortex_0.7.0_aarch64.dmg \
  Cortex_0.7.0_x64.dmg \
  --repo wasifhaq434701-png/Cortex \
  --title "Cortex 0.7.0" --notes "What's new…"
```

### Update or remove
- **Update:** publish a newer release — the site always points at the latest.
- **Remove a file:** edit the release and delete the asset (or delete the release) → that button returns to "Coming soon".

---

## Deploy to GitHub Pages

```bash
cd /Users/mohammedwasifulhaq/Projects/Mind/cortex-web
git init
git add .
git commit -m "Cortex landing page"
git branch -M main
# create an empty repo named cortex-web on github.com, then:
git remote add origin https://github.com/wasifhaq434701-png/cortex-web.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `(root)` → Save.**
The site goes live in ~1 minute at `https://wasifhaq434701-png.github.io/cortex-web/`.

> `.nojekyll` is included so GitHub serves the files as-is (no Jekyll processing). All asset paths are **relative**, so the project sub-path works correctly.

---

## Add your screenshots

Drop PNGs into [`assets/img/`](assets/img/) using the names listed in `assets/img/.gitkeep` (they match the app README's screenshots, so you can copy the same files from `mind-palace/docs/images/`). Until added, gallery tiles render as empty dark panels.

## Customize

- **Text / sections:** `index.html`
- **Theme (navy-glass, cyan accent + amber echo):** CSS variables at the top of `assets/css/style.css`
- **Logo / favicon / social card:** `assets/img/logo.png`
