// =============================================================================
// common.js — Firebase 초기화 + 공통 유틸 (헤더, 인증, Markdown 렌더)
// 모든 페이지에서 ESM 으로 import 합니다.
// =============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp,
  limit, limitToLast,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/+esm";
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3/+esm";
import hljs from "https://cdn.jsdelivr.net/npm/highlight.js@11/+esm";

import { firebaseConfig, ADMIN_EMAILS, SITE } from "./firebase-config.js";

// ---- Firebase 핸들 ----------------------------------------------------------
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Firestore / Storage / Auth 재-export (페이지에서 편하게 쓰도록)
export {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, limit, limitToLast,
  storageRef, uploadBytes, getDownloadURL,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
};
export { SITE, ADMIN_EMAILS };

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

// ---- Markdown 렌더 ----------------------------------------------------------
marked.setOptions({ gfm: true, breaks: false });

// 렌더 후 highlightWithin() 으로 코드 하이라이트를 적용합니다(아래 함수).
export function renderMarkdown(md) {
  const rawHtml = marked.parse(md || "");
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["target", "rel"],
  });
}

// 렌더된 컨테이너 내부 <pre><code> 에 하이라이트 적용
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
export function mountHeader(active = "") {
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="inner">
      <a class="brand" href="./index.html">
        <span class="title"><span class="hex">⬡</span> ${escapeHtml(SITE.title)}</span>
        <span class="tagline">${escapeHtml(SITE.tagline)}</span>
      </a>
      <nav id="siteNav">
        <a href="./index.html" class="${active === "home" ? "cta" : ""}">홈</a>
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
    if (isAdmin(user)) {
      const write = document.createElement("a");
      write.href = "./write.html";
      write.textContent = "글쓰기";
      if (active === "write") write.className = "cta";
      slot.appendChild(write);
    }
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
      <a href="./index.html">홈</a>
      <a href="../">purehero.github.io</a>
    </div>
    <div class="fcopy">${escapeHtml(SITE.tagline)} · Powered by Firebase Firestore + Storage</div>`;
  document.body.appendChild(f);

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
