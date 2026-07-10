---
title: "정적 블로그로 전환하기 — Firestore 없이 빌드로 발행한다"
slug: "static-blog-howto"
date: "2026-07-08"
tags: ["하우투", "웹", "정적사이트"]
cover: "./assets/covers/static-blog-howto.svg"
published: true
---

이 블로그는 원래 Firebase Firestore에서 글을 실시간으로 읽어오는 구조였다. 페이지를 열 때마다 브라우저가 Firestore에 질의(query)를 보내고, 그 결과를 자바스크립트가 렌더링했다. 편했지만 대가가 있었다. **글이 하나도 없는 빈 HTML**이 먼저 뜨고, 네트워크 왕복이 끝나야 본문이 나타난다. 검색엔진 크롤러 입장에서도 본문이 보이지 않는다.

이 글은 그 구조를 **정적 페이지 로딩 방식**으로 바꾼 과정을 정리한다. 핵심 아이디어는 하나다 — **글은 레포에 커밋된 Markdown 파일이고, 빌드 스크립트가 이를 완성된 HTML로 미리 렌더한다.** 백엔드 호출은 댓글에만 남긴다.

## 왜 정적으로 바꿨나

동적 렌더링의 문제는 "본문이 데이터베이스에 있다"는 점이다. 정적 방식은 이 전제를 뒤집는다.

- **속도**: 본문이 이미 HTML에 들어 있어 첫 페인트에 바로 보인다.
- **SEO**: 크롤러가 자바스크립트를 실행하지 않아도 본문을 읽는다.
- **비용/안정성**: 읽기 트래픽이 Firestore 할당량을 소비하지 않는다. GitHub Pages가 그냥 파일을 준다.
- **이력 관리**: 글이 git 히스토리에 남는다. 되돌리기·diff가 자연스럽다.

> 트레이드오프도 있다. 새 글을 쓰면 **빌드를 한 번 돌려 커밋**해야 한다. 실시간 편집기는 사라진다. 하지만 개인 기술 블로그에는 이 편이 더 잘 맞는다.

## 소스는 Markdown 파일

글 하나가 파일 하나다. 상단에 YAML frontmatter로 메타데이터를 둔다.

```markdown
---
title: "글 제목"
slug: "post-slug"
date: "2026-07-08"
tags: ["하우투", "웹"]
cover: "./assets/covers/post-slug.svg"
published: true
---

여기부터 본문 Markdown …
```

`slug`가 곧 출력 파일 이름(`p/<slug>.html`)이자 URL이 된다. 커버 이미지는 Storage에 올리지 않고 **레포에 SVG 파일로 커밋**한다.

## 빌드 스크립트가 하는 일

`blog/tools/build.py` 한 방이면 된다.

```bash
python blog/tools/build.py
```

이 스크립트는:

1. `posts/*.md`를 모두 읽어 frontmatter와 본문을 분리한다.
2. 본문을 `markdown-it-py`로 HTML로 렌더한다(표·코드펜스·취소선 지원).
3. 글 하나마다 `p/<slug>.html`을 만든다 — **본문이 그 안에 완성된 HTML로 들어간다.**
4. 이전/다음 글 링크를 날짜순으로 계산해 각 페이지에 박아 넣는다.
5. `index.html`의 목록 데이터(JSON)를 다시 채운다.

코드 하이라이트, 목차(TOC), 읽기 진행률, 댓글은 여전히 클라이언트 자바스크립트가 처리한다. 다만 **본문을 가져오려고 네트워크를 타지 않는다** — 이미 문서 안에 있으니까.

## 댓글만 남긴 Firebase

정적 사이트는 서버가 없으니 댓글을 어디엔가 저장해야 한다. 이 블로그는 댓글과 로그인만 Firebase에 남겼다. 규칙도 댓글 전용으로 축소한다.

| 기능 | 이전 | 지금 |
| --- | --- | --- |
| 글 목록/본문 | Firestore 읽기 | 정적 HTML |
| 이미지 | Storage 업로드 | 레포 커밋 |
| 댓글·로그인 | Firebase | Firebase (유지) |
| 발행 | 웹 편집기 | git 커밋 |

## 마치며

동적에서 정적으로 옮기는 일은 거창해 보이지만, 실제로는 "본문을 어디에 두는가"를 바꾸는 일이다. 데이터베이스에서 파일로. 그 한 번의 결정이 속도·SEO·비용·이력 관리를 한꺼번에 개선한다.

## 참고 자료

- [markdown-it-py 문서](https://markdown-it-py.readthedocs.io/)
- [GitHub Pages 공식 문서](https://docs.github.com/pages)
