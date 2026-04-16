# FreeLang v10.0.0 코드 리뷰 — 문제점 파악

**작성일**: 2026-04-16  
**심각도**: 🔴 심각 / 🟡 중간 / 🟢 경미

---

## 🔴 심각한 문제 (CRITICAL)

### 1. SQL 인젝션 취약점 — stdlib-sqlite.ts

**위치**: `src/stdlib-sqlite.ts` 라인 46-55, 75-84

**문제 코드**:
```typescript
// ❌ 위험: 단순 replace로 파라미터 바인딩
let boundSql = sql;
params.forEach((param, i) => {
  const placeholder = `$${i + 1}`;
  const value = typeof param === 'string'
    ? `'${param.replace(/'/g, "''")}'`  // 단순 escape
    : param === null
    ? 'NULL'
    : String(param);
  boundSql = boundSql.replace(new RegExp(`\\${placeholder}`, 'g'), value);
});
```

**공격 벡터**:
```fl
(sqlite-query db "SELECT * FROM users WHERE name = $1" ["'; DROP TABLE users; --"])
→ SELECT * FROM users WHERE name = ''; DROP TABLE users; --'
```

**왜 위험한가**:
1. 정규표현식 escape 불완전
2. 백슬래시 escape 미흡
3. 여러 곳에서 $1 치환 가능 (의도치 않은 동작)
4. JSON 문맥에서 특수 문자 미처리

**해결책**:
```typescript
// ✅ 올바른 방법: sqlite3 binding 사용
const sqlite3 = require('sqlite3');
const stmt = db.prepare(sql);
stmt.bind(params);
const result = stmt.getAsObject();
```

---

### 2. 쉘 인젝션 취약점 — stdlib-sqlite.ts

**위치**: `src/stdlib-sqlite.ts` 라인 58-61

**문제 코드**:
```typescript
// ❌ 위험: execSync에 직접 SQL 전달
const result = execSync(
  `sqlite3 -json "${conn.dbPath}" "${boundSql.replace(/"/g, '\\"')}"`,
  { stdio: 'pipe', encoding: 'utf-8' }
);
```

**공격 벡터**:
```typescript
boundSql = `"; rm -rf /; echo "`
// → sqlite3 -json "db.sqlite" ""; rm -rf /; echo ""
```

**왜 위험한가**:
1. 이중 따옴표 escape도 우회 가능 (백틱, $() 이용)
2. execSync는 shell 해석
3. 백슬래시 우회 가능

**해결책**:
```typescript
// ✅ sqlite3 노드 패키지 사용 (or spawned process with args)
const { spawn } = require('child_process');
const args = ['-json', dbPath, '--', sql];  // -- stops arg parsing
```

---

### 3. 메모리 누수 — stdlib-file-cache.ts

**위치**: `src/stdlib-file-cache.ts` 라인 77-100

**문제 1: 동시성 레이스 컨디션**
```typescript
// ❌ 파일 존재 확인과 삭제 사이에 경쟁
if (!fs.existsSync(filePath)) {
  return null;  // 파일 존재
}
// 다른 프로세스가 여기서 삭제 가능
const content = fs.readFileSync(filePath, 'utf-8');  // CRASH
```

**문제 2: TTL 만료 파일 정리 없음**
```typescript
// ❌ 파일 읽을 때만 확인
// 읽지 않은 만료 파일은 영구적으로 저장됨
// ~/.freelang-cache 디렉토리가 무한 증가
```

**문제 3: 패턴 매칭 성능**
```typescript
// ❌ 매번 모든 파일 읽기
for (const file of files) {
  const content = fs.readFileSync(filePath, 'utf-8');  // 동기 읽기
  const entry = JSON.parse(content);  // 파싱
}
// 만약 100K 파일이면 100K번 읽음 (블로킹)
```

**해결책**:
```typescript
// ✅ 메타데이터를 별도 인덱스로 관리
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
// { "hash": { key, expiresAt, size }, ... }
// 정기적 TTL 정리 스케줄러
```

---

### 4. CORS 헤더 무조건 오픈 — stdlib-sse.ts

**위치**: `src/stdlib-sse.ts` 라인 32

**문제 코드**:
```typescript
// ❌ 모든 출처에서 접근 가능
response.writeHead(200, {
  'Access-Control-Allow-Origin': '*',  // 위험!
});
```

**공격 벡터**:
- 악의적 웹사이트에서 SSE 연결
- CSRF 공격 (크로스 사이트 이벤트 스트리밍)
- 대역폭 낭비 (무제한 브로드캐스트)

**해결책**:
```typescript
// ✅ 환경변수로 CORS 오리진 제어
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:43000'];
const origin = request.headers.origin;
if (allowedOrigins.includes(origin)) {
  response.setHeader('Access-Control-Allow-Origin', origin);
}
```

---

## 🟡 중간 문제 (MEDIUM)

### 5. SSE 메모리 누수

**위치**: `src/stdlib-sse.ts` 라인 7-10

**문제**:
```typescript
// ❌ closed 연결이 계속 메모리에 남음
const sseConnections = new Map<string, {
  response: http.ServerResponse;
  closed: boolean;  // 삭제하지 않고 플래그만 설정
}>();
```

**시나리오**:
- 100K 클라이언트 연결
- 모두 disconnect
- 메모리에 100K 개 객체 유지 (dead reference)
- GC 압력 증가

**영향**: 
- 장시간 운영 시 메모리 점진적 증가
- 수주 후 OOM (Out Of Memory)

**해결책**:
```typescript
// ✅ 주기적 정리 또는 약한 참조
setInterval(() => {
  for (const [id, conn] of sseConnections) {
    if (conn.closed) {
      sseConnections.delete(id);
    }
  }
}, 60000);  // 1분마다
```

---

### 6. 파라미터 바인딩 로직 결함

**위치**: `src/stdlib-sqlite.ts` 라인 50

**문제**:
```typescript
// ❌ 불완전한 escape
? `'${param.replace(/'/g, "''")}'`
// 이스케이프되지 않는 문자: \, \0, \n, \r, \x1a, NUL
```

**시나리오**:
```fl
(sqlite-query db "..." ["line1\nline2"])
→ SQL 스트링에 개행 문자 삽입
→ 쿼리 구조 변경
```

**해결책**:
```typescript
// ✅ 완전한 escape 또는 prepared statements
const ESCAPE_CHARS = {
  '\0': '\\0',
  "'": "''",
  '"': '\\"',
  '\\': '\\\\',
  '\n': '\\n',
  '\r': '\\r',
  '\x1a': '\\Z',
};
```

---

### 7. 에러 처리 불일관성

**위치**: 여러 stdlib 모듈

**문제**:
```typescript
// ❌ 서로 다른 에러 반환
"sqlite-query": () => { return { error: "..." }; }
"sqlite-exec": () => { return { error: "..." }; }
"fcache-get": () => { return null; }
"sse-send": () => { return false; }
```

**문제점**:
- 호출자가 일관된 에러 처리 불가능
- null vs false vs { error: string }

**해결책**:
```typescript
// ✅ 통일된 Result 타입
type Result<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };
```

---

## 🟢 경미한 문제 (MINOR)

### 8. 성능 최적화 부족

**위치**: `src/stdlib-sqlite.ts` 라인 86

**문제**:
```typescript
// ❌ 매 쿼리마다 execSync (동기 호출, 블로킹)
execSync(`sqlite3 "${conn.dbPath}" "..."`);
```

**영향**:
- Node.js 이벤트 루프 블로킹
- 동시성 처리 불가능
- 대량 쿼리 시 심각한 성능 저하

**목표**:
```typescript
// ✅ async/await 지원
async sqlite-query(dbId, sql, params) { ... }
```

---

### 9. 입력 검증 부족

**위치**: 대부분의 모듈

**예시**:
```typescript
// ❌ 검증 없음
"sqlite-open": (dbPath: string) => {
  // dbPath가 ".." 포함 가능?
  // 절대 경로인가?
  // 읽기 권한 확인?
}
```

---

## 📋 우선순위별 수정 계획

### P0 (즉시)
- [ ] SQL 인젝션: prepared statements로 전환
- [ ] 쉘 인젝션: execSync → sqlite3 node package 또는 spawned process
- [ ] CORS: 화이트리스트 기반으로 변경

### P1 (이번 주)
- [ ] 메모리 누수: 인덱스 기반 캐시 시스템
- [ ] SSE 정리: 주기적 cleanup
- [ ] 에러 처리: Result 타입 통일

### P2 (다음 주)
- [ ] async/await 지원
- [ ] 입력 검증 강화
- [ ] 성능 프로파일링

---

## 실제 영향도 평가

### 현재 상황: **프로덕션 사용 불가**

| 측면 | 평가 | 이유 |
|------|------|------|
| **보안** | 🔴 심각 | SQL/쉘 인젝션 |
| **안정성** | 🟡 중간 | 메모리 누수 |
| **성능** | 🟡 중간 | 동기 호출, 블로킹 |
| **확장성** | 🔴 심각 | 메모리 누수 → OOM |

---

## 결론

**v10.0.0은 "개념 증명(PoC)"이지 "프로덕션 준비"가 아닙니다.**

### 문제의 근본 원인
1. **sqlite3 npm 패키지를 피하려고 함**
   - 외부 의존 제거 목표
   - 결과: 보안 구현 직접 (위험)

2. **child_process + execSync 선택**
   - 간단해 보임
   - 결과: 인젝션 취약점

3. **동기 파일 I/O**
   - 구현 간단
   - 결과: 성능/확장성 문제

### 추천 경로

**Option A: 보안 강화 (추천)**
```
v10.0.1 → sqlite3 npm 패키지 도입
        → prepared statements 전환
        → async/await 지원
        → 약 2주 작업
```

**Option B: 철학 유지**
```
"No external npm" 고집
→ 외부 공격 노출 위험
→ 프로덕션 사용 불가
→ 학습용/데모용만 가능
```

---

**추천**: **Option A로 진행 (v10.0.1)**

현재 대로는 프로덕션 배포 불가능합니다. 🚨
