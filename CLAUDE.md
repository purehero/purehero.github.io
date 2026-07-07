# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

purehero.github.io — a **GitHub Pages static site**. There is no build system, package manager, linter, or test suite. Everything is plain HTML/CSS/JS served as-is; pushing to `main` deploys the site. Documentation, UI text, and commit messages are in **Korean**.

Top-level areas:

- `blog/` — Firebase-backed tech blog (the only multi-file "app" in the repo; see below)
- `apps/` — standalone, self-contained single-file HTML web tools (`api_tester.html`, `dex_inspector.html`), listed in `apps/index.html`
- `doc/privacy/<android.package>/` — privacy policy pages for the author's Android apps
- `video/<android.package>/` — demo videos for those apps
- `app-ads.txt` — AdMob verification

## Running Locally

No build step. For the blog, ES modules and Google popup login break under `file://`, so use a local server:

```bash
cd blog
python -m http.server 8080   # http://localhost:8080/
```

`blog/preview.html` renders sample posts through all themes **without Firebase** — use it to check template/layout changes before touching real data.

## Blog Architecture (`blog/`)

Serverless blog: static pages + Firebase JS SDK v10 loaded from the gstatic CDN as ES modules (no npm). Data lives in **Firestore** (`posts` collection, `comments` subcollection), images in **Storage** (`blog/images/…`), auth via Google sign-in. Markdown is rendered with `marked` + `DOMPurify` + `highlight.js` (all CDN ESM imports in `common.js`).

Pages: `index.html` (list/tags/search), `post.html?id=…` (Markdown render, TOC, comments), `write.html` (admin-only editor with image drag-and-drop upload).

Key files and how they interlock:

- `firebase-config.js` — `firebaseConfig`, `ADMIN_EMAILS`, `SITE` metadata. **`ADMIN_EMAILS` must stay identical to the `adminEmails()` lists in `firestore.rules` and `storage.rules`** — changing one without the others breaks write permissions. Rules are deployed by pasting into the Firebase console (not by a CLI in this repo).
- `common.js` — initializes Firebase and re-exports Firestore/Storage/Auth helpers for all pages; also owns the theme system (`THEMES`, `themeDef`, localStorage persistence) and shared header/auth UI.
- `templates.js` — renders hero/card/list HTML according to the active theme's layout.
- `style.css` — per-theme palettes in `:root[data-theme="…"]` blocks; layout CSS is driven by `data-grid` / `data-hero` / `data-header` / `.layout[data-sidebar]` attributes, deliberately decoupled from theme ids.

### Theme system

A "theme" is a full template, not just colors: each `THEMES` entry in `common.js` carries a `layout` object (`header`, `hero`, `grid`, `sidebar`, `container`) that restructures the home page. To add a theme: add a `THEMES` entry (set `dark: true` for dark themes — code highlighting switches automatically) and, if needed, a palette block in `style.css`. Verify with `preview.html`.

### Publishing posts

The `/tech-post` slash command (`.claude/commands/tech-post.md`) is the established workflow for authoring blog posts: research a topic, write a Korean how-to style Markdown post following the blog's conventions (≥2 `##` sections for auto-TOC, fenced code blocks with language, `## 참고 자료` sources section, 3–5 tags reusing existing ones), and output both a `write.html` paste-ready version and a browser-console snippet that inserts the post via `common.js` while logged in as an admin.

Firestore queries on the home page need a composite index on `posts` (`published` asc + `createdAt` desc).
