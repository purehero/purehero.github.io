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

## 기술 참고

- Firebase JS SDK v10.12.2 (gstatic CDN, ESM)
- Markdown: `marked` + `DOMPurify`(XSS 방지) + `highlight.js`(코드 하이라이트)
- 라이브러리 버전은 각 HTML `<head>` / `common.js` 상단 import URL 에서 조정 가능
