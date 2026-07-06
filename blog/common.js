// =============================================================================
// common.js — Firebase 초기화 + 공통 유틸 (헤더, 인증, Markdown 렌더)
// 모든 페이지에서 ESM 으로 import 합니다.
// =============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp,
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
  query, where, orderBy, serverTimestamp,
  storageRef, uploadBytes, getDownloadURL,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
};
export { SITE, ADMIN_EMAILS };

// ---- 인증 -------------------------------------------------------------------
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
        <span id="authSlot"></span>
      </nav>
    </div>`;
  document.body.prepend(header);

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
  f.innerHTML = `<a href="../">← purehero.github.io</a> · Firebase Firestore + Storage`;
  document.body.appendChild(f);
}
