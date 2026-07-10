# -*- coding: utf-8 -*-
"""
build.py — 정적 블로그 빌드 스크립트

posts/*.md (YAML frontmatter + Markdown 본문) 를 읽어
  · p/<slug>.html      글 하나마다 본문이 baked-in 된 정적 페이지
  · index.html         목록 데이터(JSON 아일랜드) 갱신
  · post.html          예전 ?id=<firestoreId> 링크를 새 slug 로 넘기는 리다이렉터
를 생성한다.

렌더 규칙은 blog/common.js 의 클라이언트 유틸(excerpt/readingTime/slugify/
youtube 임베드)과 동작이 일치하도록 파이썬으로 포팅했다.

    python blog/tools/build.py

의존성: markdown-it-py, pyyaml  (표준 pip 패키지)
"""
import html
import json
import re
import sys
from datetime import date as _date
from pathlib import Path

import yaml
from markdown_it import MarkdownIt

# Windows 콘솔(cp949)에서도 이모지/✓ 출력이 깨지지 않도록
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# ---- 경로 -------------------------------------------------------------------
BLOG = Path(__file__).resolve().parent.parent          # …/blog
POSTS_DIR = BLOG / "posts"
OUT_DIR = BLOG / "p"
INDEX = BLOG / "index.html"
REDIRECT = BLOG / "post.html"

# ---- Markdown 렌더러 --------------------------------------------------------
# html=True: 소스는 레포에 커밋된 신뢰된 저자 콘텐츠이므로 원시 HTML 허용
# (본문에 <div class="livescores"> 같은 위젯을 직접 넣을 수 있게 한다)
md = MarkdownIt("commonmark", {"html": True, "breaks": False, "linkify": False})
md.enable(["table", "strikethrough"])

# ---- common.js 포팅 유틸 ----------------------------------------------------
def excerpt_from(markdown: str, length: int = 140) -> str:
    text = markdown or ""
    text = re.sub(r"```[\s\S]*?```", " ", text)          # 코드 블록 제거
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)     # 이미지 제거
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)  # 링크 → 텍스트
    text = re.sub(r"[#>*_`~-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:length].strip() + "…" if len(text) > length else text


def reading_time(markdown: str) -> int:
    text = markdown or ""
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"\s", "", text)
    return max(1, round(len(text) / 600))


def slugify_heading(text: str) -> str:
    s = (text or "").lower()
    s = re.sub(r"[^\w가-힣\s-]", "", s, flags=re.UNICODE)
    s = s.strip()
    s = re.sub(r"\s+", "-", s)[:60]
    return s or "section"


def esc(s: str) -> str:
    return html.escape(s or "", quote=True)


# 단독 줄 유튜브 링크(<p><a>…</a></p>)를 반응형 임베드로 (common.js embedYouTube 포팅)
_YT_RE = re.compile(
    r'<p>\s*<a href="https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([\w-]{11})[^"]*"[^>]*>.*?</a>\s*</p>',
    re.IGNORECASE | re.DOTALL,
)


def embed_youtube(rendered: str) -> str:
    return _YT_RE.sub(
        lambda m: (
            '<div class="video-embed"><iframe '
            f'src="https://www.youtube-nocookie.com/embed/{m.group(1)}" '
            'title="YouTube video player" '
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '
            "allowfullscreen></iframe></div>"
        ),
        rendered,
    )


# 렌더된 HTML 의 h2/h3 에 고유 id 부여 (common.js buildToc 와 동일한 slug 규칙)
_H_RE = re.compile(r"<h([23])>(.*?)</h\1>", re.IGNORECASE | re.DOTALL)


def add_heading_ids(rendered: str):
    seen: dict[str, int] = {}
    headings: list[tuple[str, int, str]] = []  # (id, level, text)

    def repl(m: re.Match) -> str:
        level = int(m.group(1))
        inner = m.group(2)
        text = re.sub(r"<[^>]+>", "", inner)          # 태그 제거 → 텍스트
        text = html.unescape(text).strip()
        base = slugify_heading(text)
        seen[base] = seen.get(base, 0) + 1
        hid = base if seen[base] == 1 else f"{base}-{seen[base]}"
        headings.append((hid, level, text))
        return f'<h{level} id="{hid}">{inner}</h{level}>'

    return _H_RE.sub(repl, rendered), headings


# 자산 경로 보정: frontmatter/본문의 경로는 blog/ 기준으로 쓰고,
# 출력 위치에 맞는 접두사(index=./, post 페이지=../)를 붙인다.
# 절대 URL·data:·//·/ 로 시작하면 그대로 둔다.
_ABS_RE = re.compile(r"^(https?:|data:|mailto:|//|/|#)", re.IGNORECASE)


def asset(prefix: str, path: str) -> str:
    if not path or _ABS_RE.match(path):
        return path
    return prefix + re.sub(r"^\./", "", path)


# 렌더된 본문의 상대 경로 자산(src/href)을 post 페이지 기준(../)으로 보정
def reroot_body(rendered: str) -> str:
    def fix(m: re.Match) -> str:
        attr, url = m.group(1), m.group(2)
        if _ABS_RE.match(url):
            return m.group(0)
        return f'{attr}="../{re.sub(r"^\\./", "", url)}"'

    return re.sub(r'\b(src|href)="([^"]*)"', fix, rendered)


def fmt_date(iso: str) -> str:
    try:
        y, m, d = (int(x) for x in str(iso)[:10].split("-"))
        return f"{y}년 {m}월 {d}일"
    except Exception:
        return str(iso or "")


# ---- 글 로드 ----------------------------------------------------------------
_FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)


def load_posts():
    posts = []
    for path in sorted(POSTS_DIR.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        m = _FM_RE.match(raw)
        if not m:
            print(f"  ⚠ frontmatter 없음, 건너뜀: {path.name}")
            continue
        meta = yaml.safe_load(m.group(1)) or {}
        body = m.group(2)
        slug = meta.get("slug") or path.stem
        posts.append({
            "slug": slug,
            "title": meta.get("title", slug),
            "date": str(meta.get("date", "")),
            "tags": meta.get("tags", []) or [],
            "cover": meta.get("cover", ""),
            "published": meta.get("published", True) is not False,
            "firestoreId": meta.get("firestoreId", ""),
            "authorEmail": meta.get("authorEmail", ""),
            "body": body,
            "_file": path.name,
        })
    # 최신 글이 앞에 (날짜 내림차순, 동일 날짜는 파일명 역순)
    posts.sort(key=lambda p: (p["date"], p["_file"]), reverse=True)
    return posts


# ---- 페이지 템플릿 ----------------------------------------------------------
HEAD = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} · purehero Tech Guide</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
{og_image}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800;900&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
<link id="hljs-light" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css">
<link id="hljs-dark" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css" disabled>
<script>
  (function () {{ try {{ document.documentElement.dataset.theme = localStorage.getItem("blog-theme") || "mono"; }} catch (e) {{}} }})();
</script>
</head>
<body data-slug="{slug}" data-basedir="../">
<div class="read-progress" id="readProgress"></div>

<main class="layout" id="layout">
  <article>
    <div id="articleRoot">
      <div class="article-head">
        <span class="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <div class="meta">
          <span>{date_fmt}</span>
          <span>·</span><span>약 {rt}분 읽기</span>
          <span id="viewCount" class="views" hidden></span>
        </div>
        <div class="tags">{tags}</div>
        {cover}
      </div>
      <div class="article" id="articleBody">{body}</div>
      <div class="btn-row share-row">
        <button class="btn" id="copyLinkBtn" type="button">🔗 링크 복사</button>
      </div>
      <nav class="post-nav" id="postNav">{postnav}</nav>
    </div>

    <section id="comments" class="comments">
      <h2>댓글 <span id="commentCount"></span></h2>
      <div id="commentList"></div>
      <div id="commentFormWrap"></div>
    </section>
  </article>

  <aside class="sidebar">
    <div class="side-box toc-box hidden" id="tocBox">
      <h3>목차</h3>
      <nav id="toc" class="toc"></nav>
    </div>
  </aside>
</main>

<script type="module" src="../post.js"></script>
</body>
</html>
"""


def render_post_page(post, older, newer):
    rendered = embed_youtube(md.render(post["body"]))
    rendered, _headings = add_heading_ids(rendered)
    rendered = reroot_body(rendered)

    tags_html = "".join(
        f'<a class="tag" href="../index.html?tag={esc(t)}">{esc(t)}</a>' for t in post["tags"]
    )
    cover = asset("../", post["cover"])
    cover_html = f'<img class="cover" src="{esc(cover)}" alt="">' if cover else ""
    og_image = f'<meta property="og:image" content="{esc(cover)}">' if cover else ""

    def nav_item(p, cls, label):
        if not p:
            return f'<span class="pn {cls} empty-slot"></span>'
        return (
            f'<a class="pn {cls}" href="./{esc(p["slug"])}.html">'
            f'<span class="pn-label">{label}</span>'
            f'<span class="pn-title">{esc(p["title"])}</span></a>'
        )

    postnav = nav_item(older, "prev", "← 이전 글") + nav_item(newer, "next", "다음 글 →")

    return HEAD.format(
        title=esc(post["title"]),
        desc=esc(excerpt_from(post["body"])),
        og_image=og_image,
        slug=esc(post["slug"]),
        eyebrow=esc(post["tags"][0] if post["tags"] else "GUIDE"),
        date_fmt=fmt_date(post["date"]),
        rt=reading_time(post["body"]),
        tags=tags_html,
        cover=cover_html,
        body=rendered,
        postnav=postnav,
    )


# ---- index.html JSON 아일랜드 갱신 ------------------------------------------
ISLAND_RE = re.compile(
    r'(<script id="posts-data" type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def update_index(pub_posts):
    data = [
        {
            "slug": p["slug"],
            "title": p["title"],
            "excerpt": excerpt_from(p["body"]),
            "coverImage": asset("./", p["cover"]),
            "tags": p["tags"],
            "date": p["date"],
        }
        for p in pub_posts
    ]
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    text = INDEX.read_text(encoding="utf-8")
    if not ISLAND_RE.search(text):
        print("  ⚠ index.html 에 posts-data 아일랜드가 없습니다. index 갱신 건너뜀.")
        return
    text = ISLAND_RE.sub(lambda m: m.group(1) + payload + m.group(3), text)
    INDEX.write_text(text, encoding="utf-8")


# ---- post.html 리다이렉터 (예전 ?id= 링크 호환) -----------------------------
REDIRECT_TMPL = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>이동 중… · purehero Tech Guide</title>
<script>
  // 예전 링크(post.html?id=<firestoreId> 또는 ?slug=)를 새 정적 경로로 넘긴다.
  var MAP = {map};
  var q = new URLSearchParams(location.search);
  var slug = q.get("slug") || MAP[q.get("id")] || "";
  location.replace(slug ? ("./p/" + slug + ".html") : "./index.html");
</script>
</head>
<body></body>
</html>
"""


def write_redirect(pub_posts):
    idmap = {p["firestoreId"]: p["slug"] for p in pub_posts if p["firestoreId"]}
    REDIRECT.write_text(
        REDIRECT_TMPL.format(map=json.dumps(idmap, ensure_ascii=False)),
        encoding="utf-8",
    )


# ---- 메인 ------------------------------------------------------------------
def main():
    if not POSTS_DIR.exists():
        print(f"posts 디렉터리가 없습니다: {POSTS_DIR}")
        sys.exit(1)

    all_posts = load_posts()
    pub = [p for p in all_posts if p["published"]]
    OUT_DIR.mkdir(exist_ok=True)

    # 오래된 산출물 정리 (현재 발행된 slug 목록에 없는 p/*.html 삭제)
    keep = {p["slug"] for p in pub}
    for f in OUT_DIR.glob("*.html"):
        if f.stem not in keep:
            f.unlink()
            print(f"  🗑 제거: p/{f.name}")

    # 각 글 렌더 (pub 는 최신순 → older=i+1, newer=i-1)
    for i, post in enumerate(pub):
        older = pub[i + 1] if i + 1 < len(pub) else None
        newer = pub[i - 1] if i - 1 >= 0 else None
        (OUT_DIR / f"{post['slug']}.html").write_text(
            render_post_page(post, older, newer), encoding="utf-8"
        )
        print(f"  ✓ p/{post['slug']}.html")

    update_index(pub)
    write_redirect(pub)

    drafts = len(all_posts) - len(pub)
    print(f"\n완료 — 발행 {len(pub)}편"
          + (f", 초안(미발행) {drafts}편 제외" if drafts else "")
          + f".  {_date.today().isoformat()} 기준 index/post.html 갱신됨.")


if __name__ == "__main__":
    main()
