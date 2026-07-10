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

The site itself has no build step, but **the blog has a Python build step** (`blog/tools/build.py`) that renders Markdown sources to static HTML. For the blog, ES modules and Google popup login break under `file://`, so use a local server:

```bash
cd blog
python tools/build.py        # posts/*.md → p/*.html + index.html 갱신
python -m http.server 8080   # http://localhost:8080/
```

`blog/preview.html` renders sample posts through all themes **without Firebase** — use it to check template/layout changes before touching real data.

## Blog Architecture (`blog/`)

**Static blog.** Posts are Markdown files committed to the repo (`posts/*.md`, YAML frontmatter); `tools/build.py` (Python, `markdown-it-py` + `pyyaml`) renders each into a static page `p/<slug>.html` **with the article body baked into the HTML** and refreshes a JSON data island in `index.html`. Reading a post hits no backend. Firebase JS SDK v10 (gstatic CDN, ESM) is used **only for comments + Google sign-in**. Code highlighting (`highlight.js`) runs client-side on the already-rendered `<pre><code>`.

The source of truth is `posts/*.md`, **not** Firestore. `slug` is the URL/filename. Assets (`cover`, body images) live in `assets/` and are referenced blog-root-relative (`./assets/…`); the build rewrites them to `../assets/…` on post pages. Publishing = write a `.md`, run `build.py`, commit.

Pages/files and how they interlock:

- `tools/build.py` — the generator. Renders `posts/*.md` → `p/<slug>.html`, updates the `#posts-data` JSON island in `index.html`, and regenerates `post.html` (a redirector from old `?id=<firestoreId>` links to new slugs). Ports `common.js`'s excerpt/readingTime/slug/YouTube-embed logic to keep output consistent.
- `firebase-config.js` — `firebaseConfig`, `ADMIN_EMAILS`, `SITE`. **`ADMIN_EMAILS` must stay identical to `adminEmails()` in `firestore.rules`** (rules are comments-only now; deployed by pasting into the Firebase console).
- `common.js` — theme system (`THEMES`, `themeDef`, localStorage), shared header/footer, `highlightWithin`, and the **comments-only** Firebase handles (auth + `posts/<slug>/comments`). No longer imports `marked`/`DOMPurify` or reads the `posts` collection.
- `post.js` — client logic for `p/<slug>.html`: highlight, code-copy, TOC (from build-assigned heading ids), reading progress, live scores, comments. Does not render the body (baked).
- `templates.js` — home hero/card/list HTML per active theme's layout; `hrefOf` links to `./p/<slug>.html`.
- `style.css` — per-theme palettes in `:root[data-theme="…"]`; layout driven by `data-grid`/`data-hero`/`data-header`/`.layout[data-sidebar]`, decoupled from theme ids.

Pages under `p/` are one directory deep, so `common.js`/`post.js` resolve links via `document.body.dataset.basedir` (`"../"` on post pages, default `"./"`).

### Theme system

A "theme" is a full template, not just colors: each `THEMES` entry in `common.js` carries a `layout` object (`header`, `hero`, `grid`, `sidebar`, `container`) that restructures the home page. To add a theme: add a `THEMES` entry (set `dark: true` for dark themes — code highlighting switches automatically) and, if needed, a palette block in `style.css`. Verify with `preview.html`.

### Publishing posts

The `/tech-post` slash command (`.claude/commands/tech-post.md`) is the established workflow: research a topic, write a Korean how-to Markdown post (≥4 `##` sections for auto-TOC, fenced code blocks with language, `## 참고 자료` sources, 3–5 tags reusing existing ones), generate a cover SVG via `tools/covers.py` saved to `assets/covers/<slug>.svg`, write `posts/<date>-<slug>.md`, run `build.py`, and hand off a git-commit command.

### Migrating legacy Firestore posts

`tools/MIGRATION.md` + `tools/import_posts.py` do a one-time export (browser console snippet) → `posts/*.md` conversion, downloading Storage/data-URI images into `assets/`. Old `post.html?id=…` links keep working via the redirector (frontmatter `firestoreId` → slug map baked by `build.py`).
