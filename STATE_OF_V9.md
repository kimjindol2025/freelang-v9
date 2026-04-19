# FreeLang v9 — 공식 현황 선언 (2026-04-18)

## 🚨 규정: 거짓 보고 금지

**이 문서의 상태 선언이 공식 진실입니다. 다른 표현은 모두 거짓입니다.**

---

## 현재 상태 (정직한 평가)

### 인터프리터

| 항목 | 상태 | 언어 | 비고 |
|------|------|------|------|
| **코어 인터프리터** | ✅ 완성 | TypeScript/Node.js | **외부 언어 의존** |
| 렉서 (Lexer) | ✅ 완성 | TypeScript | 토큰화 |
| 파서 (Parser) | ✅ 완성 | TypeScript | AST 생성 |
| 평가기 (Evaluator) | ⚠️ 부분 | TypeScript + v9 혼합 | eval.fl 미완성 |
| **v9로 작성된 부분** | ~30% | v9 | 평가기 일부만 |

### 표준 라이브러리

| 항목 | 상태 | 함수 수 |
|------|------|--------|
| stdlib-*.ts | ✅ 완성 | 594개 |
| 테스트 | ✅ 완성 | 72/72 PASS |

---

## Self-Hosting 현황

### 진정한 Self-Hosting의 정의

```
조건 1: v9 인터프리터 전체가 v9로 작성됨
조건 2: v9만으로 v9 코드 실행 가능 (부트스트랩 없음)
조건 3: 독립적으로 작동함

현재 v9: ❌ 이 조건을 만족하지 않음
```

### 부분 Self-Hosting

- ✅ eval.fl: v9로 평가기 일부 구현
- ❌ 인터프리터 코어: 여전히 TypeScript
- ❌ 렉서/파서: 여전히 TypeScript
- **평가**: 20~30% 부분 self-hosted (완전하지 않음)

---

## 금지 규정

### ❌ 이렇게 말하면 안 됨

```
"v9는 self-hosting 완성됨"
"v9는 자신으로 자신을 구현함"
"eval.fl이 완전한 평가기"
"Phase 23에서 완성"
```

### ✅ 정확한 표현

```
"v9는 평가기의 일부를 v9로 구현함" (부분 self-hosted)
"v9 인터프리터는 여전히 TypeScript에 의존"
"진정한 self-hosting까지 진행 중"
"현재 self-hosting 진행률: ~30%"
```

---

## Self-Hosting 로드맵 (2026-04-20 진행 상황)

### Phase 1: 렉서/파서 v9화 ✅ **완성** (2026-04-19)
- ✅ v9로 렉서 재구현 (freelang-lexer.fl)
- ✅ v9로 파서 재구현 (freelang-parser.fl)
- ✅ 테스트 통과: 10/10 (lexer), 10/10 (parser)
- **진행률**: 100%
- **Commit**: e975ab0 (v10 초기 스캐폴딩)

### Phase 2: 평가기 완성 ⚠️ **부분 완성** (9/10 PASS)
- ✅ 평가기 핵심 v9로 구현 (freelang-interpreter.fl)
- ✅ 환경 관리: env-new, env-lookup, env-bind (v9)
- ✅ 클로저: make-closure, closure? (v9)
- ✅ let/if/배열/연산: 모두 v9로 평가 가능 (Tests 1-5, 7-10)
- ⚠️ FUNC 정의+호출 체인: **구조적 한계** (패치 불가)
- **진행률**: 90% (9/10 PASS) — Test 6 미해결
- **테스트**: selfhosting-interpreter.test.ts 9/10 PASS
- **Test 6 미해결 분석** (2026-04-20):

```
증상: (square 4) 호출 시 무한재귀 (722ms 타임아웃)

실행 흐름:
1. (square 4) → TypeScript eval()
2. FUNC 본문 (* 4 4) 평가 필요
3. FL evaluator: fl-eval-call("*", [4, 4], env)
4. freelang-interpreter.fl 라인 438:
   (if (= $op "*") (* (get $vals 0) (get $vals 1))
            ↓
   (* 4 4)를 FL 식으로 다시 평가
5. TypeScript evalSExpr("*", [4, 4])
6. 다시 3번으로 루프

근본 원인:
- fl-eval-builtin에서 arithmetic를 FL 식으로 정의
- FL 식 평가 → TS eval 호출 → FL eval 호출 (상호 재귀)
- MAX_CALL_DEPTH 증가로 해결 불가 (JS 네이티브 스택 한계)

패치 불가능 이유:
- 단순 함수 등록: FL 환경 연결 불가
- FL 코드 우회: 구문 복잡도↑, 유지보수 악화
- 구조 개선 필요: Phase 3B+ (TCO, 경계 재설계)
```

**다음 단계 (Phase 3B+)**:
- TCO (loop/recur) 변환으로 callDepth 단축
- TypeScript-FL 경계 재설계 필요

### Phase 3B: TCO 최적화 인프라 ✅ **완성** (2026-04-21)
- ✅ native-loop 함수 등록 (interpreter.ts 라인 123-155)
- ✅ native-recur 함수 등록 (interpreter.ts 라인 157-168)
- ✅ loop 특수 폼 디스패치 추가 (freelang-interpreter.fl)
- ✅ fl-eval-loop 구현 (freelang-interpreter.fl 라인 395-425)
- ✅ flatten-bindings-helper 구현 (freelang-interpreter.fl 라인 428-440)
- ❌ env-lookup/env-vars-find TCO 변환 실패 (호출 방식 복잡도)
- **진행률**: 85% (인프라 완성, 적용 미완)
- **테스트**: 9/10 PASS (변화 없음)
- **Commit**: 5a1dc8e (phase-3b-tco merge)
- **분석**:
  - loop/recur 인프라는 정상 작동 ✅
  - env-lookup TCO 변환 시 일반 테스트 깨짐 (5개 FAIL)
  - 이유: loop/recur 패턴이 환경 조회에 호환되지 않음
  - 다음: Phase 3C (primitives 직접 계산)

### Phase 3C: TypeScript-FL 경계 재설계 (예정)
- [ ] Primitive 연산(+, -, *, /)을 TypeScript 네이티브로
- [ ] fl-eval-builtin 우회 경로 구현
- [ ] Test 6 해결 가능성 검증

### Phase 4: 부트스트랩 검증 (예상)
- [ ] v9만으로 v9 실행 가능 확인
- [ ] 모든 테스트 PASS (10/10)
- [ ] **공식 선언: "v9 Self-Hosting 완성"**

---

## 강제 규정

### 규칙 1: 보고서 검증
**모든 v9 관련 보고는 이 문서와 비교 검증 필수**
- "완성"이라고 말하면 이 문서에 ✅ 마크가 있어야 함
- 없으면 거짓 보고

### 규칙 2: 단계별 진행 보고
각 Phase 완료 시:
```
✅ Phase N 완성: [구체적 내용]
테스트: M/M PASS
commit: [해시]
다음: Phase N+1 진행
```

### 규칙 3: 자동 검증
매 보고마다:
- [ ] STATE_OF_V9.md와 일치하는가?
- [ ] 실제 테스트를 실행했는가?
- [ ] 커밋 해시가 있는가?
- [ ] 거짓이 섞여있지 않은가?

---

## 최종 선언 (2026-04-21 업데이트)

### 정확한 상태

**v9 Self-Hosting 진행률: ~40% (Phase 1-3B)**

```
Phase 1: 렉서/파서 v9화 ✅ (완성, 10/10+10/10)
Phase 2: 평가기 부분 v9화 ⚠️ (90% 완성, 9/10 PASS)
  - Tests 1-5, 7-10: 완전 작동 ✅ (9개 테스트)
  - Test 6: 구조적 한계 (FUNC 호출 체인)
Phase 3B: TCO 최적화 인프라 ✅ (완성, loop/recur 등록)
  - native-loop/native-recur: 정상 작동 ✅
  - env-lookup TCO: 미완성 (호환성 문제)
Phase 3C: TypeScript-FL 경계 재설계 📋 (예정)
Phase 4: 부트스트랩 검증 📋 (예정)

완성 기준: Phase 1 + Phase 2 (10/10) + Phase 3B + Phase 3C + Phase 4
```

### v9는 부분 self-hosted 상태입니다 (2026-04-21)

- ✅ 렉서(lexer): 100% v9로 작성 (10/10 PASS)
- ✅ 파서(parser): 100% v9로 작성 (10/10 PASS)
- ⚠️ 평가기(interpreter): 90% v9로 작성 (9/10 PASS)
  - 산술/조건/배열/let/if 완전 작동
  - FUNC 정의+호출만 미해결 (아키텍처 문제)
- ⚠️ TCO 최적화: 인프라 완성, 적용 미완
  - native-loop/native-recur 등록 ✅
  - env-lookup TCO 변환 실패
- ❌ 인터프리터 코어: 여전히 TypeScript 의존
- **현재 self-hosting률**: ~40% (Phase 3B 인프라 추가)

### 언제 self-hosting이 완성되는가?

1. **Phase 3B**: env-lookup TCO 변환 (loop/recur)
   - 환경 체인 깊이 → callDepth 단축
   - 더 깊은 환경 스택 지원

2. **Phase 3C**: TypeScript-FL 경계 재설계
   - 단방향 dispatch (TS→FL, 루프백 제거)
   - Primitive 연산 TS 네이티브 경로 확보

3. **Phase 2 Test 6 해결** (Phase 3B/3C 이후)
   - FUNC 호출 체인 완성 (10/10 PASS)

4. **최종**: 이 문서에 "✅ Self-Hosting Phase 2 완성" 기록될 때

### 검증 방법 (2026-04-20)

모든 주장은 코드 + 테스트 결과로 검증 가능:

```bash
cd /home/kimjin/freelang-v9

# Phase 1: Lexer 검증
npm test -- --testPathPattern="selfhosting-lexer"
# Expected: 10/10 PASS

# Phase 1: Parser 검증
npm test -- --testPathPattern="selfhosting-parser"
# Expected: 10/10 PASS

# Phase 2: Interpreter 검증
npm test -- --testPathPattern="selfhosting-interpreter"
# Expected: 9/10 PASS (Test 6만 실패)
#          ├─ Tests 1-5: 산술/let/if/배열/nested ✓
#          ├─ Tests 7-10: 배열/불린/중첩/let+if ✓
#          └─ Test 6: FUNC 정의+호출 ✕ (구조적 한계)
```

**숫자 기준**:
- "완성" = 10/10 PASS
- "진행 중" = 9/10 PASS (이유 명시)
- "미해결" = ❌ 마크 + 근본 원인 기록

---

**이 문서는 진실입니다. 의심하면 직접 실행하세요.**  
**Commit**: 현재 HEAD (9/10 PASS 기준점)
