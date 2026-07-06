// =============================================================================
// templates.js — 홈 화면 템플릿 렌더러
// 테마(common.js THEMES[].layout)에 따라 히어로/카드/목록 구조를 다르게 생성.
// 모든 함수는 순수하게 HTML 문자열을 반환합니다.
// =============================================================================

import { escapeHtml, fmtDate } from "./common.js";

const hrefOf = (p) => `./post.html?id=${encodeURIComponent(p.id)}`;
const firstTag = (p) => (p.tags || [])[0] || "GUIDE";
const coverImg = (p, cls) => p.coverImage
  ? `<img class="${cls}" src="${escapeHtml(p.coverImage)}" alt="" loading="lazy">`
  : `<div class="${cls} is-ph">⬡</div>`;
const tagPills = (p, n = 3) => (p.tags || []).slice(0, n)
  .map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

// ---- 카드 -------------------------------------------------------------------
// 세로 카드 (2col / 3col)
export function cardVertical(p) {
  return `<a class="post-card" href="${hrefOf(p)}">
    ${coverImg(p, "cover")}
    <div class="body">
      <span class="eyebrow">${escapeHtml(firstTag(p))}</span>
      <h2>${escapeHtml(p.title)}</h2>
      <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
      <div class="meta"><span class="date">${fmtDate(p.createdAt)}</span>${tagPills(p, 2)}</div>
    </div></a>`;
}
// 가로 카드 (list)
export function cardHorizontal(p) {
  return `<a class="post-card horiz" href="${hrefOf(p)}">
    ${coverImg(p, "cover")}
    <div class="body">
      <span class="eyebrow">${escapeHtml(firstTag(p))}</span>
      <h2>${escapeHtml(p.title)}</h2>
      <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
      <div class="meta"><span class="date">${fmtDate(p.createdAt)}</span>${tagPills(p, 3)}</div>
    </div></a>`;
}
// 스택 카드 (editorial): 텍스트 중심, 큰 제목, 구분선
export function cardStack(p) {
  return `<a class="post-stack" href="${hrefOf(p)}">
    <span class="eyebrow">${escapeHtml(firstTag(p))} · ${fmtDate(p.createdAt)}</span>
    <h2>${escapeHtml(p.title)}</h2>
    <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
  </a>`;
}

export function renderCards(grid, posts) {
  if (!posts.length) return "";
  if (grid === "list") return posts.map(cardHorizontal).join("");
  if (grid === "stack") return posts.map(cardStack).join("");
  return posts.map(cardVertical).join(""); // 2col / 3col
}

// ---- 히어로 -----------------------------------------------------------------
// scrim: 대형 이미지 + 그라디언트 오버레이
export function heroScrim(p) {
  const img = p.coverImage
    ? `<img src="${escapeHtml(p.coverImage)}" alt=""><div class="scrim"></div>` : "";
  return `<a class="hero ${p.coverImage ? "" : "no-img"}" href="${hrefOf(p)}">
    ${img}
    <div class="hcontent">
      <span class="eyebrow">추천 · ${escapeHtml(firstTag(p))}</span>
      <h2>${escapeHtml(p.title)}</h2>
      <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
      <div class="meta">${fmtDate(p.createdAt)}</div>
    </div></a>`;
}
// split: 가로 카드형 고정 포스트 (이미지 왼쪽 / 텍스트 오른쪽)
export function heroSplit(p) {
  return `<a class="hero-split" href="${hrefOf(p)}">
    ${coverImg(p, "hs-cover")}
    <div class="hs-body">
      <span class="eyebrow">고정 · ${escapeHtml(firstTag(p))}</span>
      <h2>${escapeHtml(p.title)}</h2>
      <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
      <div class="meta">${fmtDate(p.createdAt)}</div>
    </div></a>`;
}
// feature: 큰 1개 + 작은 2개 (뉴스 매거진 상단 블록)
export function heroFeature(posts) {
  const big = posts[0];
  const small = posts.slice(1, 3);
  const bigImg = big.coverImage
    ? `<img src="${escapeHtml(big.coverImage)}" alt=""><div class="scrim"></div>` : "";
  const bigHtml = `<a class="feat-big ${big.coverImage ? "" : "no-img"}" href="${hrefOf(big)}">
    ${bigImg}
    <div class="hcontent">
      <span class="eyebrow">헤드라인 · ${escapeHtml(firstTag(big))}</span>
      <h2>${escapeHtml(big.title)}</h2>
      <div class="meta">${fmtDate(big.createdAt)}</div>
    </div></a>`;
  const smallHtml = small.map((p) => {
    const img = p.coverImage
      ? `<img src="${escapeHtml(p.coverImage)}" alt=""><div class="scrim"></div>` : "";
    return `<a class="feat-small ${p.coverImage ? "" : "no-img"}" href="${hrefOf(p)}">
      ${img}
      <div class="hcontent">
        <span class="eyebrow">${escapeHtml(firstTag(p))}</span>
        <h3>${escapeHtml(p.title)}</h3>
      </div></a>`;
  }).join("");
  return {
    html: `<div class="feature-row">${bigHtml}<div class="feat-col">${smallHtml}</div></div>`,
    used: 1 + small.length,
  };
}

// heroType 에 맞는 히어로 HTML 과 소비한 글 개수를 반환
export function buildHero(heroType, posts) {
  if (heroType === "none" || !posts.length) return { html: "", used: 0 };
  if (heroType === "feature") return heroFeature(posts);
  if (heroType === "split") return { html: heroSplit(posts[0]), used: 1 };
  return { html: heroScrim(posts[0]), used: 1 };
}
