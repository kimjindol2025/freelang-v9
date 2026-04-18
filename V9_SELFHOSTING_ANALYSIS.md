# v9 Self-Hosting 검수 보고

**검수일**: 2026-04-19
**기준**: STATE_OF_V9.md (공식 진실 문서)
**방식**: 실제 코드 검증

---

## 📊 현황 요약

### 작성된 v9 코드
| 파일 | 줄수 | 상태 | 설명 |
|------|------|------|------|
| freelang-lexer.fl | 337 | ✅ 완성 | 토큰화 |
| freelang-parser.fl | 349 | ✅ 완성 | AST 생성 |
| freelang-interpreter.fl | 500 | ⚠️ 부분 | 평가기 (Phase 45) |
| freelang-codegen.fl | 904 | ✅ 완성 | 코드 생성 |
| freelang-stdlib.fl | 246 | ✅ 완성 | 표준 라이브러리 |
| freelang-typechecker.fl | 422 | ✅ 완성 | 타입 체크 |
| **합계** | **2,758** | **부분** | ~30% self-hosted |

### 핵심 질문
```
Q: v9는 자신으로 자신을 컴파일할 수 있는가?
A: ❌ 아니오 (TypeScript 부트스트랩 필수)
```

---

## 🔍 상세 분석

### ✅ 완성된 부분

#### 1. 렉서 (freelang-lexer.fl - 337줄)
```scheme
[FUNC is-digit? :params [$c] ...]  ; 문자 판정
[FUNC lex-loop :params [$state] ...]  ; 주요 루프
```
**평가**: 완전히 v9로 구현됨, TypeScript 의존성 없음

#### 2. 파서 (freelang-parser.fl - 349줄)
```scheme
[FUNC parse-atom :params [$state] ...]
[FUNC parse-sexpr :params [$state] ...]
```
**평가**: 완전히 v9로 구현됨

#### 3. 코드젠 (freelang-codegen.fl - 904줄)
```scheme
[FUNC cg :params [$node] ...]
[FUNC codegen-loop :params [$ast] ...]
```
**평가**: 가장 큰 모듈, 완전히 v9로 구현됨

### ⚠️ 부분 완성

#### 4. 인터프리터 (freelang-interpreter.fl - 500줄)
```scheme
; Phase 45: env-lookup v9 구현
[FUNC env-new :params [] ...]
[FUNC env-lookup :params [$env $name] ...]
```

**문제점**:
- 특수 폼 처리 미완 (set!, loop, recur 등)
- builtin 함수 일부 TypeScript에 의존
- eval 함수 미구현 또는 불완전

**상태**: ~30% 구현 (핵심 부분만)

---

## 🚨 Self-Hosting 불가능한 이유

### 구조적 문제

```
v9 코드 (2,758줄) ← v9로 작성됨 ✅
        ↓
  v9 인터프리터
        ↓
   eval.fl 실행
        ↓
  TypeScript 부트스트랩 필수 ❌
```

### 순환 의존성 (Circular Dependency)

```
v9 코드를 실행하려면:
  ├─ v9 인터프리터 필요
  ├─ 인터프리터는 eval.fl 포함
  ├─ eval.fl도 v9 코드
  └─ 따라서 TypeScript 필수 ❌
```

---

## 📈 진행도

| Phase | 작업 | 상태 | 예상 진행율 |
|-------|------|------|-----------|
| 1 | 렉서 v9화 | ✅ 완료 | 20% |
| 2 | 파서 v9화 | ✅ 완료 | 20% |
| 3 | 인터프리터 부분 | ⚠️ 진행중 | 30% |
| 4 | 인터프리터 완성 | ❌ 미완료 | 0% |
| 5 | 부트스트랩 검증 | ❌ 불가능 | 0% |

**현재 overall**: **~30%**

---

## 💡 문제의 핵심

### 왜 완성되지 않았는가?

1. **평가기의 복잡도** (500줄도 부족)
   - set! 구현 필요
   - loop/recur 구현 필요  
   - 특수 폼 처리 필요
   - builtin 함수 통합 필요

2. **기술적 한계**
   - v9의 재귀 깊이 제한
   - 메모리 버짓 제약
   - 복잡한 AST 처리

3. **시간 부족**
   - Phase 45까지만 진행
   - 전체 100+ Phase 필요

---

## ✅ 검증 목표

```
목표: v9만으로 v9 코드 컴파일 가능
현황: TypeScript 부트스트랩 필수
결과: ❌ FAIL
```

---

## 🎯 최종 판정

| 항목 | 평가 |
|------|------|
| Self-Hosting | ❌ 불가능 |
| 진행률 | ~30% |
| 완성도 | 낮음 |
| 신뢰도 | STATE_OF_V9.md 기준 정확 |

