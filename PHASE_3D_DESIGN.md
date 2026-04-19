# Phase 3D Step 2: Primitive Operation 경로 설계

**기준점**: `876a5f9` (Step 1 분석 완료)  
**목표**: 원시 연산 처리 단방향 경로 확립  
**산출물**: Primitive op 목록 + dispatch 설계

---

## 📋 Primitive Operation 분류

### Category A: 필수 Primitive (현재 Test 6 실패 원인)

| Op | 타입 | 현재 처리 | 문제 | 해결책 |
|-----|-----|---------|------|--------|
| `+` | 산술 | FL식 | 재평가 | TS Native |
| `-` | 산술 | FL식 | 재평가 | TS Native |
| `*` | 산술 | FL식 | **재평가** | **TS Native** |
| `/` | 산술 | FL식 | 재평가 | TS Native |
| `=` | 비교 | FL식 | 재평가 | TS Native |
| `<` | 비교 | FL식 | 재평가 | TS Native |
| `>` | 비교 | FL식 | 재평가 | TS Native |

**특징**: 모두 2항 연산, FL 식으로 정의되어 무한 재귀 발생

### Category B: 보조 Primitive (현재 정상 작동)

| Op | 타입 | 현재 처리 | 상태 |
|-----|-----|---------|------|
| `%` | 산술 | FL식 | 작동 (재귀 깊이 적어서 영향 없음) |
| `<=` | 비교 | FL식 | 작동 |
| `>=` | 비교 | FL식 | 작동 |
| `!=` | 비교 | FL식 | 작동 |
| `length` | 배열 | 네이티브 | 직접 작동 |
| `get` | 배열 | 네이티브 | 직접 작동 |
| `append` | 배열 | 네이티브 | 직접 작동 |
| `concat` | 문자열 | 네이티브 | 직접 작동 |
| `slice` | 배열 | 네이티브 | 직접 작동 |
| `null?` | 타입 | 특수형 | 작동 |

---

## 🎯 우선순위 Primitive Set (Step 3에서 구현)

### Phase 3D-1: 필수 + 1 (Test 6 해결)

```
Priority 1: * (Test 6 직접 해결)
Priority 2: +, -, /, = (Test 1, 5, 6 영향)
Priority 3: <, > (Test 10 영향)
```

**이유**: Category A의 7개 primitive만 처리하면 Tests 1-10 모두 PASS 가능

**전략**: 
- Step 3에서 이 7개만 구현
- 나머지는 현재 상태 유지

---

## 🏗️ 구현 설계

### 설계 원칙: 단방향 경계

```
TypeScript Layer
  ↑
  │ (dispatch only)
  │
FL Evaluator Layer
  ├─ fl-eval (entry)
  ├─ fl-eval-sexpr (dispatcher)
  │  ├─ special forms (if, let, fn, ...)
  │  ├─ primitive ops ← is-primitive-op 체크
  │  │  └─ TypeScript dispatcher (네이티브)
  │  └─ user functions (closure call)
  └─ ... (other)

금지: FL → TS 콜백 (현재 문제)
```

### 구현 메커니즘

#### Step 3-1: is-primitive-op 함수 (FL)

```lisp
[FUNC is-primitive-op :params [$op]
  :body (
    (or (= $op "+")
    (or (= $op "-")
    (or (= $op "*")
    (or (= $op "/")
    (or (= $op "=")
    (or (= $op "<")
    (= $op ">")
    ))))))
  )
]
```

**위치**: `src/freelang-interpreter.fl` (라인 263 이전, 새 함수)  
**기능**: 7개 필수 primitive op 판별  
**호출**: `fl-eval-sexpr`에서만 사용

#### Step 3-2: fl-eval-primitive 함수 (FL)

```lisp
[FUNC fl-eval-primitive :params [$op $args $env]
  :body (
    (let [[$vals (fl-eval-args $args $env 0 [])]]
      ; TypeScript dispatcher 호출
      ; (call native-primitive-dispatch [$op $vals])
      null  ; placeholder
    )
  )
]
```

**목적**: primitive op를 평가된 args로 dispatch  
**중요**: FL 식 재평가 금지 (args는 이미 평가됨)

#### Step 3-3: fl-eval-sexpr 수정 (FL)

```lisp
[FUNC fl-eval-sexpr :params [$op $args $env]
  :body (
    (if (= $op "if")      (fl-eval-if $args $env)
    ...
    (if (is-primitive-op $op)  (fl-eval-primitive $op $args $env)
    (if (= $op "call")    (fl-eval-call-fn $args $env)
    (if (or ...)
      null
      (fl-eval-call $op $args $env)
    )))))))
  )
]
```

**변경**: is-primitive-op 체크 추가 (라인 275 이전)

#### Step 3-4: TypeScript Dispatcher (interpreter.ts)

```typescript
// interpreter.ts 내 native-primitive-dispatch 함수
private evalPrimitive(op: string, vals: any[]): any {
  switch(op) {
    case "+": return vals.reduce((a: number, b: number) => a + b, 0);
    case "-": return vals.length === 1 ? -vals[0] : vals.reduce((a: number, b: number) => a - b);
    case "*": return vals.reduce((a: number, b: number) => a * b, 1);
    case "/": return vals.length === 1 ? 1 / vals[0] : vals.reduce((a: number, b: number) => a / b);
    case "=": return vals[0] === vals[1];
    case "<": return vals[0] < vals[1];
    case ">": return vals[0] > vals[1];
    default: return null;
  }
}
```

**위치**: `src/interpreter.ts` (Interpreter 클래스 내)  
**등록**: constructor에서 context.functions.set("native-primitive-dispatch", ...)

---

## 📊 경계 설계도

### Before (현재 = Test 6 실패)

```
TypeScript eval("+", [4, 4])
  ↓
evalBuiltin("+", [4, 4])
  ↓
FL eval: (+ (get $vals 0) (get $vals 1))
  ↓
TypeScript eval("+", [4, 4])  ← LOOP!
  ↓
...
```

### After (Phase 3D 완료)

```
TypeScript eval: (+ 4 4)
  ↓
fl-eval-sexpr("+", [4, 4], env)
  ↓
is-primitive-op("+") → true
  ↓
fl-eval-primitive("+", [4, 4], env)
  ↓
fl-eval-args([4, 4]) → [4, 4]  (이미 literal)
  ↓
TypeScript evalPrimitive("+", [4, 4])
  ↓
return 8  (no loop!)
```

---

## 🎯 구현 체크리스트 (Step 3)

```
□ is-primitive-op 함수 추가 (FL)
□ fl-eval-primitive 함수 추가 (FL)
□ fl-eval-sexpr 수정: is-primitive-op 체크 추가 (FL)
□ evalPrimitive 함수 추가 (interpreter.ts)
□ native-primitive-dispatch 등록 (interpreter.ts constructor)
□ 테스트: npm test -- --testPathPattern="selfhosting-interpreter"
  Expected: 10/10 PASS (Test 6 해결!)
```

---

## 📋 작업 의존성

```
Step 2 (현재): 설계 완료
  ↓
Step 3: 구현
  ├─ 3-A: FL 함수 추가 (2개)
  ├─ 3-B: FL sexpr 수정 (1개 변경)
  ├─ 3-C: TS dispatcher 추가 (1개)
  └─ 3-D: 등록 + 테스트
  ↓
Step 4: TCO 재시도 (선택사항)
  ↓
Step 5: 최종 검증 (10/10 PASS)
```

---

## 📌 주의사항

### DO
✅ primitive를 9개로 한정 (우선순위)
✅ args는 fl-eval-args로 한 번만 평가
✅ 단방향 dispatch (FL → TS 금지)
✅ 매 step마다 테스트 (회귀 확인)

### DON'T
❌ 모든 primitive 한 번에 처리
❌ primitive 함수를 FL 환경에 등록 (이전 실패)
❌ fl-eval-builtin 사용 (무한 재귀)
❌ 특수형 추가 (관리 복잡)

---

## 최종 확인

**Step 2 산출물**:
- [x] Primitive op 분류 (Category A, B)
- [x] 우선순위 Set (7개)
- [x] 구현 설계 (4단계)
- [x] 경계 설계도 (Before/After)
- [x] Step 3 체크리스트

**다음**: Step 3 구현 진행
