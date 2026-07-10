// =============================================================================
// common.js — 정적 블로그 공통 유틸 (헤더, 테마, 코드 하이라이트, 댓글용 Firebase)
// 글 본문은 빌드 시 정적 HTML 로 baked 되므로 이 파일은 본문을 렌더하지 않는다.
// Firebase 는 오직 댓글 + Google 로그인에만 쓴다.
// 모든 페이지에서 ESM 으로 import 합니다.
// =============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, query, orderBy, serverTimestamp,
  doc, getDoc, setDoc, increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import hljs from "https://cdn.jsdelivr.net/npm/highlight.js@11/+esm";

import { firebaseConfig, ADMIN_EMAILS, SITE } from "./firebase-config.js";

// ---- Firebase 핸들 (댓글/인증 전용) -----------------------------------------
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Firestore(댓글) / Auth 재-export
export {
  collection, getDocs, addDoc, query, orderBy, serverTimestamp,
  doc, getDoc, setDoc, increment,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
};
export { SITE, ADMIN_EMAILS };

// ---- 조회수 (Firestore: views/<slug>) ---------------------------------------
// 정적 블로그라 조회수만 Firestore 카운터로 센다. 규칙에서 +1 증가만 허용한다.
// 실패(오프라인·규칙 거부)해도 페이지 동작에 영향을 주지 않도록 조용히 무시.
export async function bumpViews(slug) {
  try {
    await setDoc(doc(db, "views", slug), { count: increment(1) }, { merge: true });
    return true;
  } catch { return false; }
}
export async function getViews(slug) {
  try {
    const snap = await getDoc(doc(db, "views", slug));
    return snap.exists() ? (snap.data().count || 0) : 0;
  } catch { return null; }
}
// 사이트 전체 누적 방문 수를 담는 views 문서 id (글 slug 와 겹치지 않는 값).
// Firestore 는 `__.*__` 형태 문서 id 를 예약하므로 하이픈 형태를 쓴다.
// 일자별 방문 수는 views/day-YYYY-MM-DD 문서에 따로 누적한다(오늘/어제 표시용).
export const SITE_VIEWS_ID = "site-total";

// 로컬 기준 offsetDays 만큼 이동한 날짜의 YYYY-MM-DD (방문 수 일자 버킷 키)
function ymdLocal(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 홈에서 인기 글 정렬/표시에 쓸 { slug: count } 맵. 실패 시 빈 객체.
export async function getAllViews() {
  const map = {};
  try {
    const snap = await getDocs(collection(db, "views"));
    snap.forEach((d) => { map[d.id] = d.data().count || 0; });
  } catch { /* noop */ }
  return map;
}

// ---- 파비콘 (모든 페이지 공통, 404 방지) -------------------------------------
(function injectFavicon() {
  if (document.querySelector("link[rel='icon']")) return;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <polygon points='50,6 90,28 90,72 50,94 10,72 10,28'
      fill='none' stroke='#3b66d6' stroke-width='11' stroke-linejoin='round'/></svg>`;
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = "data:image/svg+xml," + encodeURIComponent(svg);
  document.head.appendChild(link);
})();

// ---- 인증 -------------------------------------------------------------------
// ---- 테마 (= 전체 템플릿) ---------------------------------------------------
// layout 필드가 홈 페이지의 구조 전체(헤더 배치·히어로·목록·사이드바·폭)를 결정.
//   header:    inline | center
//   hero:      none | scrim | split | feature
//   grid:      list | 2col | 3col | stack
//   sidebar:   right | none
//   container: blog | wide | narrow
export const THEMES = [
  { id: "mono",     name: "클린 리스트",  dark: false,
    layout: { header: "inline", hero: "split",   grid: "list",  sidebar: "right", container: "blog" } },
  { id: "paper",    name: "따뜻한 매거진", dark: false,
    layout: { header: "center", hero: "scrim",   grid: "2col",  sidebar: "right", container: "wide" } },
  { id: "classic",  name: "블루 그리드",   dark: false,
    layout: { header: "inline", hero: "scrim",   grid: "2col",  sidebar: "right", container: "wide" } },
  { id: "magazine", name: "뉴스 매거진",   dark: false,
    layout: { header: "center", hero: "feature", grid: "3col",  sidebar: "none",  container: "wide" } },
  { id: "editorial", name: "에디토리얼",   dark: false,
    layout: { header: "center", hero: "none",    grid: "stack", sidebar: "none",  container: "narrow" } },
  { id: "midnight", name: "미드나잇 (다크)", dark: true,
    layout: { header: "inline", hero: "scrim",   grid: "2col",  sidebar: "right", container: "wide" } },
  { id: "carbon",   name: "카본 (다크)",   dark: true,
    layout: { header: "inline", hero: "feature", grid: "3col",  sidebar: "none",  container: "wide" } },
];
export const DEFAULT_THEME = "mono";
const THEME_KEY = "blog-theme";

export function themeDef(id) {
  return THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME);
}
export function currentTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  return THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME;
}
export function currentLayout() {
  return themeDef(currentTheme()).layout;
}

// data-theme(팔레트/폰트) + data-header(헤더 배치) 적용, 저장, 코드 하이라이트
// 라이트/다크 전환, 그리고 다른 스크립트가 다시 그릴 수 있도록 themechange 발행.
export function applyTheme(id) {
  const def = themeDef(id);
  const root = document.documentElement;
  root.dataset.theme = def.id;
  root.dataset.header = def.layout.header;
  localStorage.setItem(THEME_KEY, def.id);
  const light = document.getElementById("hljs-light");
  const darkCss = document.getElementById("hljs-dark");
  if (light) light.disabled = def.dark;
  if (darkCss) darkCss.disabled = !def.dark;
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: def.id } }));
}

export function isAdmin(user) {
  return !!user && ADMIN_EMAILS.includes((user.email || "").toLowerCase());
}

export function login() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export function logout() {
  return signOut(auth);
}

// user 상태를 콜백으로 전달. 반환값은 unsubscribe.
export function onUser(cb) {
  return onAuthStateChanged(auth, cb);
}

// ---- 코드 하이라이트 --------------------------------------------------------
// 본문은 빌드가 이미 HTML 로 렌더해 두므로, 여기서는 baked 된 <pre><code> 에
// highlight.js 만 적용한다(라이트/다크는 테마에 따라 CSS 가 전환).
export function highlightWithin(container) {
  container.querySelectorAll("pre code").forEach((block) => {
    try { hljs.highlightElement(block); } catch { /* noop */ }
  });
}

// 외부 링크는 새 탭 + 안전 rel 부여
export function decorateLinks(container) {
  container.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href) && !href.includes(location.host)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });
}

// ---- 텍스트 유틸 ------------------------------------------------------------
export function excerptFrom(markdown, len = 140) {
  const text = (markdown || "")
    .replace(/```[\s\S]*?```/g, " ")     // 코드 블록 제거
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 이미지 제거
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 링크 → 텍스트
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > len ? text.slice(0, len).trim() + "…" : text;
}

// 대략적인 읽기 시간(분). 한국어 기준 분당 ~600자.
export function readingTime(markdown) {
  const text = (markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\s/g, "");
  return Math.max(1, Math.round(text.length / 600));
}

export function slugifyHeading(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";
}

export function fmtDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

// ---- 공통 헤더 렌더 ---------------------------------------------------------
// pages: 모든 페이지가 DOMContentLoaded 후 호출. 로그인 상태에 따라 nav 갱신.
// data-basedir(하위 경로 페이지는 "../")를 반영해 링크 기준을 맞춘다.
function baseDir() {
  return document.body.dataset.basedir || "./";
}

export function mountHeader(active = "") {
  const base = baseDir();
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="inner">
      <a class="brand" href="${base}index.html">
        <span class="title"><span class="hex">⬡</span> ${escapeHtml(SITE.title)}</span>
        <span class="tagline">${escapeHtml(SITE.tagline)}</span>
      </a>
      <nav id="siteNav">
        <a href="${base}index.html" class="${active === "home" ? "cta" : ""}">홈</a>
        <select class="theme-select" id="themeSelect" title="테마 선택" aria-label="테마 선택">
          ${THEMES.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")}
        </select>
        <span id="authSlot"></span>
      </nav>
    </div>`;
  document.body.prepend(header);

  // 테마 선택기
  applyTheme(currentTheme());
  const sel = header.querySelector("#themeSelect");
  sel.value = currentTheme();
  sel.addEventListener("change", () => applyTheme(sel.value));

  const slot = header.querySelector("#authSlot");
  onUser((user) => {
    slot.innerHTML = "";
    if (user) {
      if (user.photoURL) {
        const img = document.createElement("img");
        img.className = "avatar";
        img.src = user.photoURL;
        img.title = user.email || "";
        slot.appendChild(img);
      }
      const out = document.createElement("button");
      out.textContent = "로그아웃";
      out.onclick = () => logout();
      slot.appendChild(out);
    } else {
      const inBtn = document.createElement("button");
      inBtn.textContent = "로그인";
      inBtn.onclick = () => login().catch((e) => alert("로그인 실패: " + e.message));
      slot.appendChild(inBtn);
    }
  });
}

export function mountFooter() {
  const f = document.createElement("footer");
  f.className = "site-footer";
  f.innerHTML = `
    <div class="fbrand"><span class="hex">⬡</span> ${escapeHtml(SITE.title)}</div>
    <div class="flinks">
      <a href="${baseDir()}index.html">홈</a>
      <a href="${baseDir()}../">purehero.github.io</a>
    </div>
    <div class="fcopy">${escapeHtml(SITE.tagline)} · 정적 발행 · 댓글은 Firebase<span class="site-visits" id="siteVisits" hidden></span></div>`;
  document.body.appendChild(f);

  // 사이트 방문 수 — 오늘/어제/누적. 모든 페이지 공통. 같은 날 세션당 1회만 증가.
  (async () => {
    const el = f.querySelector("#siteVisits");
    if (!el) return;
    const today = ymdLocal(0);
    const yst = ymdLocal(-1);
    const todayId = "day-" + today;
    try {
      if (!sessionStorage.getItem("visited-" + today)) {
        // 누적(site-total) + 오늘(day-<날짜>) 두 카운터를 함께 올린다.
        const ok = await bumpViews(SITE_VIEWS_ID) && await bumpViews(todayId);
        if (ok) sessionStorage.setItem("visited-" + today, "1");
      }
    } catch { /* sessionStorage 미지원 등 — 무시 */ }
    const [total, tCnt, yCnt] = await Promise.all([
      getViews(SITE_VIEWS_ID),
      getViews(todayId),
      getViews("day-" + yst),
    ]);
    if (total != null) {
      const n = (v) => (v || 0).toLocaleString("ko-KR");
      el.textContent = ` · 방문 오늘 ${n(tCnt)} · 어제 ${n(yCnt)} · 누적 ${n(total)}`;
      el.hidden = false;
    }
  })();

  // 맨 위로 버튼 (모든 페이지 공통)
  const top = document.createElement("button");
  top.className = "to-top";
  top.type = "button";
  top.title = "맨 위로";
  top.setAttribute("aria-label", "맨 위로");
  top.textContent = "↑";
  top.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  document.body.appendChild(top);
  window.addEventListener("scroll", () => {
    top.classList.toggle("show", window.scrollY > 600);
  }, { passive: true });
}
