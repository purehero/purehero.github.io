---
title: "AI 에이전트, 밑바닥부터 만들기 — 툴 콜링과 에이전틱 루프, 그리고 MCP"
slug: "ai-agent-tool-use-loop"
date: "2026-07-10"
tags: ["AI", "하우투", "파이썬", "MCP"]
cover: "./assets/covers/ai-agent-tool-use-loop.svg"
published: true
---

"AI 에이전트"라는 말은 2026년 개발 바닥에서 가장 흔하게 쓰이면서도 가장 두루뭉술한 단어다. 프레임워크마다 다르게 부르고, 데모마다 다르게 보이니 실체가 잡히지 않는다. 하지만 벗겨 보면 에이전트의 심장은 놀랍도록 단순하다. **LLM이 도구(tool)를 호출하고, 그 결과를 보고, 다음 행동을 정하는 것을 멈출 때까지 반복하는 `while` 루프** 하나다.

이 글은 그 루프를 프레임워크 없이 직접 짜 본다. LangChain이나 CrewAI 같은 추상화 계층을 걷어내고 밑바닥부터 만들어 보면, 나중에 어떤 프레임워크를 쓰든 "안에서 실제로 무슨 일이 일어나는지"를 알게 된다. 예제는 Anthropic Python SDK와 Claude Opus 4.8(`claude-opus-4-8`)로 작성하지만, 개념(툴 스키마, 에이전틱 루프, 툴 결과 왕복)은 어떤 LLM API에도 그대로 옮겨진다.

다룰 범위는 이렇다. 먼저 에이전틱 루프의 뼈대를 세우고, 툴을 정의하는 법과 루프를 손으로 짜는 법을 본다. 그다음 여러 툴을 병렬로 호출할 때의 함정과 에러 처리를 짚고, SDK의 툴 러너로 루프를 자동화한다. 마지막으로 개별 툴을 매번 다시 짜는 대신 **MCP(Model Context Protocol)**로 표준화하는 방향을 살펴본다.

## 에이전트의 심장: 에이전틱 루프

에이전트를 한 문장으로 정의하면 이렇다. *"무언가를 한다 → 결과를 확인한다 → 계속할지 멈출지 정한다"* 를 반복하는 것. 이걸 관찰(observe) → 사고(think) → 행동(act) 루프라고도 부른다. 기술의 본질은 이 "확인"을 실제로 의미 있게 만들고, "언제 멈출지"를 정확히 정의하는 데 있다.

LLM API 관점에서 루프는 응답의 `stop_reason` 필드로 굴러간다. 모델이 도구를 쓰고 싶으면 응답에 `stop_reason: "tool_use"`가 붙고 `tool_use` 블록이 담겨 온다. 우리가 그 도구를 실행해 결과를 돌려주면, 모델이 그 결과를 보고 다음 행동을 정한다. 도구가 더 필요 없으면 `stop_reason`이 `end_turn`으로 바뀌고, 그때 루프를 빠져나온다.

```
1. tools 배열과 함께 사용자 메시지를 보낸다
2. while stop_reason == "tool_use":
   a. 응답에서 tool_use 블록을 모두 꺼낸다
   b. 각 도구를 실행하고 결과를 모은다
   c. assistant 응답을 대화 기록에 append 한다
   d. tool_result 블록들을 담은 user 메시지를 만든다
   e. 갱신된 messages 배열을 다시 API로 보낸다
3. stop_reason != "tool_use" 이면 최종 텍스트를 반환한다
```

> 핵심은 (b)와 (d)다. 도구 실행은 **전적으로 우리 코드의 책임**이다. 모델은 "이 도구를 이 입력으로 불러 달라"고 요청할 뿐, 실제 실행·검증·게이팅은 우리 harness가 한다. 이 경계가 에이전트의 안전성과 UX를 좌우한다.

## 툴 정의하기

도구는 세 가지로 정의한다. `name`, `description`, 그리고 JSON Schema 형식의 `input_schema`다.

```json
{
  "name": "get_weather",
  "description": "특정 지역의 현재 날씨를 조회한다. 사용자가 날씨·기온·강수를 물으면 호출한다.",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "도시 이름, 예: Seoul, KR"
      },
      "unit": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "온도 단위"
      }
    },
    "required": ["location"]
  }
}
```

`description`은 장식이 아니라 **모델이 언제 이 도구를 쓸지 판단하는 유일한 근거**다. "무엇을 하는가"만 쓰지 말고 "언제 불러야 하는가"까지 명시하는 게 좋다. 최근 모델일수록 도구를 신중하게 고르는 경향이 있어서, "사용자가 현재 가격이나 최근 사건을 물으면 호출한다" 같은 트리거 조건을 넣으면 호출 정확도가 눈에 띄게 올라간다.

몇 가지 원칙:

- 이름은 구체적으로. `weather`보다 `get_current_weather`가 낫다.
- 값이 정해져 있으면 `enum`을 쓴다.
- 진짜 필수인 파라미터만 `required`에 넣고, 나머지는 기본값이 있는 선택 항목으로 둔다.
- 도구를 너무 많이 쥐여주면 모델이 헷갈린다. 세트를 좁고 목적이 뚜렷하게 유지한다.

## 밑바닥부터 만드는 에이전트 (Python)

이제 루프를 직접 짠다. 예제는 두 정수를 더하는 간단한 `add` 도구지만, 구조는 어떤 도구를 붙이든 똑같다.

```python
import json
import anthropic

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수에서 인증

tools = [{
    "name": "add",
    "description": "두 정수를 더한다. 산술 덧셈이 필요할 때 호출한다.",
    "input_schema": {
        "type": "object",
        "properties": {
            "a": {"type": "integer"},
            "b": {"type": "integer"},
        },
        "required": ["a", "b"],
    },
}]

def run_tool(name, tool_input):
    """모델이 요청한 도구를 실제로 실행하는 곳 — 여기가 우리 harness다."""
    if name == "add":
        return tool_input["a"] + tool_input["b"]
    raise ValueError(f"알 수 없는 도구: {name}")

messages = [{"role": "user", "content": "17과 25를 더하면?"}]

response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    tools=tools,
    messages=messages,
)

# 에이전틱 루프
while response.stop_reason == "tool_use":
    tool_results = []
    for block in response.content:
        if block.type == "tool_use":
            result = run_tool(block.name, block.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,       # 반드시 요청한 블록의 id와 매칭
                "content": json.dumps(result),
            })

    # 대화 기록에 assistant 응답(툴 요청 포함)과 그 결과를 이어 붙인다
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": tool_results})

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        tools=tools,
        messages=messages,
    )

# 도구를 더 안 쓰면 최종 텍스트가 나온다
final = next(b.text for b in response.content if b.type == "text")
print(final)
```

주의할 지점 세 가지:

1. **`response.content`를 통째로 append 한다.** `tool_use` 블록을 보존해야 다음 요청에서 결과와 짝이 맞는다. 텍스트만 뽑아 넣으면 대화가 깨진다.
2. **`tool_use_id`를 반드시 맞춘다.** 각 `tool_result`는 자신이 응답하는 `tool_use` 블록의 `id`를 가져야 한다.
3. **API는 상태가 없다(stateless).** 매 요청마다 전체 `messages`를 다시 보낸다. 대화 기록 관리는 우리 몫이다.

## 여러 툴을 병렬로, 그리고 에러 처리

모델은 한 응답에 **여러 개의 `tool_use` 블록**을 담아 올 수 있다. 독립적인 조회 여러 건을 동시에 요청하는 것이다. 위 루프의 `for block in response.content`가 이미 이 경우를 처리하지만, 결과를 돌려줄 때 규칙이 하나 있다.

> **모든 `tool_result`는 하나의 `user` 메시지에 담아 한 번에 돌려줘야 한다.** 결과를 여러 메시지로 쪼개 보내면, 모델은 조용히 "병렬 호출을 하면 안 되는구나"라고 학습해 다음부터 도구를 하나씩만 부른다. 성능이 눈에 안 띄게 나빠지는 함정이다.

에러도 그냥 삼키면 안 된다. 실패한 도구는 결과를 빠뜨리지 말고 `is_error: true`로 표시해 돌려준다. 그래야 모델이 "아, 실패했구나" 하고 다른 방법을 시도하거나 사용자에게 되묻는다.

```python
tool_results = []
for block in response.content:
    if block.type != "tool_use":
        continue
    try:
        result = run_tool(block.name, block.input)
        tool_results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": json.dumps(result),
        })
    except Exception as e:
        tool_results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": f"오류: {e}",
            "is_error": True,      # 모델이 복구를 시도하도록
        })
```

부작용이 있는 도구(이메일 전송, DB 수정, 결제)는 실행 전에 검증하고, 되돌리기 어려운 작업은 사용자 승인 뒤에 실행되도록 게이팅한다. 이 게이트는 `run_tool` 안에서 "사용자가 거부함" 결과를 돌려주는 식으로 넣으면 된다.

## 툴 러너로 루프 자동화

손으로 짠 루프는 안에서 무슨 일이 벌어지는지 이해하는 데 최고다. 하지만 실제 코드에서는 매번 이걸 다시 쓸 필요가 없다. Anthropic SDK의 **툴 러너**(베타)가 요청 → 도구 실행 → 결과 회신 → 반복을 대신 굴려 준다.

```python
import anthropic
from anthropic import beta_tool

client = anthropic.Anthropic()

@beta_tool
def add(a: int, b: int) -> str:
    """두 정수를 더한다. 산술 덧셈이 필요할 때 호출한다.

    Args:
        a: 첫 번째 정수.
        b: 두 번째 정수.
    """
    return str(a + b)

# 스키마는 함수 시그니처와 docstring에서 자동 생성된다
runner = client.beta.messages.tool_runner(
    model="claude-opus-4-8",
    max_tokens=1024,
    tools=[add],
    messages=[{"role": "user", "content": "17과 25를 더하면?"}],
)

for message in runner:   # Claude가 도구를 다 쓰면 반복이 끝난다
    print(message)
```

`@beta_tool` 데코레이터가 함수 시그니처와 docstring에서 `input_schema`를 자동으로 만들어 준다. 손으로 JSON Schema를 쓸 필요가 없고, 루프 종료 판정도 러너가 알아서 한다.

수동 루프와 툴 러너, 언제 무엇을 쓸까:

| 상황 | 권장 |
| --- | --- |
| 개념 학습, 루프 내부 이해 | 수동 루프 |
| 일반적인 커스텀 툴 에이전트 | 툴 러너 |
| 사람 승인 게이트, 결과 가공, 재시도 | 툴 러너 (턴별 훅으로 가능) |
| 완전히 커스텀한 제어 흐름·전송 계층 | 수동 루프 |

인간 승인(human-in-the-loop)은 흔히 "수동 루프가 필요한 이유"로 오해되지만, 툴 러너의 턴별 훅이나 도구 함수 내부 게이팅으로 대부분 커버된다.

## MCP: 툴을 표준으로

여기까지 오면 자연스러운 불만이 생긴다. *"도구를 쓸 때마다 스키마를 짜고, 실행 코드를 붙이고, 인증을 처리해야 하나?"* GitHub, Slack, Postgres에 각각 붙이려면 매번 통합을 새로 짜야 한다. 이 파편화 문제를 풀려고 Anthropic이 2024년 11월 25일 공개한 오픈 표준이 **MCP(Model Context Protocol)**다.

MCP는 데이터 소스·도구와 AI 애플리케이션을 잇는 **클라이언트-서버** 규약이다. 도구·데이터를 제공하는 쪽이 **MCP 서버**를 열고, LLM 애플리케이션은 **MCP 클라이언트**로 거기에 붙는다. 한 번 MCP 서버로 만들어 두면 그 도구는 MCP를 말하는 어떤 클라이언트든 쓸 수 있다 — 통합을 N×M에서 N+M으로 줄이는 것이다.

2026년 현재 MCP는 사실상 에이전트 도구 연결의 공용어가 됐다. 주요 모델 제공사와 에이전트 프레임워크 대부분이 이를 지원하고, LangGraph·CrewAI·LlamaIndex·Semantic Kernel 같은 프레임워크가 도구 호출의 기본 프로토콜로 채택했다. 코드 도구(예: 에디터 통합)도 MCP 서버를 꽂아 즉시 기능을 확장하는 방식이 표준이 됐다.

앞서 손으로 만든 에이전트와의 관계는 이렇다. **에이전틱 루프는 그대로다.** MCP는 그 루프에 들어갈 `tools` 배열을 "직접 정의한 로컬 함수"에서 "MCP 서버가 노출하는 표준 도구"로 바꿔 줄 뿐이다. Anthropic SDK는 MCP 도구를 API 타입으로 변환하는 헬퍼(`anthropic.lib.tools.mcp`)를 제공하고, 원격 MCP 서버에 직접 붙는 `mcp_servers` 파라미터도 있다. 개념적으로는:

```
[내가 짠 tools 배열]  →  [MCP 서버가 노출하는 도구 목록]
run_tool() 로컬 실행   →  MCP 클라이언트가 서버에 실행 위임
```

즉 MCP를 배우기 전에 이 글의 수동 루프를 이해하는 게 순서다. MCP는 "도구를 어떻게 연결하고 인증하느냐"를 표준화할 뿐, 에이전트가 돌아가는 원리 자체를 바꾸지는 않는다.

## 흔한 함정 정리

밑바닥부터 만들 때 반복해서 밟는 지점들:

- **`response.content`에서 텍스트만 뽑아 저장** → `tool_use` 블록이 사라져 다음 턴이 깨진다. 통째로 append.
- **`tool_result`를 여러 user 메시지로 쪼개 전송** → 병렬 도구 호출이 조용히 사라진다. 한 메시지에 몰아서.
- **`tool_use_id` 누락/불일치** → API가 요청을 거부한다. 요청 블록의 `id`를 그대로.
- **에러를 삼킴** → 실패한 도구도 `is_error: true`로 반드시 결과를 돌려줘야 모델이 복구한다.
- **무한 루프** → 반복 상한(`max_iterations`)이나 토큰 예산으로 폭주를 막는다.
- **툴 입력을 문자열 매칭으로 파싱** → 항상 `json.loads()` / 파싱된 `block.input`을 쓴다. 이스케이프 방식이 모델·버전마다 다를 수 있다.
- **모델 출력을 무조건 신뢰** → 민감한 작업은 실행 전 검증·게이팅. 모델은 요청할 뿐, 책임은 harness에 있다.

에이전트는 결국 "도구 + 루프 + 안전장치"의 조합이다. 프레임워크는 이 셋을 편하게 묶어 주지만, 밑바닥을 한 번 짜 보면 프레임워크가 무엇을 대신해 주는지, 그리고 무엇을 여전히 우리가 책임져야 하는지가 선명해진다.

## 참고 자료

- [Tutorial: Build a tool-using agent — Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/build-a-tool-using-agent)
- [Tool use overview — Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Introducing the Model Context Protocol — Anthropic](https://www.anthropic.com/news/model-context-protocol)
- [Model Context Protocol 공식 사이트](https://modelcontextprotocol.io/)
- [The State of Agentic AI Standards in 2026 (MCP, A2A, WebMCP) — DEV Community](https://dev.to/alexmercedcoder/the-state-of-agentic-ai-standards-in-2026-mcp-a2a-webmcp-osi-and-the-protocol-stack-taking-3o2l)
