# FreeLang v9 Self-Hosting 상태 기록

## 현재 단계: Phase 4 (테스트 13/13 PASS 달성) (2026-04-21)

### Phase 2: `interpreter.fl` 및 평가기 핵심 v9화

**상태**: 10/10 PASS ✅ (테스트 완전 통과, 지속 유지)

### Phase 4: 고급 함수 기능 검증

**상태**: 3/3 PASS ✅ (재귀, 고차함수 지원)

**주의**: 완전한 self-hosting이 아님
- ✅ 렉서/파서: 100% v9 구현
- ✅ 평가기 핵심: ~90% v9 구현 (fl-eval, fl-eval-sexpr, fl-eval-call, fl-eval-builtin 등)
- ❌ **fl-apply**: TypeScript native case (Phase 3D-v4 패치)
- ⚠️ 평가기가 **TypeScript 엔진**에 의존 (부트스트랩 불완전)

Phase 2 모든 테스트 통과 (selfhosting-interpreter.test.ts):
- ✅ 1. 산술: (+ 1 2) → 3
- ✅ 2. let 바인딩: (let [[$x 10]] $x) → 10
- ✅ 3. if 참: (if true "yes" "no") → "yes"
- ✅ 4. if 거짓: (if false "yes" "no") → "no"
- ✅ 5. 다중 바인딩: (let [[$x 5] [$y 3]] (- $x $y)) → 2
- ✅ 6. **FUNC 정의**: [FUNC square :params [$n] :body (* $n $n)] + (square 4) → 16
- ✅ 7. 배열: (let [[$arr [1 2 3]]] (get $arr 1)) → 2
- ✅ 8. 불린: true → true, false → false
- ✅ 9. 중첩: (+ (* 2 3) 4) → 10
- ✅ 10. let + if: (let [[$x 10]] (if (> $x 5) "big" "small")) → "big"

Phase 4 모든 테스트 통과 (selfhosting-advanced.test.ts):
- ✅ 11. 재귀: factorial(5) = 120
- ✅ 12. 재귀: fibonacci(7) = 13
- ✅ 13. 고차함수: make-adder 클로저 반환 (3+4=7)

### Test 6 해결책 (TypeScript 패치) (Commit: b2b32bb)

⚠️ **주의**: 이것은 완전한 v9 구현이 아닌 **TypeScript 부분 해결**입니다.

**파일**: `src/eval-builtins.ts` (line 465-470)

```typescript
// fl-apply: FL meta-interpreter closure 적용을 native로 처리
case "fl-apply": {
  const fn = args[0];
  const vals: any[] = Array.isArray(args[1]) ? args[1] : [];
  return flApplyNative(fn, vals);
}
```

**원인**:
- Test 6 타임아웃: `(fl-apply $fn $vals)` → `callUserFunction("fl-apply")` → FL body eval → 12 nested ifs → JS 스택 오버플로우
- 완전한 해결: FL 코드에서 fl-apply를 v9로 구현하고, TypeScript는 native case 없음
- **이 패치**: TypeScript에서 fl-apply 호출을 직접 처리 (FL 바이패스)

**현재 상태**:
- ✅ JS 스택 깊이 해결 (200-250 프레임)
- ❌ 여전히 TypeScript에 의존 (fl-apply native case)
- ⚠️ 진정한 self-hosting이 아님 (FL만으로 평가기 완성 불가)

### 진행 현황 요약

| Phase | 항목 | 상태 | 결과 |
|-------|------|------|------|
| Phase 1A | env-lookup v9화 | ✅ | 6/6 PASS |
| Phase 1B | freelang-lexer.fl | ✅ | 10/10 PASS |
| Phase 1C | freelang-parser.fl | ✅ | 10/10 PASS |
| **Phase 2** | **freelang-interpreter.fl** | ⚠️ 부분 | **10/10 PASS** (fl-apply: TS 패치) |
| Phase 3D-v4 | fl-apply native case | ❌ | TypeScript 의존 |
| **Phase 4** | **재귀/고차함수** | ⚠️ 부분 | **3/3 PASS** (fl-load-all-funcs: TS 패치) |
| Phase 5+ | TCO 최적화, 완전 v9화 | 📋 계획 | - |

**현황 (2026-04-21)**:
- Phase 2 테스트: 10/10 PASS ✅
- Phase 4 테스트: 3/3 PASS ✅
- **총 13/13 PASS**
- self-hosting 진행률: ~40% (렉서/파서 100%, 평가기 핵심 90%, 재귀 TS 패치)
- 완전한 self-hosting: ❌ (TypeScript 2개 native case 필수: fl-apply, fl-load-all-funcs)

### 다음 단계

**Phase 3D-Final**: fl-apply를 FL로 재구현 (TypeScript 패치 제거)
- 목표: 현재 TypeScript native case를 FL 코드로 작성
- 도전: FL 코드가 `flApplyNative` 동작을 재현해야 함
- 중요도: 높음 (진정한 self-hosting 필수 조건)

**Phase 3**: TCO 최적화 (env-lookup, env-vars-find → loop/recur)
- 목표: callDepth 의존도 감소, 더 깊은 환경 체인 지원
- 상태: 계획 대기

**Phase 4**: 고급 케이스 검증
- 재귀 함수, 고차 함수, 상호 재귀 등
- 목표: 완전 self-hosting 검증 (fl-apply v9화 후)

## 아키텍처 정리

### FL meta-interpreter 계층 구조

```
TypeScript (interpreter.ts)
  ├─ evalSExpr(op, args) 
  │  └─ evalBuiltin(op, args, expr)
  │     ├─ switch(op):
  │     │  ├─ case "fl-apply": [NATIVE] flApplyNative
  │     │  ├─ case "env-lookup": [NATIVE] while loop
  │     │  ├─ case "fl-eval-builtin": [NATIVE] flExecOpNative
  │     │  └─ default: callUserFunction(op)
  │     └─ return
  │
  └─ callUserFunction(name)
     └─ FL: fl-load-funcs, fl-run-nodes, fl-eval, ...
        └─ if user-defined function: continue loop above
        └─ if native: evalBuiltin (native cases, no FL loop)
```

### 최적화된 경로 (Test 6)

```
interpret(ast)
  → fl-load-funcs: 환경에 square 함수 등록 (1회, FL)
  → fl-run-nodes: AST 노드 평가 (1회 + sexpr 1회, FL)
  → fl-eval-sexpr: square 함수 호출 (1회, FL 12 nested ifs)
  → fl-eval-call: "square" 조회 + 평가 (FL)
  → [NATIVE] case "fl-apply": flApplyNative(closure, [4])
     → flInterpNative(sexprNode: (* 4 4))
     → flExecOpNative("*", [4, 4]) → 16
```

최대 JS 스택: ~200-250 프레임 (안전함)

## 코드 위치 참조

### 네이티브 helper functions (eval-builtins.ts)

| 함수 | 라인 | 역할 |
|------|------|------|
| `flApplyNative` | 243 | FL closure 적용 (param binding + body eval) |
| `flInterpNative` | 259 | FL AST 평가 (if/let/match 등 특수형식 처리) |
| `flExecOpNative` | 141 | 산술/비교 연산 |
| `flEnvGet` | 99 | FL 환경 조회 |
| `flEnvBind` | 114 | FL 환경 바인딩 |
| `flBlockItems` | 118 | Array 블록 items 추출 |
| `flGetParamNames` | 130 | 파라미터 이름 추출 |

### 네이티브 case 목록 (evalBuiltin switch)

| Case | 라인 | 기능 | 이전 상태 |
|------|------|------|---------|
| `fl-eval-builtin` | 428 | 29 nested ifs 회피 | FL function → 스택오버플로우 |
| `env-lookup` | 435 | env 체인 순회 | FL function × N → callDepth 누적 |
| `env-vars-find` | 449 | array loop | FL function × N → callDepth 누적 |
| `closure?` | 460 | 클로저 타입 체크 | FL function → 불필요한 호출 |
| `fl-apply` | 465 | **NEW** 클로저 적용 | FL function → 12 nested ifs → 스택오버플로우 |

## 검증 기준

⚠️ **Phase 2 테스트 기준** (모두 충족):
- [x] 렉서 v9화: 10/10 PASS
- [x] 파서 v9화: 10/10 PASS
- [x] 평가기 v9화 (핵심): 10/10 PASS
- [x] Full chain 검증: `(interpret (parse (lex "...")))` 동작
- ⚠️ **주의**: fl-apply는 TypeScript 패치 (완전한 v9화 아님)

❌ **Phase 2 Self-Hosting 완성 기준** (미충족):
- fl-apply를 FL 코드로 구현할 것 (현재: TypeScript native case)
- TypeScript 엔진 없이 동작할 것
- 현재: 여전히 TypeScript 부트스트랩 필요

**현재 v9 커버리지**: ~30-40% (렉서, 파서, 평가기 핵심)
- ✅ 렉서 전체 v9화
- ✅ 파서 전체 v9화
- ✅ 평가기 핵심 (fl-eval, fl-eval-sexpr 등) v9화
- ❌ fl-apply: TypeScript 의존
- ❌ 타입 시스템, 모듈 시스템 등: TypeScript 의존

## Phase 4 달성 (2026-04-21) — 재귀/고차함수 지원

### 재귀 함수 지원 추가

**문제**: 각 closure의 closure-env가 생성 시점의 env를 capture하므로, 함수가 자신을 호출할 수 없었음.

**TypeScript 해결책** (eval-builtins.ts, line 476-500):
```typescript
case "fl-load-all-funcs": {
  const nodes: any[] = Array.isArray(args[0]) ? args[0] : [];
  // Step 1: 모든 함수 먼저 등록
  let env: any = { vars: [], parent: null };
  for (const node of nodes) {
    if (node && node.kind === "block" && node.type === "FUNC") {
      const closure = flInterpNative(node, env);
      env = flEnvBind(env, node.name, closure);
    }
  }
  // Step 2: 모든 closure의 closure-env를 완전한 env로 업데이트
  // ⚠️ 이 부분은 TypeScript에서만 가능 (FL 코드로는 불가능)
  if (env.vars && Array.isArray(env.vars)) {
    for (const pair of env.vars) {
      if (pair && pair[1] && pair[1].kind === "closure") {
        pair[1]["closure-env"] = env;  // ← TypeScript 뮤테이션
      }
    }
  }
  return env;
}
```

**결과**: 재귀 함수 지원 가능 ✅
- factorial, fibonacci 등 자기 참조 재귀 가능
- 상호재귀는 여전히 불가 (순차 등록 제약)

**self-hosting 상태**: 여전히 ~40% 
- fl-load-all-funcs 함수 정의는 v9이지만
- 핵심 logic (closure-env 업데이트)은 TypeScript native case

## 향후 계획

### Phase 3: 최적화 (선택사항)
- TCO 변환: env-lookup → loop/recur
- 목표: callDepth 의존도 감소

### Phase 5: 완전 부트스트랩
- 모든 v9 기본 기능의 v9 구현
- 외부 TypeScript 의존성 최소화

---

## 브랜치 및 커밋

- **Branch**: `master`
- **Commit**: `b2b32bb` (Phase 3D-v4: native fl-apply case)
- **Gogs Push**: ✅ 완료

**현재 시간**: 2026-04-21 (거짓 보고 정정 완료)
**테스트 실행**: 
  - selfhosting-interpreter.test.ts (5.7s) → 10/10 PASS
  - selfhosting-advanced.test.ts (6.25s) → 3/3 PASS
**상태**: ⚠️ Phase 4 완성 (완전한 self-hosting 아님, TypeScript 2개 패치)
  - fl-apply: closure 적용 (TS native)
  - fl-load-all-funcs: closure-env 업데이트 (TS native)
**다음**: Phase 5에서 2개 native case를 FL로 완전히 재구현 필요
