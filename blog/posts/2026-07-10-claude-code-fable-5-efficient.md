---
title: "Claude Code에서 Fable 5, 돈 아끼며 제대로 쓰는 법"
slug: "claude-code-fable-5-efficient"
date: "2026-07-10"
tags: ["AI", "Claude Code", "하우투", "팁"]
cover: "./assets/covers/claude-code-fable-5-efficient.svg"
published: true
---

Claude Fable 5는 2026년 6월 9일 공개된 Anthropic의 가장 강력한 일반 공개 모델이다. Opus 계열 위에 앉는 "최상위 티어"로, 긴 자율 세션을 흐트러짐 없이 끌고 가고, 행동하기 전에 조사하고, 스스로 검증까지 하는 모델이다. Claude Code에서 이 모델을 쓸 수 있게 된 지금, 문제는 하나다. **입력 100만 토큰당 $10, 출력 $50 — Opus 4.8($5/$25)의 정확히 두 배**다.

가격이 두 배라고 무조건 비싼 건 아니다. 밤새 돌린 에이전트가 5시간째에 길을 잃고 버릴 결과물을 내놓는다면, 브리핑을 끝까지 붙들고 있는 모델은 토큰 단가가 두 배여도 더 싸다. 아키텍처 결정·보안 리뷰·전방위 마이그레이션처럼 틀리면 비싼 작업, 지금 두 번 돌리거나 두 번째 모델로 검수하던 작업이라면, 강한 모델로 한 번에 끝내는 게 오히려 절약이다. 반대로 짧고 지연에 민감하거나 대량으로 반복되는 작업이라면 Fable을 켜는 순간 돈이 샌다.

이 글은 Claude Code에서 Fable 5를 **비용 대비 효과가 나오도록** 쓰는 법을 다룬다. 모델을 켜고 끄는 법, `effort`로 사고 깊이(=토큰 지출)를 조절하는 법, 서브에이전트로 비용 구조 자체를 바꾸는 법, 프롬프트 캐싱과 긴 세션 관리, 그리고 안전 분류기 자동 폴백처럼 모르면 당황하는 지점까지 순서대로 짚는다. 모든 수치와 명령은 공식 문서에서 확인한 것이다.

## 언제 Fable를 켜야 하나

Fable 5는 Claude Code의 기본 모델이 아니다. 명시적으로 골라야만 쓴다. 판단 기준은 단순하다. **"이 작업이 정말 어렵고 긴가?"**

- **켠다**: 대규모 마이그레이션, 다단계 에이전트 워크플로, 깊은 리서치, 복잡한 문서 분석, 원인 규명형 디버깅, 아키텍처 결정, 보안 민감 리뷰. 즉 원래대로면 여러 조각으로 쪼갤 큰 작업.
- **끈다**: 짧은 코드 수정, 대량 반복 작업, 지연에 민감한 인터랙티브 작업. 이런 건 Opus 4.8(절반 값)이나 Sonnet·Haiku가 더 똑똑한 선택이다.

> **비용 직관**: "두 번 돌릴 뻔한 작업" 또는 "다른 모델로 재검수할 작업"이면 Fable로 한 번에 끝내는 게 싸다. "한 번에 끝날 작업"이면 Fable은 과잉이다.

공식 가이드가 권하는 Fable 활용 방식도 이 기준과 맞닿아 있다. **결과를 주고 경로는 맡겨라**(단계별로 지시하지 말 것), **모호한 문제를 던져라**(조사·검증이 값을 하는 지점), **검증 리마인더는 생략하라**(알아서 자기 일을 검증한다), **크게 줘라**(평소 쪼개던 작업도 한 세션에 붙든다).

## Claude Code에서 Fable 선택하기

먼저 버전 요건. **Fable 5는 Claude Code v2.1.170 이상**에서만 모델 피커에 나타난다. 구버전은 선택 자체가 안 되니 먼저 업데이트한다.

```bash
claude update
```

그다음 세션 안에서 모델을 바꾼다. 세 가지 방법 모두 동작한다.

```bash
# 별칭으로 (가장 간단)
/model fable

# 전체 모델명으로
/model claude-fable-5

# 인자 없이 피커 열기 (effort 슬라이더도 여기서 조절)
/model
```

모델 별칭은 버전 번호를 외우지 않아도 되게 해준다. Fable 관련해서 알아두면 좋은 별칭:

| 별칭 | 동작 |
| --- | --- |
| `fable` | 가장 어렵고 오래 걸리는 작업에 Fable 5 |
| `best` | Fable 5를 쓸 수 있으면 Fable, 아니면 최신 Opus |
| `opus` | 최신 Opus(현재 Opus 4.8) |
| `default` | 오버라이드를 지우고 계정 기본 모델로 복귀 (Fable는 어떤 계정에서도 기본이 아님) |

모델을 지정하는 경로는 우선순위가 있다. 위에 있을수록 우선한다.

1. **세션 중** `/model <별칭|이름>` — v2.1.153부터는 이 선택이 새 세션 기본값으로도 저장된다(피커에서 `Enter`는 저장, `s`는 이번 세션만).
2. **시작 시** `claude --model fable`
3. **환경변수** `ANTHROPIC_MODEL=fable`
4. **설정 파일**의 `model` 필드

```json
{
  "model": "fable"
}
```

> **주의**: Fable 5는 [제로 데이터 보존(ZDR)](https://code.claude.com/docs/en/zero-data-retention)에서는 쓸 수 없다(30일 보존이 강제됨). ZDR 계정에서는 `/model` 피커에 Fable이 안 뜨거나 비활성으로 보인다.

## effort로 사고 깊이 = 비용 조절하기

Fable에서 비용을 좌우하는 가장 큰 손잡이는 **effort**다. effort는 모델이 각 단계에서 "얼마나 생각하고 몇 번 도구를 부를지"를 정한다. Fable은 `low`·`medium`·`high`·`xhigh`·`max` 다섯 단계를 지원하고 **기본값은 `high`**다.

```bash
# 인터랙티브 슬라이더
/effort

# 레벨 직접 지정
/effort medium

# 모델 기본값으로 리셋
/effort auto
```

여기서 흔히 하는 실수가 "가장 강한 모델이니 `max`나 `xhigh`로 박아두자"다. Fable에서는 이게 오히려 낭비다. **Fable은 낮은 effort에서도 이전 세대 모델의 `xhigh`·`max` 출력을 능가하는 경우가 많다.** 즉 대부분의 작업은 `high`(기본)나 그 아래에서 충분하고, `xhigh`·`max`는 정말 어려운 일에만 아껴 쓰는 게 맞다. `max`는 "제약 없는 최대 추론"이지만 과잉 사고(overthinking)에 빠지기 쉬워서, 넓게 적용하기 전에 반드시 테스트하라고 공식 문서도 못 박는다.

effort 레벨별 감:

| 레벨 | 언제 |
| --- | --- |
| `low` | 짧고 범위가 좁고 지연에 민감한, 지능이 별로 필요 없는 작업 |
| `medium` | 지능을 조금 양보해도 되는 비용 민감 작업 |
| `high` | 지능과 토큰의 균형. **Fable 기본** — 대부분 여기서 시작 |
| `xhigh` | 더 깊은 추론, 더 많은 토큰. 정말 어려운 코딩·에이전트 작업에만 |
| `max` | 데모까지 파고드는 최대 추론. 과잉 사고 위험, 테스트 후 채택 |

effort는 세션·설정·환경변수(`CLAUDE_CODE_EFFORT_LEVEL`)로도 정할 수 있고, 스킬·서브에이전트 frontmatter의 `effort` 필드로 특정 작업에만 오버라이드할 수도 있다. 다만 `max`와 `ultracode`는 세션 한정이라 설정 파일에는 저장되지 않는다.

> **일회성 심화 추론**: 세션 effort를 바꾸지 않고 이번 턴만 더 깊게 생각시키고 싶으면 프롬프트 아무 곳에나 `ultrathink`를 넣는다. Claude Code가 이 키워드를 알아채 인컨텍스트 지시를 추가한다("think", "think hard" 같은 표현은 그냥 텍스트로 흘러갈 뿐 키워드가 아니다).

참고로 **Fable은 사고(thinking)를 끌 수 없다.** 세션 토글, `alwaysThinkingEnabled`, `MAX_THINKING_TOKENS=0` 모두 Fable에서는 무효다. Fable은 effort 설정을 보고 단계마다 얼마나 생각할지 스스로 정한다. 그래서 "얼마나 생각할지"를 조절하는 실질적 손잡이가 effort인 것이다.

## 서브에이전트로 비용 구조 바꾸기

effort 튜닝이 "한 모델 안에서" 절약하는 법이라면, 서브에이전트는 **비용 구조 자체를 바꾼다.** 핵심 패턴은 이렇다.

> **Fable은 오케스트레이터로 두고, 실제 대량 작업은 값싼 서브에이전트(Sonnet 5, Haiku 4.5)가 각자의 컨텍스트에서 처리한다.**

Claude Code의 서브에이전트는 `.claude/agents/` 아래의 Markdown 파일로 정의하고, `model:` frontmatter로 그 에이전트가 돌 모델을 지정한다.

```markdown
---
name: bulk-refactor
description: 여러 파일을 기계적으로 수정하는 작업 담당
model: haiku
---

너는 대량 수정 담당이다. 지시받은 변경만 정확히 적용하고 결과를 보고한다.
```

이렇게 해두면 비싼 Fable은 "무엇을 어떻게 나눌지" 계획하고, 파일을 훑고 고치는 반복 작업은 Haiku·Sonnet이 자기 컨텍스트 창에서 병렬로 처리한다. Fable의 비싼 토큰이 오케스트레이션에만 쓰이니 총비용이 확 내려간다.

모든 서브에이전트 모델을 한 번에 지정하려면 환경변수를 쓴다.

```bash
# 모든 서브에이전트를 Haiku로 (per-invocation model, frontmatter model 모두 오버라이드)
export CLAUDE_CODE_SUBAGENT_MODEL=haiku
```

Fable은 특히 서브에이전트 위임을 잘 다룬다. 공식 가이드도 이전 모델에서 흔히 걸던 "위임 억제" 가드를 걷어내고, **오히려 위임을 자주 시키되 언제 위임할지를 명시하라**고 권한다. 독립적인 하위 작업(읽을 파일이 여럿, 돌릴 테스트가 여럿, 확인할 후보가 여럿)은 서브에이전트로 팬아웃하는 게 좋다.

## 프롬프트 캐싱과 긴 세션 관리

Fable의 강점은 긴 세션이지만, 긴 세션은 곧 많은 토큰이다. 두 가지로 관리한다.

**프롬프트 캐싱**은 반복되는 프리픽스를 캐시해 비용을 크게 줄인다. 핵심은 **프리픽스를 바이트 단위로 안정되게 유지하는 것**이다. 도구 정의와 시스템 프롬프트(=`CLAUDE.md` 등)를 세션 중에 바꾸지 말자. 도구를 추가·제거·재정렬하거나 모델을 바꾸면 캐시가 통째로 무효화된다. 캐싱은 프리픽스 매칭이라, 앞쪽 한 바이트만 달라져도 뒤가 전부 다시 계산된다.

**컨텍스트 관리**로 긴 실행을 가볍게 유지한다. Fable은 컴팩션(compaction)과 컨텍스트 편집(context editing)을 지원한다. Claude Code는 세션이 컨텍스트 창을 채우기 전에 자동으로 컴팩션해 오래된 내용을 요약·정리한다. 덕분에 밤샘 실행에서도 컨텍스트가 폭주하지 않는다.

또 Fable은 파일 기반 메모리를 잘 쓴다. 배운 것을 `.md` 파일에 적어두게 하고 다음 세션에서 참조하게 하면, 매번 같은 맥락을 다시 탐색하는 낭비가 준다. 스킬(Skills)로 미리 만들어 둔 맥락을 쥐여주는 것도 "탐색 대신 읽기"로 토큰을 아끼는 방법이다.

## Fable를 잘 쓰는 프롬프트 습관

Fable은 프롬프트 스타일이 이전 모델과 다르다. 아래 습관들이 품질과 비용을 동시에 개선한다.

- **결과를 주고, 이유까지 준다.** "이렇게 해라" 단계별 지시 대신 "이런 결과가 필요하다, 왜냐하면 …" 형태가 낫다. Fable은 의도를 이해하면 관련 정보를 스스로 연결한다. Claude Code에서는 [`/goal`](https://code.claude.com/docs/en/goal)로 목표를 고정해 그 결과가 성립할 때까지 작업을 이어가게 할 수 있다.
- **검증하라는 잔소리를 뺀다.** "테스트 돌려봐", "다시 확인해" 같은 리마인더는 Fable에선 대체로 불필요하다. 알아서 검증한다.
- **충분히 알면 바로 행동하게 한다.** 모호한 작업에서 과잉 계획을 막으려면 "정보가 충분하면 곧바로 실행하고, 이미 정해진 사실을 다시 유도하거나 안 할 선택지를 늘어놓지 말라"는 지침이 효과적이다.
- **긴 세션의 마무리 요약을 챙긴다.** 밤새 돌린 뒤 마지막 메시지는 사용자가 처음 보는 화면이다. 작업 중 쓰던 약어·화살표 체인을 걷어내고, 결과부터 완결된 문장으로 쓰게 하면 읽기가 훨씬 낫다.

## 안전 분류기 자동 폴백 주의

Fable에는 **안전 분류기**가 붙어 있어 특정 요청(주로 사이버보안·생물학 영역)을 거부할 수 있다. Claude Code는 이런 요청이 걸리면 자동으로 **기본 Opus 모델(Anthropic API에서는 Opus 4.8)로 그 요청을 다시 실행**하고 트랜스크립트에 알림을 남긴다. 그 뒤 세션은 그 Opus 모델에서 계속된다. Fable로 돌아가려면 다시 `/model fable`.

주의할 함정 하나: **세션 첫 요청에서 폴백이 뜰 수 있다.** 첫 요청에는 `CLAUDE.md` 내용과 git 상태 같은 워크스페이스 맥락이 실려 가는데, 저장소에 보안·생물학 관련 자료가 있으면 그 맥락만으로 분류기가 걸린다. 커스터마이즈가 원인인지 확인하려면 `--safe-mode`로 `CLAUDE.md`·스킬·MCP·훅을 끄고 세션을 열어본다(디렉터리명·git 상태는 여전히 포함된다).

```bash
# CLAUDE.md/스킬/MCP/훅을 끄고 폴백 원인 격리
claude --safe-mode
```

매번 자동 전환하지 않고 그때그때 정하고 싶으면 `/config`에서 "switch models when a message is flagged"를 끈다. 그러면 걸린 요청이 세션을 멈추고 "Opus로 전환" vs "프롬프트 고쳐 Fable로 재시도" 중 고르게 한다. 침투 테스트·CTF·생물학 인접 코드베이스 같은 워크로드는 폴백이 자주(첫 요청부터) 뜨는 게 정상이다 — 계정 문제가 아니다.

## 흔한 함정 정리

- **Fable을 기본으로 박아둔다** → 두 배 단가가 짧은 작업에도 붙는다. 어렵고 긴 작업에만 `/model fable`.
- **effort를 무조건 `max`/`xhigh`로** → 과잉 사고와 토큰 낭비. Fable은 낮은 effort에서도 이전 세대 최고치를 넘는다. `high`에서 시작.
- **세션 중 도구·모델을 바꾼다** → 프롬프트 캐시가 무효화돼 비용이 튄다. 도구·시스템 프롬프트는 얼려둔다.
- **큰 작업을 잘게 쪼개 지시한다** → Fable의 장점(긴 세션 유지)을 못 살린다. 결과를 주고 크게 맡긴다.
- **모든 일을 Fable에 시킨다** → 대량 반복은 서브에이전트(Haiku·Sonnet)로 위임해 오케스트레이션만 Fable에.
- **버전이 낮다** → v2.1.170 미만은 Fable이 안 보인다. `claude update`.
- **폴백을 오해한다** → 보안·생물학 요청의 Opus 자동 전환은 정상 라우팅이지 오류가 아니다.

정리하면, Claude Code에서 Fable 5의 효율은 "언제 켜느냐(작업 선택) × 얼마나 생각시키느냐(effort) × 누구에게 시키느냐(서브에이전트)"의 곱이다. 세 손잡이를 의식적으로 돌리면, 두 배 단가의 최상위 모델을 오히려 총비용이 낮은 선택으로 만들 수 있다.

## 참고 자료

- [Model configuration — Claude Code Docs](https://code.claude.com/docs/en/model-config)
- [Introducing Claude Fable 5 and Claude Mythos 5 — Claude Platform Docs](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
- [Effort — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Adaptive thinking — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Prompting Claude Fable 5 — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)
