# Phase 3D Step 1: FL 메타 인터프리터 구조 분석

**기준점**: `876a5f9`  
**분석 대상**: FL 평가기의 primitive operation 처리 경로  
**목표**: 무한 재귀 발생 메커니즘 파악 + 해결책 도출

---

## 📊 현재 스택 흐름 (Test 6 실패)

### 코드
```lisp
[FUNC square :params [$n] :body (* $n $n)]
(square 4)
```

### 실행 흐름

```
Layer 0: TypeScript Interpreter
  |
  ├─ 1. interp.run("(square 4)")
  │  └─ interpret(parse(lex("(square 4)")))
  │
  ├─ 2. fl-eval({kind: "sexpr", op: "square", args: [4]}, env)
  │  [freelang-interpreter.fl:134]
  │
  ├─ 3. fl-eval-sexpr("square", [4], env)
  │  [freelang-interpreter.fl:263-279]
  │  → "square"는 특수형이 아님
  │  → fl-eval-call("square", [4], env) 호출
  │
  ├─ 4. fl-eval-call("square", [4], env)
  │  [freelang-interpreter.fl:420-429]
  │  ├─ fl-eval-args([4], env) → [4]
  │  ├─ env-lookup(env, "square") → CLOSURE
  │  └─ fl-apply(CLOSURE, [4])
  │
  ├─ 5. fl-apply(CLOSURE, [4])
  │  → FUNC 본체: (* 4 4) 평가
  │  → fl-eval({kind: "sexpr", op: "*", args: [4, 4]}, newEnv)
  │
  ├─ 6. fl-eval-sexpr("*", [4, 4], newEnv)
  │  [freelang-interpreter.fl:263-279]
  │  → "*"는 특수형이 아님
  │  → fl-eval-call("*", [4, 4], newEnv) 호출
  │
  ├─ 7. fl-eval-call("*", [4, 4], newEnv)
  │  [freelang-interpreter.fl:420-429]
  │  ├─ fl-eval-args([4, 4], newEnv) → [4, 4]
  │  ├─ env-lookup(newEnv, "*") → null (native op는 환경에 없음)
  │  └─ fl-eval-builtin("*", [4, 4])  ← ⚠️ 문제 지점
  │
  ├─ 8. fl-eval-builtin("*", [4, 4])
  │  [freelang-interpreter.fl:434-468]
  │  (if (= $op "+") (+ ...
  │  (if (= $op "-") (- ...
  │  (if (= $op "*") (* (get $vals 0) (get $vals 1))  ← ⚠️⚠️ 무한 재귀
  │
  ├─ 9. FL 식 평가: (* 4 4)
  │  → TypeScript eval("*", [4, 4]) 호출 (args 평가)
  │
  └─ 10. [Loop back to Step 6]
     → TypeScript → FL → TypeScript ...
     → callDepth 증가 (max 2,000,000)
     → 결국 JS 네이티브 스택 오버플로우 (757ms timeout)
```

---

## 🔴 핵심 문제 지점

### 문제 1: FL 코드에서 Primitive 연산 재평가
**위치**: `freelang-interpreter.fl:438`

```lisp
(if (= $op "*")   (* (get $vals 0) (get $vals 1))
                   ^
                   이 "(* v0 v1)" 자체가 FL 식
                   → TypeScript eval 호출
```

**원인**: 
- FL 평가기가 primitive 연산을 FL 식으로 정의
- FL 식 평가 → TypeScript eval 호출
- TypeScript eval → FL dispatch (다시 step 3)

### 문제 2: 환경에 native operator 미등록
**위치**: `freelang-interpreter.fl:420-426`

```lisp
[FUNC fl-eval-call :params [$op $args $env]
  (let [[$fn (env-lookup $env $op)]]
    (if (closure? $fn)
      (fl-apply $fn $vals)
      (fl-eval-builtin $op $vals)  ← primitive 찾을 수 없음
    )
  )
]
```

**원인**:
- "+", "-", "*", "/" 등이 FL 환경에 등록되지 않음
- env-lookup 실패 → fl-eval-builtin 호출
- fl-eval-builtin에서 다시 FL 식으로 평가

---

## 💡 해결 방안 (2가지)

### 방안 A: Primitive를 TypeScript 함수로 등록
```
목표: env-lookup에서 native operator 찾음
방법: interpreter.ts에서 primitive 함수 등록
      (interpreter 초기화 시)
  context.functions.set("+", { ... })
  context.functions.set("*", { ... })
  
장점:
  - 간단함
  - FL 코드 수정 최소
단점:
  - TypeScript ↔ FL 경계 관리 복잡
```

### 방안 B: FL-only Primitive (재귀 없이)
```
목표: fl-eval-builtin을 재귀 없이 구현
방법: native-primitive 특수형 추가
      fl-eval-sexpr에서 primitive op 감지
      직접 TypeScript로 dispatch (FL 거치지 않음)
      
장점:
  - 명확한 경계
  - FL에서 루프백 제거
단점:
  - 코드 수정 필요 (fl-eval-sexpr, fl-eval-sexpr)
```

---

## 📋 권장: 방안 B (fl-eval-sexpr 수정)

**이유**:
- 명확한 단방향 경계 (TS ← only dispatch → FL)
- FL에서 TS로 콜백 안 함
- Test 6 근본 해결 가능

**구현 방식**:
```
1. is-primitive-op($op) → boolean
   FL에서 primitive op 판별

2. fl-eval-sexpr 수정:
   (if (is-primitive-op $op)
     (fl-eval-primitive $op $args $env)  ← NEW
     (fl-eval-call $op $args $env)
   )

3. fl-eval-primitive 구현:
   - args 평가
   - TypeScript native-primitive 함수 호출
   - 결과 반환 (재평가 없음)
```

---

## 🎯 다음 Step

**Step 2**: Primitive operation 경로 설계
- 15개 primitive op 목록 정리
- TypeScript dispatcher 위치 결정
- FL 대체 불가 영역 명시

**기준**: 이 분석이 정확한지 Test 6 실행으로 검증

---

## 검증 명령

```bash
cd /home/kimjin/freelang-v9

# 현재 상태 확인
npm test -- --testPathPattern="selfhosting-interpreter"
# Expected: 9/10 PASS (Test 6 ✕ 757ms)

# 분석이 맞는지 확인하려면:
# - fl-eval-builtin에서 (* 4 4) 재평가 → callDepth 증가
# - env-lookup(env, "*") → null → fl-eval-builtin 호출
```
