// =============================================================================
// post.js — 정적 글 페이지(p/<slug>.html)의 클라이언트 로직
// 본문은 빌드 시 이미 HTML 로 baked 되어 있으므로 여기서는 렌더하지 않고,
// 하이라이트·코드복사·목차·읽기진행률·라이브스코어·링크복사·댓글만 담당한다.
// 댓글/로그인만 Firebase 를 쓴다.
// =============================================================================
import {
  db, collection, getDocs, addDoc, query, orderBy, serverTimestamp,
  highlightWithin, decorateLinks, escapeHtml, fmtDate,
  mountHeader, mountFooter, onUser, login,
  bumpViews, getViews,
} from "./common.js";

mountHeader();
mountFooter();

const slug = document.body.dataset.slug;
const body = document.getElementById("articleBody");

let currentUser = null;
onUser((u) => { currentUser = u; refreshCommentForm(); });

// ---- 본문 후처리 (baked HTML 대상) ------------------------------------------
highlightWithin(body);
decorateLinks(body);
addCopyButtons(body);
buildToc(body);
mountLiveScores(body);
mountViews(slug);

const copyBtn = document.getElementById("copyLinkBtn");
if (copyBtn) copyBtn.onclick = async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyBtn.textContent = "✓ 복사됨";
    setTimeout(() => { copyBtn.textContent = "🔗 링크 복사"; }, 1600);
  } catch { alert("복사에 실패했습니다."); }
};

loadComments();

// 코드 블록마다 복사 버튼 부착
function addCopyButtons(container) {
  container.querySelectorAll("pre").forEach((pre) => {
    const btn = document.createElement("button");
    btn.className = "code-copy";
    btn.type = "button";
    btn.textContent = "복사";
    btn.onclick = async () => {
      try {
        const code = pre.querySelector("code");
        await navigator.clipboard.writeText(code ? code.innerText : pre.innerText);
        btn.textContent = "복사됨 ✓";
        setTimeout(() => { btn.textContent = "복사"; }, 1500);
      } catch { /* noop */ }
    };
    pre.appendChild(btn);
  });
}

// ---- 목차 (빌드가 heading 에 id 를 이미 부여함) ------------------------------
function buildToc(container) {
  const headings = container.querySelectorAll("h2[id], h3[id]");
  if (headings.length < 2) return;
  const toc = document.getElementById("toc");
  headings.forEach((h) => {
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    a.className = h.tagName === "H3" ? "lvl-3" : "";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      h.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${h.id}`);
    });
    toc.appendChild(a);
  });
  document.getElementById("tocBox").classList.remove("hidden");

  const links = [...toc.querySelectorAll("a")];
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((l) => l.classList.toggle("active",
          l.getAttribute("href") === `#${en.target.id}`));
      }
    });
  }, { rootMargin: "-80px 0px -70% 0px" });
  headings.forEach((h) => obs.observe(h));
}

// ---- 읽기 진행률 바 ---------------------------------------------------------
const progressEl = document.getElementById("readProgress");
window.addEventListener("scroll", () => {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  progressEl.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
}, { passive: true });

// ---- 실시간 스코어 위젯 -----------------------------------------------------
// 본문에 <div class="livescores" data-league="4328" data-title="…"></div> 를 두면
// TheSportsDB 무료 API(키 불필요·CORS 허용)로 실제 경기 결과를 채운다.
function mountLiveScores(container) {
  const nodes = container.querySelectorAll(".livescores");
  if (!nodes.length) return;
  const KEY = "123";
  const fetchPast = async (league) => {
    const url = `https://www.thesportsdb.com/api/v1/json/${KEY}/eventspastleague.php?id=${encodeURIComponent(league)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    return data.events || [];
  };
  const row = (e) => {
    const hs = e.intHomeScore, as = e.intAwayScore;
    const done = hs != null && hs !== "" && as != null && as !== "";
    const st = (e.strStatus && !["Match Finished", "FT"].includes(e.strStatus))
      ? e.strStatus : (e.dateEvent || "");
    return `<li class="ls-row">
      <span class="ls-team home">${escapeHtml(e.strHomeTeam || "")}</span>
      <span class="ls-score">${done ? `${hs}<i>:</i>${as}` : "vs"}</span>
      <span class="ls-team away">${escapeHtml(e.strAwayTeam || "")}</span>
      <span class="ls-status">${escapeHtml(st)}</span>
    </li>`;
  };
  nodes.forEach((node) => {
    const league = node.dataset.league || "4328";
    const title = node.dataset.title || "최근 경기 결과";
    node.innerHTML =
      `<div class="ls-head"><span class="ls-live">● 자동갱신</span> ${escapeHtml(title)}
        <span class="ls-src">TheSportsDB</span></div>
       <ul class="ls-list"><li class="ls-loading"><span class="spinner"></span> 불러오는 중…</li></ul>
       <div class="ls-foot"></div>`;
    const listEl = node.querySelector(".ls-list");
    const footEl = node.querySelector(".ls-foot");
    const load = async () => {
      try {
        const events = await fetchPast(league);
        listEl.innerHTML = events.slice(0, 8).map(row).join("")
          || `<li class="ls-loading">경기 데이터가 없습니다.</li>`;
        const n = new Date();
        footEl.textContent =
          `업데이트 ${n.getHours()}:${String(n.getMinutes()).padStart(2, "0")} · 60초마다 자동 갱신`;
      } catch (err) {
        listEl.innerHTML = `<li class="ls-loading">데이터를 불러오지 못했습니다 (${escapeHtml(err.message)})</li>`;
      }
    };
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener("beforeunload", () => clearInterval(timer));
  });
}

// ---- 조회수 (Firebase — 세션당 1회만 증가, 항상 최신값 표시) ----------------
async function mountViews(slug) {
  const el = document.getElementById("viewCount");
  if (!el) return;
  const key = "viewed:" + slug;
  try {
    if (!sessionStorage.getItem(key)) {
      if (await bumpViews(slug)) sessionStorage.setItem(key, "1");
    }
  } catch { /* sessionStorage 미지원 등 — 무시 */ }
  const n = await getViews(slug);
  if (n != null) {
    el.textContent = `조회 ${n.toLocaleString("ko-KR")}회`;
    el.hidden = false;
  }
}

// ---- 댓글 (Firebase — slug 를 문서 키로 사용) -------------------------------
async function loadComments() {
  const listEl = document.getElementById("commentList");
  try {
    const q = query(collection(db, "posts", slug, "comments"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    document.getElementById("commentCount").textContent = `(${snap.size})`;
    if (snap.empty) {
      listEl.innerHTML = `<p class="empty" style="padding:16px 0">첫 댓글을 남겨보세요.</p>`;
      return;
    }
    listEl.innerHTML = snap.docs.map((d) => {
      const c = d.data();
      const photo = c.photoURL
        ? `<img class="avatar" src="${escapeHtml(c.photoURL)}" alt="">`
        : `<div class="avatar" style="background:var(--bg3)"></div>`;
      return `
        <div class="comment">
          ${photo}
          <div>
            <div><span class="who">${escapeHtml(c.name || "익명")}</span>
              <span class="when">${fmtDate(c.createdAt)}</span></div>
            <p class="text">${escapeHtml(c.body || "")}</p>
          </div>
        </div>`;
    }).join("");
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<div class="notice error"><small>${escapeHtml(e.message)}</small></div>`;
  }
}

function refreshCommentForm() {
  const wrap = document.getElementById("commentFormWrap");
  if (!currentUser) {
    wrap.innerHTML = `<div class="notice">댓글을 남기려면
      <a href="#" id="loginToComment">Google 로그인</a>이 필요합니다.</div>`;
    wrap.querySelector("#loginToComment").onclick = (e) => {
      e.preventDefault();
      login().catch((err) => alert("로그인 실패: " + err.message));
    };
    return;
  }
  wrap.innerHTML = `
    <form class="comment-form" id="cForm">
      <textarea id="cBody" placeholder="${escapeHtml(currentUser.displayName || "")} 님으로 댓글 작성…" required></textarea>
      <div class="btn-row">
        <button class="btn primary" type="submit">댓글 등록</button>
      </div>
    </form>`;
  wrap.querySelector("#cForm").addEventListener("submit", submitComment);
}

async function submitComment(e) {
  e.preventDefault();
  const bodyEl = document.getElementById("cBody");
  const text = bodyEl.value.trim();
  if (!text) return;
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    await addDoc(collection(db, "posts", slug, "comments"), {
      name: currentUser.displayName || currentUser.email,
      photoURL: currentUser.photoURL || "",
      authorEmail: currentUser.email,
      uid: currentUser.uid,
      body: text,
      createdAt: serverTimestamp(),
    });
    bodyEl.value = "";
    loadComments();
  } catch (err) {
    alert("댓글 등록 실패: " + err.message);
  } finally {
    btn.disabled = false;
  }
}
