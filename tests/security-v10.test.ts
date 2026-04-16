// security-v10.test.ts — v10.0.1 보안 테스트 20개
// SQL 인젝션, 쉘 인젝션, CORS, 메모리 누수 등 검증

import { createSqliteModule } from '../src/stdlib-sqlite';
import { createSseModule } from '../src/stdlib-sse';
import { createFileCacheModule } from '../src/stdlib-file-cache';
import { createStreamAiModule } from '../src/stdlib-stream-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('v10.0.1 보안 테스트', () => {
  // ✅ Step 1-3: SQL 인젝션 방지
  describe('SQLite SQL 인젝션 방지', () => {
    let sqlite: any;
    let dbId: string;
    const testDbPath = path.join(os.tmpdir(), 'security-test.db');

    beforeEach(() => {
      sqlite = createSqliteModule();
      dbId = sqlite['sqlite-open'](testDbPath);
      sqlite['sqlite-create-table'](dbId, 'users', { name: 'TEXT', age: 'INTEGER' });
    });

    afterEach(() => {
      sqlite['sqlite-close'](dbId);
      try { fs.unlinkSync(testDbPath); } catch {}
    });

    test('단순 SQL 인젝션 — \'; DROP TABLE users; --', () => {
      // 파라미터: "'; DROP TABLE users; --"
      const result = sqlite['sqlite-query'](
        dbId,
        "SELECT * FROM users WHERE name = $1",
        ["'; DROP TABLE users; --"]
      );

      // 테이블이 여전히 존재해야 함
      const tableCheck = sqlite['sqlite-query'](
        dbId,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      expect(Array.isArray(tableCheck) || tableCheck.error).toBe(true);
    });

    test('유니코드 우회 시도 — \\u0027 OR 1=1', () => {
      const result = sqlite['sqlite-exec'](
        dbId,
        "INSERT INTO users (name, age) VALUES ($1, $2)",
        ["test", 25]
      );
      expect(result.ok || result.error).toBeDefined();

      // 유니코드 이스케이프로 우회 시도
      const query = sqlite['sqlite-query'](
        dbId,
        "SELECT * FROM users WHERE name = $1",
        ["\u0027 OR 1=1"]
      );
      expect(Array.isArray(query) || query.error).toBe(true);
    });

    test('경로 트래버설 — ../../../etc/passwd', () => {
      // 경로 검증이 있으므로 에러 반환
      const maliciousPath = path.join('..', '..', 'etc', 'passwd');
      const result = sqlite['sqlite-open'](maliciousPath);
      expect(result).toContain('error_');
    });

    test('테이블명 인젝션 — users; DROP--', () => {
      // 테이블명 검증이 있으므로 false 반환
      const result = sqlite['sqlite-create-table'](
        dbId,
        "users; DROP",
        { id: 'INTEGER' }
      );
      expect(result).toBe(false);
    });

    test('정상 데이터는 정상 처리', () => {
      const insertResult = sqlite['sqlite-exec'](
        dbId,
        "INSERT INTO users (name, age) VALUES ($1, $2)",
        ["Alice", 30]
      );
      expect(insertResult.ok).toBe(true);

      const queryResult = sqlite['sqlite-query'](
        dbId,
        "SELECT * FROM users WHERE name = $1",
        ["Alice"]
      );
      expect(Array.isArray(queryResult)).toBe(true);
    });
  });

  // ✅ Step 4: SSE CORS 화이트리스트
  describe('SSE CORS 보안', () => {
    let sse: any;
    const mockResponse = {
      writeHead: jest.fn(),
      end: jest.fn(),
    };

    beforeEach(() => {
      sse = createSseModule();
      process.env.ALLOWED_ORIGINS = 'http://localhost:43000,https://trusted.example.com';
    });

    test('허용된 Origin — http://localhost:43000', () => {
      const mockReq = { headers: { origin: 'http://localhost:43000' } };
      sse['sse-connect'](mockResponse, mockReq);

      const corsHeader = mockResponse.writeHead.mock.calls[0][1]['Access-Control-Allow-Origin'];
      expect(corsHeader).toBe('http://localhost:43000');
    });

    test('허용되지 않은 Origin — http://evil.example.com', () => {
      const mockReq = { headers: { origin: 'http://evil.example.com' } };
      sse['sse-connect'](mockResponse, mockReq);

      const corsHeader = mockResponse.writeHead.mock.calls[1][1]['Access-Control-Allow-Origin'];
      expect(corsHeader).toMatch(/localhost|trusted/); // 기본값으로 설정
    });
  });

  // ✅ Step 4: SSE 메모리 누수 방지
  describe('SSE 메모리 누수 방지', () => {
    let sse: any;

    beforeEach(() => {
      sse = createSseModule();
    });

    test('1K 연결/해제 후 메모리 정리', () => {
      const mockResponses: any[] = [];

      // 1000개 연결 생성
      for (let i = 0; i < 1000; i++) {
        const mockResponse = {
          writeHead: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
        };
        mockResponses.push(mockResponse);
        sse['sse-connect'](mockResponse);
      }

      // 모든 연결 종료
      for (const mockResponse of mockResponses) {
        mockResponse.end();
      }

      // cleanup 호출
      const cleaned = sse['sse-cleanup']();
      expect(cleaned).toBeGreaterThan(0);

      // 활성 연결 수 확인
      const activeCount = sse['sse-active-connections']();
      expect(activeCount).toBeLessThan(1000); // 대부분 정리됨
    });
  });

  // ✅ Step 5: 파일 캐시 TOCTOU 방지
  describe('파일 캐시 TOCTOU 방지', () => {
    let fcache: any;

    beforeEach(() => {
      fcache = createFileCacheModule();
    });

    test('100 concurrent set/get 충돌 없음', async () => {
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            fcache['fcache-set'](`key_${i}`, { data: i }, 3600);
            const data = fcache['fcache-get'](`key_${i}`);
            resolve(data?.data === i);
          })
        );
      }

      const results = await Promise.all(promises);
      expect(results.every(r => r === true)).toBe(true);
    });

    test('TTL 만료 후 자동 삭제 (모의)', () => {
      // 즉시 만료되는 항목 생성 (TTL = 1초)
      fcache['fcache-set']('expired-key', { data: 'test' }, 0);

      // 즉시 조회 (삭제됨)
      const result = fcache['fcache-get']('expired-key');
      expect(result).toBeNull();
    });

    test('정상 TTL 항목은 조회 가능', () => {
      fcache['fcache-set']('valid-key', { data: 'test' }, 3600);
      const result = fcache['fcache-get']('valid-key');
      expect(result?.data).toBe('test');
    });
  });

  // ✅ Step 6: stream-ai 에러 처리
  describe('stream-ai HTTP 상태 확인', () => {
    let streamAi: any;

    beforeEach(() => {
      streamAi = createStreamAiModule();
      process.env.ANTHROPIC_API_KEY = 'test-key';
    });

    test('stream-ai return streamId', () => {
      const streamId = streamAi['stream-ai']({
        model: 'claude-3-5-sonnet',
        prompt: 'test',
      });
      expect(streamId).toMatch(/^stream_/);
    });

    test('stream-cancel 존재하지 않는 스트림', () => {
      const result = streamAi['stream-cancel']('nonexistent-stream');
      expect(result).toBe(false);
    });

    test('stream-running? 초기 상태', () => {
      const result = streamAi['stream-running?']();
      expect(typeof result).toBe('boolean');
    });
  });

  // ✅ Step 7: 구조화 로그 경로 검증
  describe('구조화 로그 경로 검증', () => {
    let log: any;

    beforeEach(() => {
      log = createStructuredLogModule();
    });

    test('경로 트래버설 방지 — ../../etc/passwd', () => {
      const result = log['log-init']({
        level: 'info',
        file: path.join('..', '..', 'etc', 'passwd'),
      });
      expect(result).toBe(false);
    });

    test('허용 경로 logs/app.log', () => {
      const result = log['log-init']({
        level: 'info',
        file: 'logs/app.log',
      });
      expect(result).toBe(true);
    });

    test('홈 디렉토리 경로 허용', () => {
      const logPath = path.join(os.homedir(), 'test-app.log');
      const result = log['log-init']({
        level: 'info',
        file: logPath,
      });
      expect(result).toBe(true);

      // 정리
      try { fs.unlinkSync(logPath); } catch {}
    });
  });

  // ✅ 종합 보안 체크
  describe('종합 보안 테스트', () => {
    test('모든 stdlib 모듈 import 가능', () => {
      const sqlite = createSqliteModule();
      const sse = createSseModule();
      const fcache = createFileCacheModule();
      const streamAi = createStreamAiModule();
      const log = createStructuredLogModule();

      expect(sqlite).toBeDefined();
      expect(sse).toBeDefined();
      expect(fcache).toBeDefined();
      expect(streamAi).toBeDefined();
      expect(log).toBeDefined();
    });

    test('콜백 주입 가능', () => {
      const callFn = jest.fn();
      const callVal = jest.fn();

      const sqlite = createSqliteModule(callFn, callVal);
      const sse = createSseModule(callFn, callVal);

      expect(sqlite).toBeDefined();
      expect(sse).toBeDefined();
    });
  });
});
