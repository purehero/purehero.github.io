---
description: 최신 테크 정보를 조사해 블로그(blog/) 글을 작성하고 정적으로 발행한다
argument-hint: [주제] — 비우면 최신 트렌딩 주제를 자동 선택 (예: /tech-post React 19)
---

# 최신 테크 블로그 글 작성 & 정적 발행

당신은 **purehero · Tech Guide**(하우투/팁 스타일 한국어 기술 가이드 블로그)의 편집자다.
이 블로그는 **정적 사이트**다 — 글은 `blog/posts/*.md` 소스로 커밋하고, `blog/tools/build.py`
가 이를 정적 HTML(`blog/p/<slug>.html`)로 렌더한다. Firebase 는 댓글에만 쓴다.
아래 절차로 글 한 편을 완성하고 **파일 생성 → 빌드 → 커밋**까지 준비한다.

## 1. 주제 선정
- 지정 주제: "$ARGUMENTS"
- 주제가 비어 있으면 WebSearch로 **최근 2주 이내** 개발자 트렌딩 토픽(프레임워크/언어
  릴리스, 브라우저 신기능, 보안 이슈, AI 개발도구 등)을 3개 후보로 조사하고,
  독자에게 가장 실용적인 것 1개를 선택해 선정 이유를 한 줄로 밝힌다.

## 2. 자료 조사 (필수)
- WebSearch / WebFetch로 **서로 다른 출처 3개 이상** 교차 확인. 공식 문서·릴리스 노트 우선.
- 최근 30일 이내 정보 위주. 버전 번호·날짜·수치는 반드시 원문에서 확인한다.
- 교차 확인되지 않는 내용은 쓰지 않는다. 추측·과장 금지.

## 3. 글 작성 규칙 (블로그 컨벤션)
- 언어: 한국어, GFM Markdown
- 제목: 구체적인 하우투/팁 스타일 (예: "React 19의 use() 훅, 이렇게 쓴다")
- 구조:
  1. 도입 2~3문단 — 무엇이, 왜 중요한지, 이 글에서 다룰 범위
  2. `##` 섹션 **4개 이상** (자동 목차 생성), 필요 시 `###`로 세분화
  3. 코드 예제는 언어를 명시한 펜스 블록(<code>```js</code> 등) — 렌더 시 복사 버튼이 붙는다
  4. 팁/주의는 blockquote(`>`), 항목 비교는 표 사용
  5. 마지막에 `## 참고 자료` 섹션 — 조사에 사용한 출처 링크 목록
- 분량: **상한 없음 — 주제를 충실히 다루는 데 필요한 만큼 쓴다.** 최소 3,000자 이상을 권장하되, **길이 제한이나 출력 편의 때문에 설명·예제·맥락·코드를 줄이지 않는다.** 다룰 가치가 있는 내용은 모두 담는다(개념 → 실제 예제 → 왜/배경 → 단계별 절차 → 흔한 함정 → 비교 표 → FAQ …).
  - ⚠ 두 원칙을 동시에 지킨다: (1) **길이 때문에 내용을 잘라내지 말 것** — 필요한 건 다 쓴다. (2) **길이를 위해 채우지도 말 것** — 채우기·중복·군더더기·확인 안 된 추측 금지. 즉 "빠짐없이, 그러나 군더더기 없이". 사실은 여전히 3개 이상 출처로 교차 검증한다.
- 태그: 3~5개. 기존 태그 우선 재사용 (Firebase, 웹, 하우투, 팁, CSS, 보안, 디자인, AI …)
- **표지 이미지는 항상 생성해 넣는다.** 정적 사이트이므로 **Storage 에 올리지 않고 레포에 SVG 파일로 커밋**한다:
  - `blog/tools/covers.py` 의 15개 스타일 중 하나로 생성한다(직접 그라디언트+초대형 볼드로 그리지 말 것):
    `editorial · blueprint · duotone · footer · ghostmark · diagonal · dots · concentric · ticket · contour · terminal · iso · framed · sidebar · orbit`
  - **스타일 선택**: 최근 글들과 겹치지 않게 고른다. 주제와 어울리면 금상첨화(예: JS·도구=terminal, 보안=sidebar/framed, 메모리·블록=iso, 데이터=dots).
  - 생성 & 저장(파이썬):
    ```python
    import sys; sys.path.insert(0, "blog/tools")
    import covers
    from urllib.parse import unquote
    uri = covers.make("<style>", {"kicker": "카테고리 · KEY", "title": "핵심키워드",
        "subtitle": "부제", "meta": "버전/날짜 라벨", "accent": "#악센트", "slug": "ascii-slug"})
    raw = unquote(uri.split(",", 1)[1])            # data URI → 원본 SVG
    open("blog/assets/covers/<slug>.svg", "w", encoding="utf-8").write(raw)
    ```
    - `accent`는 주제색 1개(예: 게임엔진 `#6ea3c4`, 보안 `#c56b7f`, 웹 `#8f86d6`, 반도체 `#d98a5b`).
    - `title`은 짧은 핵심 키워드, `kicker`는 대문자 카테고리 라벨.
  - frontmatter 의 `cover` 에는 **blog/ 기준 상대경로**(`./assets/covers/<slug>.svg`)를 쓴다.
  - 원칙: 모든 커버는 "키커 → 제목 → 부제 → 메타" 위계 + 절제된 팔레트 + 스타일별 모티프.

- **본문을 풍부하게 구성한다 — 이미지·영상·미리보기를 적극 활용**한다.
  - **본문 이미지**: 설명을 돕는 스크린샷·다이어그램·로고·비교 이미지를 중간중간 배치한다.
    - 라이선스가 명확한 **외부/공식 URL**(`https://…`)을 `![alt](URL)` 로 쓰거나,
    - 레포에 커밋할 이미지는 `blog/assets/img/` 에 저장하고 **blog/ 기준 상대경로**(`./assets/img/<파일>`)로 참조한다.
    - (빌드가 정적 글 페이지에서 상대경로를 `../assets/…` 로 자동 보정한다.)
    - 캡션이 필요하면 이미지 아래에 이탤릭 한 줄(`*출처: …*`)을 덧붙인다.
  - **유튜브/영상 (임베드 지원)**: 유튜브 링크를 **한 줄에 단독으로** 두면 빌드가 자동으로 반응형 임베드로 바꾼다(유튜브 도메인만 허용). 지원 형식:
    - `https://www.youtube.com/watch?v=<VIDEO_ID>`
    - `https://youtu.be/<VIDEO_ID>`
    (문장 안에 섞인 링크는 임베드되지 않는다 — 반드시 **줄 단독**.) 신뢰할 수 있는 영상만 넣는다.
  - **미리보기 자료**: 공식 데모/플레이그라운드/릴리스 노트/문서 링크, 실행 결과 스크린샷, 비교 표를 곁들여 독자가 직접 확인하게 한다. 링크는 `## 참고 자료`에도 정리한다.
  - **원칙**: 모든 시각 자료는 본문 흐름을 뒷받침하는 근거일 때만 넣는다(장식용 남발·저작권 불명 이미지 금지). alt·출처를 성실히 단다.

## 4. 발행 (파일 생성 → 빌드)

### 4-A. slug 정하기
- URL·파일명이 될 **ASCII 소문자 slug**를 정한다(하이픈 구분, 예: `react-19-use-hook`).
- 표지 SVG 파일명, frontmatter `slug`, md 파일명이 **모두 이 slug 로 일치**해야 한다.

### 4-B. 표지 SVG 저장
3장에서 만든 covers.py SVG 를 `blog/assets/covers/<slug>.svg` 로 저장한다.

### 4-C. 소스 파일 작성
`blog/posts/<오늘날짜>-<slug>.md` 를 아래 형식으로 만든다(frontmatter + 본문):

```markdown
---
title: "글 제목"
slug: "react-19-use-hook"
date: "2026-07-08"
tags: ["React", "웹", "하우투"]
cover: "./assets/covers/react-19-use-hook.svg"
published: true
---

여기부터 본문 Markdown …
```

- `date` 는 오늘 날짜(YYYY-MM-DD). 초안으로 두려면 `published: false`.
- 본문에 백틱을 그대로 쓴다(콘솔 스니펫이 아니므로 `§` 치환·이스케이프가 필요 없다).

### 4-D. 빌드
```bash
python blog/tools/build.py
```
- `blog/p/<slug>.html`(본문 baked)과 `blog/index.html` 목록이 갱신된다.
- 로컬 확인: `cd blog && python -m http.server 8080` → `http://localhost:8080/`.

### 4-E. 커밋 안내
사용자에게 아래를 안내한다(사용자가 원할 때 커밋/푸시):
```bash
git add blog && git commit -m "blog: <제목>" && git push
```
푸시하면 GitHub Pages 가 그대로 배포한다.

## 5. 최종 점검
- 사실 관계·버전·날짜를 한 번 더 재검토하고, 출처 링크가 유효한지 확인
- 제목·태그·본문에 광고성/과장 표현이 없는지 확인
- 코드 예제가 실제로 동작하는 형태인지 검토
- **표지 SVG(`blog/assets/covers/<slug>.svg`)가 실제로 생성됐고** frontmatter `cover` 경로와 일치하는지 확인
- `build.py` 가 오류 없이 끝나고 `blog/p/<slug>.html` 이 생성됐는지 확인
