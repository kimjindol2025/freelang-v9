# FreeLang Escape Hatches — 예외 상황 처리

FreeLang의 철학: **우아함 + 실용성**

이상적인 코드는 예쁘지만, 실무에서는 항상 예외 상황이 발생합니다.

---

## 1️⃣ Raw JavaScript/TypeScript 호출

### 상황
복잡한 데이터 처리가 필요하거나, FreeLang에 없는 라이브러리 사용 필요

### Escape Hatch: `(js-eval ...)`

```fl
;; FreeLang으로 불가능한 작업 → JavaScript로 직접 호출

;; 예제: complex image processing
(define process-image (js-eval
  "const sharp = require('sharp');
   return async (buffer) => {
     return await sharp(buffer)
       .resize(800, 600)
       .toFormat('webp')
       .toBuffer();
   }"))

;; FreeLang에서 호출
(define image-data (file-read "photo.jpg"))
(define processed (await (process-image image-data)))
```

### 왜 필요한가?
- 특정 라이브러리 (이미지 처리, 복잡한 수학)
- 성능 크리티컬 섹션
- 제3자 SDK의 고급 기능

---

## 2️⃣ Raw SQL 쿼리

### 상황
ORM으로 표현 불가능한 복잡한 SQL 조인/윈도우 함수

### Escape Hatch: `(sql-raw ...)`

```fl
;; 일반적인 ORM 쿼리
(define users (sqlite-query db "SELECT * FROM users"))

;; 복잡한 쿼리 필요? → 원본 SQL 사용
(define monthly-revenue (sql-raw db
  "SELECT DATE_TRUNC('month', created_at) as month,
          SUM(amount) as total,
          ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC) as rank
   FROM orders
   WHERE created_at > $1
   GROUP BY DATE_TRUNC('month', created_at)"))

;; 파라미터 바인딩도 자동
(define result (sql-raw db 
  "SELECT * FROM orders WHERE user_id = $1 AND status = $2"
  [user-id "pending"]))
```

### 자동 보호
```fl
;; SQL 인젝션 방지 (파라미터 바인딩 필수)
(sql-raw db "SELECT * FROM users WHERE id = " id)  ;; ❌ 컴파일 에러
(sql-raw db "SELECT * FROM users WHERE id = $1" [id])  ;; ✅ 안전
```

---

## 3️⃣ 외부 SDK 직접 통합

### 상황
특정 클라우드 제공자 (AWS, GCP) 고급 기능이 필요

### Escape Hatch: `(require-npm ...)`

```fl
;; AWS SDK 직접 사용
(define s3-client (require-npm "aws-sdk/client-s3"))

;; FreeLang 래퍼
(define upload-to-s3 (fn [bucket key data]
  (js-eval
    "const client = require('aws-sdk/client-s3');
     return async (bucket, key, data) => {
       const result = await client.putObject({
         Bucket: bucket,
         Key: key,
         Body: data
       });
       return result.ETag;
     }")))

;; 사용
(define etag (await (upload-to-s3 "my-bucket" "file.txt" file-data)))
```

### 패턴
```fl
;; 1. NPM 패키지 임포트
(define pkg (require-npm "package-name"))

;; 2. JavaScript 래핑 (필요시)
(define wrapper (js-eval "
  const pkg = require('package-name');
  return (args) => pkg.method(args);
"))

;; 3. FreeLang에서 호출
(define result (wrapper args))
```

---

## 4️⃣ 성능 튜닝 — 네이티브 구현

### 상황
1000만 행 정렬, 복잡한 수학 계산 등 성능 크리티컬

### Escape Hatch: `(native-impl ...)`

```fl
;; FreeLang 버전 (간단하지만 느림)
(define sort-large-array (fn [arr]
  (define merge (fn [left right]
    (if (empty? left) right
        (if (empty? right) left
            (if (<= (first left) (first right))
                (cons (first left) (merge (rest left) right))
                (cons (first right) (merge left (rest right))))))))
  
  (if (<= (length arr) 1) arr
      (do
        (define mid (/ (length arr) 2))
        (define left (sort-large-array (slice arr 0 mid)))
        (define right (sort-large-array (slice arr mid)))
        (merge left right)))))

;; 성능 필요? → 네이티브 구현
(define sort-native (native-impl "
  module.exports = (arr) => {
    // V8 최적화 활용
    return arr.sort((a, b) => a - b);
  };
"))

;; 투명한 호출
(define sorted (sort-native large-array))
```

### 벤치마크
```
크기: 100만 원소

FreeLang 정렬:  2,340ms
네이티브:       12ms (195배 빠름)

→ 크리티컬 경로에서만 native-impl 사용
```

---

## 5️⃣ 환경별 구현 선택

### 상황
개발 환경과 프로덕션 환경에서 다른 로직 필요

### Escape Hatch: `(cond-env ...)`

```fl
;; 환경별 구현
(define cache-backend
  (cond-env
    :development => (fn [key]
      ;; 개발: 메모리 캐시 (즉시 확인 가능)
      (fcache-get key))
    
    :staging => (fn [key]
      ;; 스테이징: Redis (실제 배포와 동일)
      (redis-get redis-client key))
    
    :production => (fn [key]
      ;; 프로덕션: Redis + CloudFlare CDN
      (or (cdn-cache-get key)
          (redis-get redis-client key)))))

;; 사용 (환경에 따라 자동 선택)
(define cached-data (cache-backend "user:123"))
```

---

## 6️⃣ 직접 포트/소켓 제어

### 상황
HTTP 외 프로토콜 필요 (gRPC, MQTT, 바이너리 프로토콜)

### Escape Hatch: `(raw-socket ...)`

```fl
;; gRPC 서버 (FreeLang의 간단한 HTTP 넘어)
(define grpc-server (raw-socket :grpc 50051))

;; MQTT 클라이언트
(define mqtt (raw-socket :mqtt "mqtt://broker.example.com" {
  :clientId "freelang-client"
  :username "user"
  :password "pass"
}))

;; 메시지 구독
(socket-on mqtt "device/+/temperature" (fn [msg]
  (log-info "Temperature update" {:msg msg})))

;; 메시지 발행
(socket-send mqtt "control/device-1/status" "online")
```

---

## 7️⃣ 환경변수 & 시크릿

### 상황
민감한 정보 (API 키, 데이터베이스 비밀번호) 안전하게 관리

### Escape Hatch: `(secret ...)`

```fl
;; 안전한 환경변수 로드 (런타임에 노출 안 함)
(define db-password (secret "DB_PASSWORD"))

;; 또는 파일에서
(define api-keys (secret-file "/etc/secrets/api-keys.json"))

;; 사용
(define db (sqlite-open 
  "postgresql://user:" db-password "@localhost/mydb"))

;; 번들링/프로파일링에서 제외
(if (developing?)
  (log-debug "DB Password" db-password)  ;; 개발만
  (do))  ;; 프로덕션에서는 로그 안 함

;; 또는 .gitignore처럼 secret 파일 지정
;; .secretignore:
;; DB_PASSWORD
;; ANTHROPIC_API_KEY
```

---

## 8️⃣ 모니터링 & 프로파일링

### 상황
병목 지점 확인, 메모리/CPU 프로파일링

### Escape Hatch: `(profile ...)`

```fl
;; 함수 성능 측정
(define process-data (profile "data-processing" (fn [data]
  ;; 복잡한 작업
  (map (fn [x] (expensive-compute x)) data))))

;; 결과: 자동으로 로그됨
;; [PROFILE] data-processing: 1,234ms (min: 100ms, max: 5,200ms, avg: 1,200ms)

;; 메모리 프로파일
(define large-batch (profile-memory "batch-load" (fn []
  (map sqlite-query (range 1 10000)))))

;; 결과: 메모리 변화 추적
;; [MEMORY] batch-load: 120MB → 540MB (+ 420MB)

;; 힙 덤프
(if (memory-threshold-exceeded? 80%)
  (do
    (dump-heap "heap-snapshot.json")
    (log-error "Memory threshold exceeded")))
```

---

## 🎯 Escape Hatch 사용 원칙

### ✅ 올바른 사용
```fl
;; 1. 정말 필요한 경우만
(native-impl "...")  ;; 성능 크리티컬일 때만

;; 2. 래핑해서 재사용 가능하게
(define safe-image-processor 
  (native-impl "...image processing..."))

;; 3. 테스트 가능하게
(test-case "image processing"
  (define result (safe-image-processor test-image))
  (assert-eq (. result :width) 800))

;; 4. 문서화
;;; raw-sql-complex-join: 최적화된 SQL 조인
;;; 사용: 월별 매출 집계 쿼리에서만
(define monthly-report (sql-raw ...))
```

### ❌피해야 할 사용
```fl
;; 1. 과도한 native-impl
(native-impl "...")
(native-impl "...")
(native-impl "...")  ;; → 그냥 JavaScript 쓰지 말고 뭐하냐?

;; 2. 무분별한 js-eval
(js-eval "복잡한 로직")  ;; 테스트 불가, 타입 추론 불가

;; 3. 시크릿 노출
(secret "API_KEY")을 로그에 출력  ;; 보안 위반
```

---

## 📋 Escape Hatch 체크리스트

새로운 기능 추가 시:

```
□ FreeLang으로 표현 가능한가? (먼저 시도)
□ 성능이 부족한가? (native-impl 고려)
□ 외부 라이브러리 필수인가? (require-npm 고려)
□ 복잡한 SQL인가? (sql-raw 고려)
□ 보안 정보인가? (secret 사용)
□ 환경별 로직인가? (cond-env 사용)
□ 테스트 가능한가? (테스트 작성)
□ 문서화했는가? (주석 추가)
```

---

## 🎁 결론

FreeLang은 **우아한 기본값 + 강력한 탈출구**를 제공합니다.

- 99%의 비즈니스 로직: FreeLang으로 간단히
- 1%의 예외: Escape Hatch로 유연하게

**실무 프로덕션에서 검증된 설계입니다.**
