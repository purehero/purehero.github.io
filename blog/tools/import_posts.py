# -*- coding: utf-8 -*-
"""
import_posts.py — 기존 Firestore 글을 정적 소스(posts/*.md)로 1회 이전한다.

절차
  1) 브라우저에서 블로그를 열고 관리자로 로그인한 뒤, 개발자도구 콘솔에
     tools/MIGRATION.md 의 "내보내기 스니펫"을 실행한다 → posts-export.json 다운로드.
  2) 그 파일을 blog/ (또는 아무 경로)에 두고:
         python blog/tools/import_posts.py posts-export.json
  3) posts/*.md 와 assets/ 이미지가 생성된다. build.py 로 렌더:
         python blog/tools/build.py

각 글은 다음을 수행한다:
  · coverImage / 본문 이미지(Storage URL·data URI)를 assets/ 로 내려받아 상대 경로로 치환
  · 예전 Firestore 문서 id 를 frontmatter(firestoreId)에 남겨 예전 링크 리다이렉트 지원
  · slug 는 제목에서 뽑되(영문/숫자), 뽑을 수 없으면 firestoreId 사용

의존성: 표준 라이브러리만 사용 (urllib).
"""
import base64
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import urlopen

BLOG = Path(__file__).resolve().parent.parent
POSTS_DIR = BLOG / "posts"
COVERS_DIR = BLOG / "assets" / "covers"
IMG_DIR = BLOG / "assets" / "img"


def slugify(title: str, fallback: str) -> str:
    s = (title or "").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = re.sub(r"-{2,}", "-", s)[:60].strip("-")
    return s or fallback


def to_date(created) -> str:
    """Firestore Timestamp(내보낸 형태) 또는 ISO 문자열 → YYYY-MM-DD"""
    if isinstance(created, str):
        return created[:10]
    if isinstance(created, dict):  # {seconds, nanoseconds} 형태
        secs = created.get("seconds") or created.get("_seconds")
        if secs is not None:
            from datetime import datetime, timezone
            return datetime.fromtimestamp(int(secs), tz=timezone.utc).date().isoformat()
    return ""


def ext_from(content_type: str, url: str) -> str:
    if content_type:
        if "svg" in content_type:
            return "svg"
        if "/" in content_type:
            return content_type.split("/")[1].split("+")[0].split(";")[0]
    m = re.search(r"\.(svg|png|jpe?g|gif|webp)", url, re.I)
    return m.group(1).lower() if m else "img"


def save_data_uri(uri: str, dest_dir: Path, stem: str) -> str | None:
    m = re.match(r"data:([^;,]+)(;base64)?,(.*)", uri, re.DOTALL)
    if not m:
        return None
    ctype, is_b64, data = m.group(1), m.group(2), m.group(3)
    ext = ext_from(ctype, "")
    raw = base64.b64decode(data) if is_b64 else unquote(data).encode("utf-8")
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = dest_dir / f"{stem}.{ext}"
    out.write_bytes(raw)
    return out


def download(url: str, dest_dir: Path, stem: str) -> Path | None:
    try:
        with urlopen(url, timeout=30) as r:
            ctype = r.headers.get("Content-Type", "")
            raw = r.read()
        ext = ext_from(ctype, urlparse(url).path)
        dest_dir.mkdir(parents=True, exist_ok=True)
        out = dest_dir / f"{stem}.{ext}"
        out.write_bytes(raw)
        return out
    except Exception as e:
        print(f"    ⚠ 이미지 내려받기 실패({url[:60]}…): {e}")
        return None


def localize_image(src: str, dest_dir: Path, stem: str):
    """이미지 URL/데이터URI → 로컬 파일로 저장하고 blog/ 기준 상대경로 반환.
    실패하면 원본 그대로 둔다."""
    if src.startswith("data:"):
        out = save_data_uri(src, dest_dir, stem)
    elif src.startswith("http"):
        out = download(src, dest_dir, stem)
    else:
        return src  # 이미 상대경로
    if not out:
        return src
    return "./" + out.relative_to(BLOG).as_posix()


def process_body(content: str, slug: str) -> str:
    """본문 Markdown 의 이미지(![](URL))를 로컬 자산으로 치환."""
    seen = {}
    idx = [0]

    def repl(m):
        alt, url = m.group(1), m.group(2)
        if url in seen:
            local = seen[url]
        else:
            idx[0] += 1
            local = localize_image(url, IMG_DIR, f"{slug}-{idx[0]}")
            seen[url] = local
        return f"![{alt}]({local})"

    return re.sub(r"!\[([^\]]*)\]\(([^)\s]+)[^)]*\)", repl, content)


def main():
    if len(sys.argv) < 2:
        print("사용법: python blog/tools/import_posts.py <posts-export.json>")
        sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    if isinstance(data, dict):
        data = data.get("posts", [])
    POSTS_DIR.mkdir(parents=True, exist_ok=True)

    used_slugs = set()
    for post in data:
        fid = post.get("id", "")
        slug = slugify(post.get("title", ""), fid or "post")
        # slug 충돌 방지
        base, n = slug, 1
        while slug in used_slugs:
            n += 1
            slug = f"{base}-{n}"
        used_slugs.add(slug)

        date = to_date(post.get("createdAt")) or "1970-01-01"
        cover = post.get("coverImage", "") or ""
        if cover:
            cover = localize_image(cover, COVERS_DIR, slug)
        content = process_body(post.get("content", ""), slug)

        tags = post.get("tags", []) or []
        fm = {
            "title": post.get("title", slug),
            "slug": slug,
            "date": date,
            "tags": tags,
            "cover": cover,
            "published": post.get("published", True) is not False,
        }
        if fid:
            fm["firestoreId"] = fid
        if post.get("authorEmail"):
            fm["authorEmail"] = post["authorEmail"]

        # frontmatter 를 손으로 직렬화(안정적 순서, 한글 그대로)
        def yval(v):
            if isinstance(v, bool):
                return "true" if v else "false"
            if isinstance(v, list):
                return "[" + ", ".join(json.dumps(x, ensure_ascii=False) for x in v) + "]"
            return json.dumps(v, ensure_ascii=False)

        lines = ["---"]
        for k in ["title", "slug", "date", "tags", "cover", "published", "firestoreId", "authorEmail"]:
            if k in fm:
                lines.append(f"{k}: {yval(fm[k])}")
        lines.append("---")
        lines.append("")
        md = "\n".join(lines) + content.strip() + "\n"

        out = POSTS_DIR / f"{date}-{slug}.md"
        out.write_text(md, encoding="utf-8")
        print(f"  ✓ {out.relative_to(BLOG).as_posix()}")

    print(f"\n완료 — {len(data)}편 이전. 이제 `python blog/tools/build.py` 로 렌더하세요.")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
