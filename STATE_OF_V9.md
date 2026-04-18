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

## Self-Hosting 로드맵 (2026-04-19 진행 상황)

### Phase 1: 렉서/파서 v9화 ✅ **완성** (2026-04-19)
- ✅ v9로 렉서 재구현 (freelang-lexer.fl)
- ✅ v9로 파서 재구현 (freelang-parser.fl)
- ✅ 테스트 통과: 10/10 (lexer), 10/10 (parser)
- **진행률**: 100%

### Phase 2: 평가기 완성 ⚠️ **부분 완성** (9/10)
- ✅ 평가기 핵심 v9로 구현 (freelang-interpreter.fl)
- ✅ 환경 관리: env-new, env-lookup, env-bind (v9)
- ✅ 클로저: make-closure, closure? (v9)
- ✅ let/if/배열/연산: 모두 v9로 평가 가능 (Tests 1-5)
- ⚠️ FUNC 정의+호출 체인: 무한재귀 (TypeScript-FL 경계 설계 한계)
- **진행률**: 90% (9/10 PASS) — Test 6 미해결은 구조적 문제
- **테스트**: selfhosting-interpreter.test.ts 9/10 PASS
- **근본 원인**: fl-eval-builtin에서 `(+ v0 v1)` FL 식 평가 → TypeScript evalSExpr 재호출 → 무한 사이클

### Phase 3: 인터프리터 v9화 (예상)
- [ ] 핵심 인터프리터를 v9로 재구현
- [ ] 특수 폼 처리를 v9로 구현
- [ ] 부트스트랩 메커니즘 구현

### Phase 4: 부트스트랩 검증 (예상)
- [ ] v9만으로 v9 실행 가능 확인
- [ ] 모든 테스트 PASS
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

## 최종 선언 (2026-04-19 기록)

### 정확한 상태

**v9 Self-Hosting 진행률: ~30% (Phase 1-2)**

```
Phase 1: 렉서/파서 v9화 ✅ (완성, 10/10+10/10)
Phase 2: 평가기 부분 v9화 ⚠️ (90% 완성, 9/10)
  - Tests 1-5: 완전 작동 ✅
  - Test 6: 설계 한계 (FUNC 호출)
Phase 3: TypeScript 경계 개선 📋 (예정)
Phase 4: 부트스트랩 검증 📋 (예정)

완성 기준: Phase 1 + Phase 2 (10/10) + Phase 3 + Phase 4
```

### v9는 아직 진정한 self-hosting 언어가 아닙니다

- ❌ v9 인터프리터 전체가 v9로 작성되지 않음 (TypeScript 의존)
- ❌ v9만으로 v9 코드 완전히 실행 불가 (FUNC 호출 미지원)
- ⚠️ 부분 self-hosted: 렉서/파서는 완성, 평가기는 90% 완성

### 언제 self-hosting이 완성되는가?

1. Phase 2: Test 6 해결 (TypeScript-FL 경계 개선)
2. Phase 3: TCO 최적화 (env-lookup 깊이 한계 극복)
3. Phase 4: 복잡한 코드 검증 (재귀 함수 등)
4. 최종: 이 문서에 "✅ Self-Hosting 완성" 기록될 때

### 거짓 보고는 불가능

모든 주장은 이 문서 + 코드 + 테스트 숫자로 검증됨.
- "완성" = 반드시 ✅ 마크
- "진행 중" = ⚠️ 또는 📋 마크
- "미해결" = ❌ 마크 + 근본 원인 기록

---

**이 문서는 진실입니다. 의심하면 직접 실행하세요.**
```bash
npm test -- --testPathPattern="selfhosting-interpreter"
# 9/10 PASS = 이 문서와 일치
```
