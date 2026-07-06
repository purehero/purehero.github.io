# purehero · Tech Guide 블로그

Firebase **Firestore**(글 텍스트) + **Storage**(이미지)를 사용하는 정적 블로그입니다.
GitHub Pages 등 정적 호스팅에서 그대로 동작하며, 서버가 필요 없습니다.

- **홈** `index.html` — 글 목록, 태그 필터, 검색
- **글 상세** `post.html?id=…` — Markdown 렌더, 목차(TOC), 댓글
- **글쓰기** `write.html` — Google 로그인 + 이메일 제한, Markdown 에디터, 이미지 업로드

## 1. Firebase 프로젝트 준비

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 프로젝트 생성
2. **빌드 > Firestore Database** 만들기 (프로덕션 모드)
3. **빌드 > Storage** 만들기
4. **빌드 > Authentication > 로그인 방법**에서 **Google** 공급자 사용 설정
5. **프로젝트 설정 > 내 앱 > 웹 앱(`</>`) 추가** → `firebaseConfig` 값 복사

## 2. 설정 값 채우기

`firebase-config.js` 를 열어 다음을 수정합니다.

- `firebaseConfig` : 1번에서 복사한 값
- `ADMIN_EMAILS` : 글을 쓸 수 있는 관리자 이메일(소문자)
- `SITE` : 블로그 제목·태그라인

> ⚠️ `ADMIN_EMAILS` 는 `firestore.rules` / `storage.rules` 의 `adminEmails()` 목록과
> **반드시 동일하게** 유지해야 합니다. (한쪽만 바꾸면 권한이 어긋납니다.)

## 3. 보안 규칙 배포

- **Firestore > 규칙** 탭에 [`firestore.rules`](firestore.rules) 내용 붙여넣고 게시
- **Storage > 규칙** 탭에 [`storage.rules`](storage.rules) 내용 붙여넣고 게시

## 4. 도메인 허용

Authentication > 설정 > **승인된 도메인**에 배포 도메인을 추가합니다.
(예: `purehero.github.io`, 로컬 테스트 시 `localhost`)

## 5. Firestore 색인

홈 화면은 `published == true` + `createdAt desc` 복합 쿼리를 사용합니다.
첫 실행 시 콘솔 오류 메시지에 **색인 생성 링크**가 나오면 클릭해 생성하세요.
(또는 Firestore > 색인 에서 `posts` 컬렉션에 `published`(오름차순) + `createdAt`(내림차순) 복합 색인 추가)

## 6. 로컬 테스트

`file://` 로 열면 ES 모듈/팝업 로그인이 막힐 수 있으니 로컬 서버로 실행하세요.

```bash
# 이 blog/ 디렉터리에서
python -m http.server 8080
# http://localhost:8080/ 접속
```

## 데이터 구조

```
posts (collection)
  {postId}
    title: string
    content: string        # Markdown 원문
    excerpt: string        # 목록용 요약(자동 생성)
    tags: string[]
    coverImage: string     # Storage 다운로드 URL (선택)
    published: boolean
    authorEmail, authorUid: string
    createdAt, updatedAt: timestamp
    comments (subcollection)
      {commentId}
        name, photoURL, authorEmail, uid, body: ...
        createdAt: timestamp

Storage: blog/images/<고유값>_<파일명>
```

## 사용법

1. 우측 상단 **로그인** → 관리자 이메일로 Google 로그인
2. **글쓰기** → 제목/태그/본문(Markdown) 작성
3. 본문에 이미지를 **드래그하거나 붙여넣기**하면 Storage 에 업로드되고 `![](url)` 이 자동 삽입
4. **저장** → 발행. 홈·상세 페이지에서 확인

## 테마 (= 전체 템플릿)

헤더의 **테마 선택기**로 7가지 템플릿을 즉시 전환합니다. 테마는 색만 바꾸는 것이
아니라 **헤더 배치·히어로 형태·목록 컬럼·사이드바 유무·컨테이너 폭**까지 레이아웃
전체를 바꿉니다. 선택은 `localStorage`에 저장되어 다음 방문에도 유지됩니다.

| 테마 | 헤더 | 히어로 | 목록 | 사이드바 | 참조 |
|------|------|--------|------|----------|------|
| `mono` 클린 리스트 (기본) | 인라인 | 가로 고정글 | 왼쪽썸네일 리스트 | 우측 | Diz Paulo |
| `paper` 따뜻한 매거진 | 중앙 | 대형 스크림 | 2단 그리드 | 우측 | Ivan Khris |
| `classic` 블루 그리드 | 인라인 | 대형 스크림 | 2단 그리드 | 우측 | 기존 사이트 |
| `magazine` 뉴스 매거진 | 중앙 | 피처row(1+2) | 3단 그리드 | 없음 | ProBlogger |
| `editorial` 에디토리얼 | 중앙 | 없음 | 단일 스택 | 없음 | 미니멀 |
| `midnight` 미드나잇 (다크) | 인라인 | 대형 스크림 | 2단 그리드 | 우측 | — |
| `carbon` 카본 (다크) | 인라인 | 피처row(1+2) | 3단 그리드 | 없음 | — |

### 구조
- **팔레트/폰트**: [`style.css`](style.css) 의 `:root[data-theme="..."]` 블록
- **레이아웃**: [`common.js`](common.js) 의 `THEMES[].layout` (header/hero/grid/sidebar/container)
- **렌더러**: [`templates.js`](templates.js) 가 히어로·카드·목록 HTML을 레이아웃에 맞게 생성
- 레이아웃 CSS는 `data-grid` / `data-hero(요소)` / `.layout[data-sidebar]` / `data-header`
  속성으로 구동되어 테마 id와 분리되어 있습니다.

테마를 추가하려면 `THEMES` 에 항목 추가(+`layout`), 필요 시 `style.css` 에 팔레트
블록 추가. 다크 테마는 `dark: true` 로 두면 코드 하이라이트도 자동 다크 전환됩니다.

## 템플릿 미리보기

[`preview.html`](preview.html) 은 **샘플 글로 모든 템플릿을 즉시 확인**하는 로컬 전용
페이지입니다(Firebase 불필요). 실제 글을 발행하기 전에 테마를 비교해 볼 때 유용하며,
배포에는 필요 없으므로 삭제해도 됩니다.

## 기술 참고

- Firebase JS SDK v10.12.2 (gstatic CDN, ESM)
- Markdown: `marked` + `DOMPurify`(XSS 방지) + `highlight.js`(코드 하이라이트)
- 라이브러리 버전은 각 HTML `<head>` / `common.js` 상단 import URL 에서 조정 가능
