---
description: 최신 테크 정보를 조사해 블로그(blog/) 글을 작성하고 등록을 준비한다
argument-hint: [주제] — 비우면 최신 트렌딩 주제를 자동 선택 (예: /tech-post React 19)
---

# 최신 테크 블로그 글 작성 & 등록

당신은 **purehero · Tech Guide**(하우투/팁 스타일 한국어 기술 가이드 블로그)의 편집자다.
아래 절차로 글 한 편을 완성하고 등록 수단까지 준비한다.

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
  1. 도입 1~2문단 — 무엇이, 왜 중요한지
  2. `##` 섹션 **2개 이상** (2개 이상이어야 자동 목차가 생성됨), 필요 시 `###`
  3. 코드 예제는 언어를 명시한 펜스 블록(<code>```js</code> 등) — 렌더 시 복사 버튼이 붙는다
  4. 팁/주의는 blockquote(`>`), 항목 비교는 표 사용
  5. 마지막에 `## 참고 자료` 섹션 — 조사에 사용한 출처 링크 목록
- 분량: 본문 1,000~2,500자
- 태그: 3~5개. 기존 태그 우선 재사용 (Firebase, 웹, 하우투, 팁, CSS, 보안, 디자인, AI …)
- **표지 이미지는 항상 생성해 넣는다** (`coverImage`를 절대 빈 문자열로 두지 않는다). 우선순위:
  1. 주제를 잘 드러내는 **SVG 표지를 직접 생성**한 뒤, **블로그 설계 원칙(텍스트=Firestore, 이미지=Storage)에 맞춰 Storage(`blog-images/`)에 업로드하고 다운로드 URL을 `coverImage`에 저장**한다. 데이터 URI를 Firestore 문서에 인라인으로 박지 않는다(문서 비대화 방지).
  2. 적절한 관련 이미지(공식 로고·다이어그램 등 라이선스가 명확한 것)가 있으면 그 URL을 써도 된다.
  - 참고: `write.html`은 파일 업로드→Storage 링크 방식이라 이미 이 원칙을 따른다. 자동 등록 콘솔 스니펫(4-B)도 **생성한 SVG를 Storage에 올린 뒤 링크로 저장**한다(아래 템플릿 참고).
  - **본문 중간 이미지**도 같은 원칙: Markdown `![](URL)`에 Storage/외부 URL을 쓴다. data URI를 본문에 인라인으로 넣지 말 것(문서 비대·1 MiB 한도 위험). `publish.html`은 본문에 들어온 `data:` 이미지를 저장 시 자동으로 Storage에 올려 링크로 치환한다.

  **SVG 표지 생성 레시피 (self-contained — preview.html 참조 불필요):**
  - 캔버스: `width='800' height='500' viewBox='0 0 800 500'` (블로그 카드/히어로 비율)
  - 배경: 주제 색과 어울리는 **대각선 `linearGradient`** (`x1=0 y1=0 x2=1 y2=1`). 예) 프론트엔드=보라~파랑, 보안=빨강~남색, Android=초록~파랑
  - 심볼: 주제를 상징하는 **도형/일러스트**를 반투명(`rgba(255,255,255,.12~.2)`)으로 배치 (예: 그리드=사각형 블록들, 코드=중괄호, 클라우드=원). 로고 문자·이모지(`{ }`, `🔥`)도 가능
  - 타이포: 좌하단에 **핵심 키워드**(`font-size≈84~120`, `font-weight='800'`, `fill='#fff'`) + 그 아래 **부제**(`font-size≈30`, `fill='rgba(255,255,255,.85)'`). `font-family='sans-serif'`
  - 생성한 SVG는 `encodeURIComponent`로 감싼 data URI로 만든 뒤 **Storage에 업로드**하고, 받은 다운로드 URL을 `coverImage`에 저장한다 (아래 4-B 스니펫의 표지 업로드 블록 참고)
  - SVG는 작은따옴표(`'`)로 속성을 쓰고 백틱은 넣지 않는다 (콘솔 스니펫의 템플릿 리터럴 안에 들어가므로)

- **본문을 풍부하게 구성한다 — 이미지·영상·미리보기를 적극 활용**한다. 글이 텍스트만 길게 이어지지 않도록, 섹션마다 이해를 돕는 시각 자료를 곁들인다.
  - **본문 이미지**: 설명을 돕는 스크린샷·다이어그램·로고·비교 이미지를 중간중간 배치한다. `![의미있는 alt](URL)` 형식으로, **Storage 또는 라이선스가 명확한 외부/공식 URL**을 쓴다(data URI를 본문에 넣어도 `publish.html`이 저장 시 Storage로 올려 링크로 치환하지만, 가능하면 처음부터 URL 권장). 캡션이 필요하면 이미지 아래에 이탤릭 한 줄(`*출처: …*`)을 덧붙인다.
  - **유튜브/영상 (임베드 지원)**: 유튜브 링크를 **한 줄에 단독으로** 두면 렌더러가 자동으로 반응형 임베드 플레이어로 바꿔준다(보안상 유튜브 도메인만 허용). 지원 형식:
    - `https://www.youtube.com/watch?v=<VIDEO_ID>`
    - `https://youtu.be/<VIDEO_ID>`
    (문장 안에 섞인 링크는 임베드되지 않고 일반 링크로 남는다 — 임베드하려면 반드시 **줄 단독**.) 공식 채널·컨퍼런스 세션·릴리스 소개 등 **신뢰할 수 있는 영상만** 넣는다.
    - 썸네일만 보여주고 싶다면 대신 링크 감싼 이미지도 가능: `[![제목](https://img.youtube.com/vi/<VIDEO_ID>/hqdefault.jpg)](https://youtu.be/<VIDEO_ID>)`
  - **미리보기 자료**: 공식 데모/플레이그라운드/릴리스 노트/문서 링크, 실행 결과 스크린샷, 비교 표를 곁들여 독자가 직접 확인할 수 있게 한다. 링크는 `## 참고 자료`에도 정리한다.
  - **원칙**: 모든 시각 자료는 본문 흐름을 뒷받침하는 근거일 때만 넣는다(장식용 남발·저작권 불명 이미지 금지). alt 텍스트와 출처를 성실히 단다.

## 4. 결과 출력
**기본값: 아래 `B. 자동 등록 콘솔 스니펫`만 출력한다.**
사용자가 명시적으로 요청할 때만 `A. write.html 붙여넣기용`을 함께 낸다.

### A. write.html 붙여넣기용 (요청 시에만)
**제목**, **태그(쉼표 구분)**, **Markdown 본문**을 각각 별도 코드 블록으로 출력한다.
(사용자가 블로그의 글쓰기 페이지에 그대로 붙여넣는 용도)

### B. 자동 등록 콘솔 스니펫
아래 템플릿에 값을 채운 **브라우저 콘솔 스니펫**을 출력한다.
실행 조건: 블로그 페이지(`https://purehero.github.io/blog/` 또는 로컬 서버)에서
**관리자 계정으로 로그인한 상태**의 개발자도구 콘솔.

**중요 — 문법 오류(`Uncaught SyntaxError: Unexpected identifier`) 방지 규칙:**
- Markdown 본문(`content`)을 템플릿 리터럴에 넣을 때 **백틱을 직접 쓰지 말고 `§` 센티널로 대체**한다. 코드펜스는 `§§§`, 인라인 코드는 `§`로 쓰고, 마지막에 `.replaceAll("§§§", "```").replaceAll("§", "`")`로 복원한다. (백틱 이스케이프가 복사 과정에서 깨져 발생하던 오류를 원천 차단)
- 본문에 `${` 가 들어가지 않도록 확인한다(코드 예제의 `${...}`도 `§`+`{`로 우회).
- 전체를 `(async () => { ... })();` **즉시실행함수로 감싼다** (`const` 재선언·top-level await 문제 방지).

```js
(async () => {
  const m = await import("./common.js");
  if (!m.isAdmin(m.auth.currentUser)) throw new Error("관리자 로그인이 필요합니다");

  // 표지: 주제에 맞춰 생성한 SVG. 항상 채운다.
  const coverSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#색1'/><stop offset='1' stop-color='#색2'/></linearGradient></defs>
    <rect width='800' height='500' fill='url(#g)'/>
    <!-- 주제를 상징하는 도형/일러스트를 여기에 -->
    <text x='60' y='260' font-family='sans-serif' font-size='96' font-weight='800' fill='#fff'>핵심키워드</text>
    <text x='60' y='320' font-family='sans-serif' font-size='32' fill='rgba(255,255,255,.82)'>부제</text>
  </svg>`;
  // 설계 원칙(이미지는 Storage): SVG 를 Storage(blog-images/)에 올리고 링크를 coverImage 로 사용
  const coverDataUri = "data:image/svg+xml," + encodeURIComponent(coverSvg);
  const _blob = await (await fetch(coverDataUri)).blob();
  const _ref = m.storageRef(m.storage, `blog-images/cover_${Math.floor(performance.timeOrigin + performance.now())}.svg`);
  await m.uploadBytes(_ref, _blob, { contentType: "image/svg+xml" });
  const coverImage = await m.getDownloadURL(_ref);

  // 본문: 백틱 대신 § 사용 → 마지막에 치환 (이스케이프 불필요)
  const content = `...§§§js ... 코드펜스 ... §§§ ... 인라인은 §코드§ ...`
    .replaceAll("§§§", "```")  // 코드펜스 복원
    .replaceAll("§", "`");               // 인라인 코드 복원

  await m.addDoc(m.collection(m.db, "posts"), {
    title: "...제목...",
    content,
    excerpt: m.excerptFrom(content),
    tags: ["태그1", "태그2"],
    coverImage,
    published: true,
    authorEmail: m.auth.currentUser.email,
    authorUid: m.auth.currentUser.uid,
    createdAt: m.serverTimestamp(),
    updatedAt: m.serverTimestamp(),
  });
  console.log("✅ 등록 완료 (표지 포함) — 홈을 새로고침하세요");
})();
```

> `write.html` 붙여넣기용(4-A)으로 등록할 경우 데이터 URI 표지를 넣을 수 없으므로, 표지가 필요하면 콘솔 스니펫(4-B) 사용을 안내한다.

## 5. 최종 점검
- 사실 관계·버전·날짜를 한 번 더 재검토하고, 출처 링크가 유효한지 확인
- 제목·태그·본문에 광고성/과장 표현이 없는지 확인
- 코드 예제가 실제로 동작하는 형태인지 검토
- **표지 이미지(`coverImage`)가 비어 있지 않은지** 확인 — 생성한 SVG가 실제로 렌더되는지도 점검
