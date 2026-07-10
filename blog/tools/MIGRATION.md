# 기존 Firestore 글 → 정적 소스 1회 이전

정적 블로그로 전환하면 글 목록·본문은 레포에 커밋된 정적 HTML 로 서빙된다.
그 전에 **Firestore 에 남아 있는 기존 글**을 `posts/*.md` 소스로 한 번 내보내야 한다.

> 댓글은 Firebase 에 그대로 남으므로 이전할 필요가 없다. 단, 새 댓글 경로는
> 글의 `slug` 를 문서 키로 쓴다(`posts/<slug>/comments`). 예전 댓글은 Firestore
> 문서 id 아래(`posts/<firestoreId>/comments`)에 있으므로, 예전 댓글까지 이어서
> 보이게 하려면 이전 후 slug 를 firestoreId 로 맞추거나 콘솔에서 댓글을 옮겨야 한다.
> (개인 블로그라면 보통 새 slug 로 시작해도 무방하다.)

## 1) 브라우저에서 글 내보내기

블로그를 **관리자 계정으로 로그인**한 상태에서 열고(배포본 또는 로컬 서버),
개발자도구 콘솔에 아래 스니펫을 붙여 실행한다. `posts-export.json` 이 다운로드된다.

```js
(async () => {
  // Firebase SDK 를 직접 불러온다(common.js 의 export 에 의존하지 않음)
  const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const { firebaseConfig } = await import("./firebase-config.js");
  const app = appMod.initializeApp(firebaseConfig, "export-" + Date.now());
  const db = fs.getFirestore(app);

  const snap = await fs.getDocs(fs.collection(db, "posts"));
  const posts = snap.docs.map((d) => {
    const p = d.data();
    const ca = p.createdAt;
    return {
      id: d.id,
      title: p.title || "",
      content: p.content || "",
      excerpt: p.excerpt || "",
      tags: p.tags || [],
      coverImage: p.coverImage || "",
      published: p.published !== false,
      authorEmail: p.authorEmail || "",
      // Timestamp → ISO 문자열
      createdAt: ca && ca.toDate ? ca.toDate().toISOString() : (ca || ""),
    };
  });
  const blob = new Blob([JSON.stringify(posts, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "posts-export.json";
  a.click();
  console.log(`✅ ${posts.length}편 내보냄 → posts-export.json`);
})();
```

> 이 스니펫은 `firebase-config.js` 가 있는 `blog/` 경로에서 열어야 상대 import 가 된다.
> (예: `https://purehero.github.io/blog/` 또는 로컬 `http://localhost:8080/`)

## 2) 정적 소스로 변환

내려받은 `posts-export.json` 을 레포에 두고:

```bash
python blog/tools/import_posts.py posts-export.json
```

- `posts/<날짜>-<slug>.md` 파일들이 생성된다.
- `coverImage` 와 본문 이미지(Storage URL·data URI)는 `assets/` 로 내려받아 상대 경로로 치환된다.
- 예전 Firestore 문서 id 는 frontmatter `firestoreId` 로 남아, 예전 `post.html?id=…` 링크가 새 글로 리다이렉트된다.

## 3) 렌더 & 배포

```bash
python blog/tools/build.py     # posts/*.md → p/*.html + index.html 갱신
git add blog && git commit -m "blog: 기존 글 정적 이전" && git push
```

## 4) 정리

- 이전이 끝나면 `posts-export.json` 은 지워도 된다(레포에 커밋할 필요 없음).
- slug/제목/이미지 캡션 등을 다듬고 싶으면 `posts/*.md` 를 직접 수정한 뒤 다시 `build.py`.
