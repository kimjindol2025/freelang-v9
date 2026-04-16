# FreeLang 디버깅 가이드

단일 언어의 강점: **문제 원인을 빠르게 찾을 수 있습니다.**

---

## 1️⃣ REPL에서 대화형 디버깅

### 시나리오: 할일 API에서 데이터가 안 나온다

```bash
# 터미널에서 REPL 시작
fl repl

;; REPL에서 바로 테스트
> (define db (sqlite-open "todos.db"))
"sqlite_123456789"

> (define todos (sqlite-query db "SELECT * FROM todos"))
[{:id 1 :title "Write code" ...} ...]

> (length todos)
5

> (first todos)
{:id 1 :title "Write code" :completed false}

> (. (first todos) :title)
"Write code"

;; 캐시가 문제인가?
> (define cached (fcache-get "todos:user:1"))
null  ;; ← 캐시 미스! 원인 찾음

;; 상세 추적
> (map (fn [t] (. t :title)) todos)
["Write code" "Review PR" "Update docs"]
```

### REPL 팁

```fl
;; 1. 타입 확인
> (type-of {:a 1})
:map

> (type-of [1 2 3])
:array

;; 2. 깊은 검사
> (define obj {:nested {:deep {:value "found"}}})
> (. obj :nested :deep :value)
"found"

;; 3. 조건부 실행
> (if (null? (fcache-get "key"))
    (do (log-error "Cache miss") "ERROR")
    (fcache-get "key"))

;; 4. 반복 테스트
> (loop [i 0] (if (< i 5) (do (log-debug i) (recur (+ i 1)))))
0
1
2
3
4

;; 5. 성능 측정
> (time (expensive-operation))
Operation took 1,234ms
Result: [...]
```

---

## 2️⃣ 스택 추적 (Stack Trace)

### FreeLang 에러 메시지

```fl
;; 잘못된 코드
(define result (. {:a 1} :b :c))

;; 에러 출력
Error: Cannot access property 'c' on null
  at <anonymous> (app.fl:42)
  
Stack trace:
  1. update-todo (app.fl:52)
  2. http-post handler (app.fl:68)
  3. HTTP request dispatcher (http-server.ts:123)

Context:
  - todo-id: 42
  - updates: {:completed true}
  - user-id: 1

Suggestion: Did you mean (. obj :b) instead of (. obj :b :c)?
```

### 스택 추적 활용

```fl
(try
  (do
    (define obj nil)
    (. obj :property))  ;; ← 에러 발생
  (catch err
    (do
      (log-error "Error caught" err)
      
      ;; 전체 스택 출력
      (error-stack err)
      ;; at <anonymous> (app.fl:123)
      ;; at handler (app.fl:456)
      
      ;; 에러 타입 확인
      (error-type err)  ;; "null_access"
      
      ;; 복구
      {:status "error" :message (error-message err)})))
```

---

## 3️⃣ 로깅 전략

### 레벨별 로깅

```fl
;; DEBUG — 개발 중에만 필요한 정보
(log-debug "Processing user" {:user-id user-id :tags tags})

;; INFO — 중요한 이벤트
(log-info "User created" {:user-id new-id :email email})

;; WARN — 예상 가능한 문제
(log-warn "Cache miss" {:key cache-key :retry-count 3})

;; ERROR — 에러 발생
(log-error "Database error" {:error err :query query})
```

### 구조화된 로그 활용

```fl
;; 로그 조회 (프로덕션)
(log-read 100)  ;; 최근 100줄

[
  {:timestamp "2026-04-16T23:30:45Z" :level "info" :message "User created" :user-id 42}
  {:timestamp "2026-04-16T23:30:50Z" :level "warn" :message "Cache miss" :key "users:42"}
  {:timestamp "2026-04-16T23:30:55Z" :level "error" :message "DB error" :error "..."}
]

;; 필터링
(log-filter "error" 50)  ;; 최근 50개 에러

;; 분석
(define error-rate (/ (length (log-filter "error")) (length (log-read))))
```

---

## 4️⃣ 성능 프로파일링

### 병목 구간 찾기

```fl
(profile "database-query" (fn []
  (sqlite-query db "SELECT * FROM todos")))
;; [PROFILE] database-query: 12ms (min: 5ms, max: 45ms, avg: 12ms)

(profile "cache-operation" (fn []
  (fcache-set "key" "value" 3600)))
;; [PROFILE] cache-operation: 1ms

(profile "ai-call" (fn []
  (stream-ai {:model "claude" :prompt "..."})))
;; [PROFILE] ai-call: 2,341ms
```

### 메모리 누수 감지

```fl
;; 메모리 모니터링
(monitor-memory)
;; Initial: 120MB
;; After 1000 iterations: 145MB
;; After cleanup: 122MB ✓ (정상)

;; 의심스러운 메모리 증가
(monitor-memory)
;; Initial: 100MB
;; After 1000 iterations: 500MB
;; After cleanup: 495MB ❌ (누수 의심)

;; 힙 덤프 생성
(dump-heap "heap.json")
```

---

## 5️⃣ 단위 테스트로 디버깅

### 빠른 재현

```fl
;; 문제 재현 테스트
(test "Todo update fails with invalid ID"
  (define bad-id -999)
  (try
    (update-todo bad-id {:completed true})
    (catch err
      (assert-eq (error-type err) "not_found"))))

;; 엣지 케이스
(test "Cache handles null values"
  (fcache-set "null-key" nil 60)
  (define result (fcache-get "null-key"))
  (assert-null result))

;; 동시성
(test "Concurrent writes don't corrupt"
  (define promises [
    (async-call (fn [] (sqlite-exec db "INSERT INTO todos ..." [...])))
    (async-call (fn [] (sqlite-exec db "INSERT INTO todos ..." [...])))
    (async-call (fn [] (sqlite-exec db "INSERT INTO todos ..." [...])))
  ])
  (await-all promises)
  (define count (car (sqlite-query db "SELECT COUNT(*) FROM todos")))
  (assert-eq (. count :count) 3))
```

---

## 6️⃣ 라이브 디버깅 (Hot Reload)

### `fl watch`를 사용한 실시간 디버깅

```bash
# 터미널 1: 앱 실행
fl watch app.fl

# 터미널 2: API 호출
curl -X POST http://localhost:43000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Debug"}'

# 터미널 1에서 파일 수정하면 자동 재로드
# → 새 로직이 즉시 적용됨
```

### 중단점 없이 디버깅

```fl
;; app.fl를 수정 후 저장하면 자동 재로드
(define create-todo (fn [user-id title description]
  (do
    ;; 추가한 로그 (저장하면 즉시 활성화)
    (log-debug "Create todo debug" {
      :user-id user-id
      :title title
      :description description
    })

    (sqlite-exec db
      "INSERT INTO todos (title, description, user_id)
       VALUES ($1, $2, $3)"
      [title description user-id])

    ;; ... 나머지 코드
    )))

# 파일 저장 → 자동 재로드 → API 호출 → 즉시 로그 확인
```

---

## 7️⃣ 비교: 전통 스택 vs FreeLang 디버깅

### 시나리오: API가 404 응답

#### 전통 스택 (복잡함)
```
1. 프론트엔드 로그 확인
2. 네트워크 탭 확인
3. 백엔드 로그 확인 (다른 서버)
4. 데이터베이스 쿼리 실행
5. Redis 상태 확인 (또 다른 서버)
6. 미들웨어 로그 확인
7. 환경변수 확인 (.env 파일)

소요 시간: 10-15분
```

#### FreeLang (간단함)
```fl
# REPL에서 바로 테스트
> (get-todos 1)
[...]  ;; 데이터 확인

> (fcache-get "todos:user:1")
nil  ;; 캐시 미스 확인

> (http-get-handler {:params {:id 1}})
{:status 200 :data [...]}  ;; API 핸들러 테스트

소요 시간: 30초
```

---

## 8️⃣ 디버깅 체크리스트

### 문제 발생 시 단계별

```
□ REPL에서 재현 가능한가?
  → 가능: 데이터 문제
  → 불가능: 네트워크/HTTP 문제

□ 로그에서 에러 메시지 확인
  > (log-filter "error" 10)

□ 타입이 맞는가?
  > (type-of result)

□ 캐시가 문제인가?
  > (fcache-get key)

□ 성능이 문제인가?
  > (profile "function" fn)

□ 데이터 손상인가?
  > (sqlite-query db "SELECT * FROM table")

□ 환경변수인가?
  > (env-load "API_KEY")
```

---

## 🎯 최종: 디버깅 철학

### 전통 스택
```
문제 → 어느 계층? → 어느 서버? → 어느 파일? → 어느 줄?
         (N분)     (N분)        (N분)        (N분)

누적: 10~30분
```

### FreeLang
```
문제 → 데이터? → 로직? → 성능?
       (10초) (10초) (10초)

누적: 30초
```

**단일 언어, 단일 런타임 = 문제 해결 시간 60배 단축**
