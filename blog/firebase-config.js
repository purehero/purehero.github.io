// -----------------------------------------------------------------------------
// Firebase 설정
// -----------------------------------------------------------------------------
// Firebase 콘솔 > 프로젝트 설정 > "내 앱" > 웹 앱 에서 발급받은 값으로 교체하세요.
// 이 값들은 브라우저에 노출되어도 안전합니다. (실제 보안은 firestore.rules /
// storage.rules 와 인증으로 보장됩니다.)
//
// 참고: https://firebase.google.com/docs/web/setup
// -----------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyAdhdJhH1SPE_fS4XMaDM_gI3tOLpedeU0",
  authDomain: "my-personal-blog-cad5c.firebaseapp.com",
  projectId: "my-personal-blog-cad5c",
  storageBucket: "my-personal-blog-cad5c.firebasestorage.app",
  messagingSenderId: "249596744410",
  appId: "1:249596744410:web:c8b0b7bd00fc875da98be3"
};

// 글을 작성/수정/삭제할 수 있는 관리자 이메일 목록 (소문자).
// 여기에 없는 계정으로 로그인하면 글 작성 페이지를 볼 수 없습니다.
// 반드시 firestore.rules / storage.rules 에도 동일한 이메일을 반영하세요.
export const ADMIN_EMAILS = [
  "purehero@gmail.com",
];

// 블로그 메타 정보 (헤더·타이틀에 사용)
export const SITE = {
  title: "맑은(준)호걸(호)",
  tagline: "하우투 · 팁 · 기술 노트",
};
