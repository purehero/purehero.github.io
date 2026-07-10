# purehero · Tech Guide 블로그

**정적 블로그**입니다. 글은 `posts/*.md` 소스로 커밋하고, 빌드 스크립트가 이를
정적 HTML(`p/<slug>.html`)로 렌더합니다. GitHub Pages 가 파일을 그대로 서빙하며,
**글을 읽는 데는 백엔드가 필요 없습니다.** Firebase 는 **댓글 + 로그인**에만 씁니다.

- **홈** `index.html` — 글 목록, 태그 필터, 검색 (목록 데이터는 빌드가 심는 JSON 아일랜드)
- **글 상세** `p/<slug>.html` — 본문이 baked 된 정적 페이지 + 목차(TOC) + 댓글
- **발행** `posts/*.md` 작성 → `python tools/build.py` → git 커밋

## 발행 워크플로우

```bash
# 1) 글 소스 작성: blog/posts/<날짜>-<slug>.md (아래 형식)
# 2) (선택) 표지 SVG 생성: blog/assets/covers/<slug>.svg
# 3) 빌드
python tools/build.py           # (레포 루트에서라면 python blog/tools/build.py)
# 4) 로컬 확인
python -m http.server 8080      # http://localhost:8080/
# 5) 배포
git add . && git commit -m "blog: <제목>" && git push
```

`/tech-post` 슬래시 커맨드가 이 과정을 자동화합니다(조사 → 작성 → 표지 → 빌드).

### 글 소스 형식 (`posts/*.md`)

```markdown
---
title: "글 제목"
slug: "post-slug"          # p/<slug>.html · URL · 파일명이 이 값으로 통일
date: "2026-07-08"         # YYYY-MM-DD
tags: ["하우투", "웹"]      # 3~5개
cover: "./assets/covers/post-slug.svg"   # blog/ 기준 상대경로 (선택)
published: true            # false 면 초안 — 빌드에서 제외
---

여기부터 본문 Markdown …
```

- 자산(`cover`, 본문 이미지)은 **blog/ 기준 상대경로**로 쓴다. 빌드가 정적 글 페이지에서
  `../assets/…` 로 자동 보정한다.
- 본문의 단독 줄 유튜브 링크는 빌드가 반응형 임베드로 바꾼다.
- 코드 하이라이트·목차·읽기 진행률·댓글은 클라이언트 JS([`post.js`](post.js))가 처리하지만,
  **본문을 가져오려 네트워크를 타지 않는다** — 이미 HTML 에 들어 있다.

## 파일 구조

```
blog/
  posts/*.md              # 글 소스 (source of truth)
  assets/covers/*.svg     # 표지 이미지 (레포 커밋)
  assets/img/*            # 본문 이미지 (레포 커밋)
  p/<slug>.html           # ← 빌드 산출물 (본문 baked)
  index.html              # 홈 (목록 JSON 아일랜드를 빌드가 갱신)
  post.html               # 예전 ?id= 링크 → 새 slug 리다이렉터 (빌드 생성)
  common.js               # 테마·헤더·코드 하이라이트·댓글용 Firebase
  post.js                 # 글 페이지 클라이언트 로직
  templates.js            # 홈 히어로/카드/목록 렌더러
  style.css               # 테마별 팔레트 + 레이아웃
  firebase-config.js      # firebaseConfig · ADMIN_EMAILS · SITE
  firestore.rules         # 댓글 전용 규칙 (콘솔에 붙여넣어 배포)
  tools/
    build.py              # 빌드: md → p/*.html + index 갱신
    covers.py             # 15가지 표지 SVG 생성기
    import_posts.py       # 기존 Firestore 글 1회 이전 (MIGRATION.md 참고)
    MIGRATION.md          # 마이그레이션 절차 + 내보내기 스니펫
```

## Firebase (댓글 + 로그인 전용)

정적 사이트에는 서버가 없으므로 댓글은 Firestore 에 저장합니다.

1. `firebase-config.js` 의 `firebaseConfig` / `ADMIN_EMAILS` / `SITE` 확인
   - ⚠️ `ADMIN_EMAILS` 는 [`firestore.rules`](firestore.rules) 의 `adminEmails()` 목록과 **동일하게** 유지
2. **Firestore > 규칙** 탭에 [`firestore.rules`](firestore.rules) 붙여넣고 게시
   - 댓글 경로: `posts/{slug}/comments/{commentId}` (slug = 정적 글 파일명)
3. **Authentication > Google** 로그인 사용 설정, **승인된 도메인**에 배포 도메인 추가
   (`purehero.github.io`, 로컬 테스트 시 `localhost`)

> 글 목록/본문은 더 이상 Firestore 를 읽지 않으므로 posts 문서·복합 색인·Storage 규칙은 필요 없습니다.

## 기존 글 이전 (1회)

Firestore 에 남아 있던 기존 글을 `posts/*.md` 로 옮기려면 [`tools/MIGRATION.md`](tools/MIGRATION.md)
를 따르세요. 브라우저 콘솔에서 글을 내보내고 `import_posts.py` 로 변환합니다.

## 테마 (= 전체 템플릿)

헤더의 **테마 선택기**로 7가지 템플릿을 즉시 전환합니다. 테마는 색만 바꾸는 것이
아니라 **헤더 배치·히어로 형태·목록 컬럼·사이드바 유무·컨테이너 폭**까지 바꿉니다.
선택은 `localStorage`에 저장됩니다.

| 테마 | 헤더 | 히어로 | 목록 | 사이드바 |
|------|------|--------|------|----------|
| `mono` 클린 리스트 (기본) | 인라인 | 가로 고정글 | 왼쪽썸네일 리스트 | 우측 |
| `paper` 따뜻한 매거진 | 중앙 | 대형 스크림 | 2단 그리드 | 우측 |
| `classic` 블루 그리드 | 인라인 | 대형 스크림 | 2단 그리드 | 우측 |
| `magazine` 뉴스 매거진 | 중앙 | 피처row(1+2) | 3단 그리드 | 없음 |
| `editorial` 에디토리얼 | 중앙 | 없음 | 단일 스택 | 없음 |
| `midnight` 미드나잇 (다크) | 인라인 | 대형 스크림 | 2단 그리드 | 우측 |
| `carbon` 카본 (다크) | 인라인 | 피처row(1+2) | 3단 그리드 | 없음 |

- **팔레트/폰트**: [`style.css`](style.css) 의 `:root[data-theme="..."]` 블록
- **레이아웃**: [`common.js`](common.js) 의 `THEMES[].layout`
- **렌더러**: [`templates.js`](templates.js) 가 히어로·카드·목록 HTML 생성
- [`preview.html`](preview.html) 은 샘플 글로 모든 테마를 확인하는 로컬 전용 페이지(Firebase 불필요)

## 기술 참고

- 빌드: Python + `markdown-it-py`(GFM) + `pyyaml`
- 클라이언트: Firebase JS SDK v10.12.2(댓글/인증), `highlight.js`(코드 하이라이트) — 모두 CDN ESM
