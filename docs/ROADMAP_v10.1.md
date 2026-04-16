# FreeLang v10.1 로드맵 — 성능 & 안정성

**대상**: v10.0.1 (보안 완료) → v10.1 (성능/안정성 완료)  
**예상 기간**: 2주~3주  
**목표**: "사용 가능한 언어" → "생산 가능한 언어"

---

## 🔴 1단계: 성능 (긴급 — 비동기 I/O)

### 1.1 SQLite 비동기화

**현재 문제**:
```typescript
// ❌ 동기: 블로킹
const result = sqliteRun(dbPath, sql, true);  // 처리 완료까지 대기
```

**해결**:
```typescript
// ✅ 비동기: 논블로킹
async function sqliteRunAsync(dbPath, sql, json = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('sqlite3', args, { ... });
    // stdin 쓰고 stdout 수집
    proc.on('close', () => resolve(stdout));
  });
}
```

**파일**: `src/stdlib-sqlite.ts`  
**작업 항목**:
- [ ] spawn → Promise 변환
- [ ] sqlite-query → async 버전
- [ ] sqlite-exec → async 버전
- [ ] 트랜잭션 → async 버전
- [ ] 테스트 추가

**복잡도**: ⭐⭐⭐ (중간)  
**예상 시간**: 2-3시간

---

### 1.2 파일 I/O 비동기화

**현재 문제**:
```typescript
// ❌ 동기: 블로킹
const content = fs.readFileSync(filePath, 'utf-8');
```

**해결**:
```typescript
// ✅ 비동기
const content = await fs.promises.readFile(filePath, 'utf-8');
```

**파일**: `src/stdlib-file-cache.ts`  
**작업 항목**:
- [ ] readFileSync → promises.readFile
- [ ] writeFileSync → promises.writeFile
- [ ] readdirSync → promises.readdir
- [ ] unlinkSync → promises.unlink
- [ ] 콜백 체인 → async/await로 정리

**복잡도**: ⭐⭐ (쉬움)  
**예상 시간**: 1-2시간

---

### 1.3 로그 쓰기 비동기화

**현재 문제**:
```typescript
// ❌ 동기: 블로킹
fs.appendFileSync(logConfig.file, jsonLine + '\n', 'utf-8');
```

**해결**:
```typescript
// ✅ 비동기 + 버퍼링
logQueue.push(jsonLine);
if (logQueue.length >= 10) {
  await fs.promises.appendFile(logConfig.file, logQueue.join('\n') + '\n');
  logQueue = [];
}
```

**파일**: `src/stdlib-structured-log.ts`  
**작업 항목**:
- [ ] appendFileSync → 비동기 버퍼링
- [ ] 주기적 flush (100ms or 10 items)
- [ ] graceful shutdown 처리

**복잡도**: ⭐⭐ (쉬움)  
**예상 시간**: 1시간

---

## 🔴 2단계: 안정성 (중간 — 동시성 & 메모리)

### 2.1 동시성 강화

**현재 문제**:
- SQLite: 1개 연결만 (실제로는 child_process는 병렬 가능)
- SSE: 메모리 누수 가능성 여전

**해결**:
```typescript
// ✅ 연결 풀
class SqlitePool {
  private activeRequests = 0;
  private maxConcurrent = 5;
  
  async execute(sql, params) {
    while (this.activeRequests >= this.maxConcurrent) {
      await sleep(10);  // 대기
    }
    this.activeRequests++;
    try {
      return await sqliteRunAsync(sql, params);
    } finally {
      this.activeRequests--;
    }
  }
}
```

**파일**: `src/stdlib-sqlite.ts` (신규: connection-pool)  
**작업 항목**:
- [ ] 연결 풀 클래스 구현
- [ ] max-concurrent 설정화
- [ ] 대기 큐 관리
- [ ] 부하 테스트 (100+ 동시 요청)

**복잡도**: ⭐⭐⭐ (중간)  
**예상 시간**: 3-4시간

---

### 2.2 메모리 최적화

**현재 문제**:
- SSE: 60초 주기 정리 (너무 길음)
- 파일캐시: 5분 주기 정리 (너무 길음)
- 로그: 로테이션된 파일 누적

**해결**:
```typescript
// ✅ 즉시 정리 + 더 자주 정리

// SSE: 즉시 + 30초
const cleanupInterval = setInterval(() => { ... }, 30_000);

// 파일캐시: TTL 확인 시 + 1분
const gcInterval = setInterval(() => { ... }, 60_000);

// 로그: 로테이션 시 오래된 파일 삭제
const maxFiles = config.maxFiles || 3;  // 기본 5 → 3으로
```

**파일**: 여러 (sqlite, sse, file-cache, structured-log)  
**작업 항목**:
- [ ] 정리 주기 단축 (60초→30초, 300초→60초)
- [ ] 최대 파일 수 조정 (5→3)
- [ ] 메모리 모니터링 추가
- [ ] 메모리 누수 테스트

**복잡도**: ⭐⭐ (쉬움)  
**예상 시간**: 1-2시간

---

### 2.3 Timeout 정책

**현재 문제**:
- SQLite: 10초 timeout만 설정
- stream-ai: timeout 없음
- HTTP: timeout 없음

**해결**:
```typescript
// ✅ 모든 I/O에 timeout

// SQLite
const result = await Promise.race([
  sqliteRunAsync(sql, params),
  sleep(5000).then(() => { throw new TimeoutError(); })
]);

// stream-ai
const timeout = config.timeout || 30000;
const result = await Promise.race([
  streamAiAsync(config),
  sleep(timeout).then(() => { throw new TimeoutError(); })
]);
```

**파일**: 여러 (sqlite, stream-ai, http)  
**작업 항목**:
- [ ] 모든 비동기 작업에 Promise.race 추가
- [ ] 기본 timeout 값 설정 (SQLite: 5s, HTTP: 30s, stream-ai: 60s)
- [ ] timeout 설정 가능하게 노출
- [ ] timeout 테스트

**복잡도**: ⭐⭐⭐ (중간)  
**예상 시간**: 2-3시간

---

## 🟡 3단계: 운영 (개선 — 계측 & 테스트)

### 3.1 성능 계측

**목표**: p50/p95/p99 응답 시간 측정

**구현**:
```typescript
// ✅ 성능 메트릭 수집

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  record(operation: string, durationMs: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(durationMs);
  }
  
  getPercentile(operation: string, percentile: number) {
    const values = (this.metrics.get(operation) || []).sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * values.length);
    return values[index] || 0;
  }
}

// 사용
const monitor = new PerformanceMonitor();
monitor.record('sqlite-query', 15);  // 15ms
monitor.record('sqlite-query', 22);
console.log(monitor.getPercentile('sqlite-query', 50));  // p50
```

**파일**: `src/stdlib-performance.ts` (신규)  
**작업 항목**:
- [ ] PerformanceMonitor 클래스
- [ ] 각 stdlib 작업에 계측 추가
- [ ] HTTP 엔드포인트: GET /metrics
- [ ] 정기적 로깅 (매 1분)

**복잡도**: ⭐⭐ (쉬움)  
**예상 시간**: 2-3시간

---

### 3.2 부하 테스트

**목표**: 동시 요청 수에 따른 응답 시간 측정

**테스트 시나리오**:
```bash
# SQLite 부하
wrk -t4 -c100 -d30s --script=sqlite-load.lua http://localhost:43000/api/query

# SSE 부하
# 1K 클라이언트 동시 연결 후 10분 모니터링
# 메모리 증가율 < 10MB 확인

# 혼합 부하
# SQLite + SSE + 캐시 + 로그 동시 실행
```

**파일**: `scripts/load-test/` (신규)  
**작업 항목**:
- [ ] wrk 스크립트 작성
- [ ] SSE 부하 테스트 (Node.js)
- [ ] 혼합 부하 테스트
- [ ] 메모리 모니터링
- [ ] 결과 HTML 리포트

**복잡도**: ⭐⭐⭐ (중간)  
**예상 시간**: 4-5시간

---

### 3.3 지속적 보안

**목표**: 보안 회귀 방지

**구현**:
```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run security tests
        run: npm test -- tests/security-v10.test.ts
      - name: FAIL if any security test fails
        if: failure()
        run: exit 1
```

**파일**: `.github/workflows/security.yml` (신규)  
**작업 항목**:
- [ ] GitHub Actions 워크플로우 생성
- [ ] PR 마다 보안 테스트 자동 실행
- [ ] 실패 시 merge 차단
- [ ] 릴리스 체크리스트에 보안 테스트 추가

**복잡도**: ⭐ (매우 쉬움)  
**예상 시간**: 1시간

---

## 📊 타임라인

| 단계 | 작업 | 예상 | 순서 |
|------|------|------|------|
| **1** | SQLite 비동기화 | 2-3h | 먼저 |
| **1** | 파일 I/O 비동기화 | 1-2h | 병렬 |
| **1** | 로그 비동기화 | 1h | 병렬 |
| **2** | 동시성 강화 | 3-4h | 그다음 |
| **2** | 메모리 최적화 | 1-2h | 병렬 |
| **2** | Timeout 정책 | 2-3h | 병렬 |
| **3** | 성능 계측 | 2-3h | 마지막 |
| **3** | 부하 테스트 | 4-5h | 마지막 |
| **3** | 지속적 보안 | 1h | 마지막 |

**총 예상**: 17-26시간 = **약 3-4일**

---

## 🎯 v10.1 완성 기준

### 성능 목표
- [ ] SQLite 평균 응답: < 50ms (p95 < 100ms)
- [ ] SSE 1K 동시 연결 안정 유지
- [ ] 메모리 증가율: < 1MB/시간

### 안정성 목표
- [ ] 100+ 동시 요청 처리 가능
- [ ] 모든 작업에 timeout 설정
- [ ] 부하 테스트 24시간 안정 실행

### 운영 목표
- [ ] p50/p95/p99 성능 계측 가능
- [ ] 부하 테스트 자동 리포트
- [ ] PR마다 보안 테스트 자동 실행

---

## 📝 체크리스트

### 준비 (이번 세션 끝)
- [ ] 이 로드맵 검토 및 확인
- [ ] 우선순위 재조정 (필요시)
- [ ] 각 단계별 이슈 생성

### 실행 (다음 세션)
- [ ] 1단계: 비동기화 (SQLite, 파일, 로그)
- [ ] 2단계: 안정성 (연결 풀, 메모리, timeout)
- [ ] 3단계: 운영 (계측, 부하 테스트, CI)

### 검증
- [ ] 모든 테스트 PASS
- [ ] 부하 테스트 성공
- [ ] npm publish (10.1.0)

---

## 다음 단계

1. **이 로드맵 검토** — 우선순위 확인
2. **GitHub Issues 생성** — 각 항목별
3. **v10.1 백로드 보드 구성** — Sprint 계획
4. **다음 세션 시작** — 1단계부터 구현

🚀 준비되셨으면 언제든지 시작 가능합니다!
