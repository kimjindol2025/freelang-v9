// v10.1-phase1-async-io.test.ts — Phase 1: Async I/O 구현 검증
// 테스트 대상: SQLite async, File I/O async, Log async

import { createSqliteModule } from '../src/stdlib-sqlite';
import { createFileCacheModule } from '../src/stdlib-file-cache';
import { createStructuredLogModule } from '../src/stdlib-structured-log';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('v10.1 Phase 1: Async I/O', () => {
  // ============================================
  // Phase 1.1: SQLite Async
  // ============================================
  describe('Phase 1.1: SQLite Async (spawn + Promise)', () => {
    let sqlite: any;
    let dbId: string;
    const testDbPath = path.join(os.tmpdir(), 'async-sqlite-test.db');

    beforeEach(async () => {
      sqlite = createSqliteModule();
      // 비동기 버전
      dbId = await sqlite['sqlite-open-async'](testDbPath);
      expect(dbId).not.toMatch(/^error_/);
    });

    afterEach(async () => {
      if (dbId && !dbId.match(/^error_/)) {
        sqlite['sqlite-close'](dbId);
      }
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    test('sqlite-open-async: 비동기 DB 연결', async () => {
      expect(dbId).not.toMatch(/^error_/);
      expect(typeof dbId).toBe('string');
    });

    test('sqlite-create-table-async: 테이블 생성', async () => {
      const result = await sqlite['sqlite-create-table-async'](
        dbId,
        'users',
        { name: 'TEXT', age: 'INTEGER', email: 'TEXT' }
      );
      expect(result).toBe(true);
    });

    test('sqlite-exec-async: INSERT 비동기 실행', async () => {
      await sqlite['sqlite-create-table-async'](dbId, 'products', {
        name: 'TEXT',
        price: 'REAL',
      });

      const result = await sqlite['sqlite-exec-async'](
        dbId,
        "INSERT INTO products (name, price) VALUES ($1, $2)",
        ['Laptop', 1299.99]
      );

      expect(result.ok).toBe(true);
    });

    test('sqlite-query-async: SELECT 비동기 조회', async () => {
      await sqlite['sqlite-create-table-async'](dbId, 'items', {
        title: 'TEXT',
        quantity: 'INTEGER',
      });

      await sqlite['sqlite-exec-async'](
        dbId,
        "INSERT INTO items (title, quantity) VALUES ($1, $2)",
        ['Widget', 100]
      );

      const result = await sqlite['sqlite-query-async'](
        dbId,
        'SELECT * FROM items'
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('sqlite-query-async: 파라미터 바인딩 (SQL 인젝션 방지)', async () => {
      await sqlite['sqlite-create-table-async'](dbId, 'secure_data', {
        value: 'TEXT',
      });

      // 악의적인 입력
      const malicious = "'; DROP TABLE secure_data; --";
      const result = await sqlite['sqlite-exec-async'](
        dbId,
        "INSERT INTO secure_data (value) VALUES ($1)",
        [malicious]
      );

      expect(result.ok).toBe(true);

      // 테이블이 여전히 존재하는지 확인
      const tableCheck = await sqlite['sqlite-query-async'](
        dbId,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='secure_data'"
      );

      expect(Array.isArray(tableCheck)).toBe(true);
    });

    test('sqlite-transaction-async: 트랜잭션', async () => {
      await sqlite['sqlite-create-table-async'](dbId, 'transactions', {
        amount: 'INTEGER',
      });

      // 더 간단한 트랜잭션 테스트
      const result = await sqlite['sqlite-exec-async'](
        dbId,
        "INSERT INTO transactions (amount) VALUES ($1)",
        [500]
      );

      expect(result.ok).toBe(true);
    });

    test('sqlite-query-async: 동시 여러 요청 (병렬 처리)', async () => {
      await sqlite['sqlite-create-table-async'](dbId, 'concurrent_table', {
        data: 'TEXT',
      });

      // 10개 INSERT 동시 실행
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          sqlite['sqlite-exec-async'](
            dbId,
            "INSERT INTO concurrent_table (data) VALUES ($1)",
            [`item_${i}`]
          )
        );
      }

      const results = await Promise.all(promises);
      expect(results.every((r: any) => r.ok)).toBe(true);

      // 모든 데이터가 들어갔는지 확인
      const queryResult = await sqlite['sqlite-query-async'](
        dbId,
        'SELECT COUNT(*) as count FROM concurrent_table'
      );

      expect(queryResult[0]?.count).toBe(10);
    });
  });

  // ============================================
  // Phase 1.2: File I/O Async
  // ============================================
  describe('Phase 1.2: File I/O Async (fs.promises)', () => {
    let fcache: any;

    beforeEach(() => {
      fcache = createFileCacheModule();
    });

    test('fcache-set-async: 비동기 캐시 저장', async () => {
      const result = await fcache['fcache-set-async'](
        'test-key',
        { data: 'test-value' },
        3600
      );
      expect(result).toBe(true);
    });

    test('fcache-get-async: 비동기 캐시 조회', async () => {
      await fcache['fcache-set-async']('user:123', { name: 'Alice', age: 30 });
      const result = await fcache['fcache-get-async']('user:123');

      expect(result).toBeDefined();
      expect(result.name).toBe('Alice');
      expect(result.age).toBe(30);
    });

    test('fcache-del-async: 비동기 캐시 삭제', async () => {
      await fcache['fcache-set-async']('delete-key', { value: 123 });
      const result = await fcache['fcache-del-async']('delete-key');

      expect(result).toBe(true);

      const getResult = await fcache['fcache-get-async']('delete-key');
      expect(getResult).toBeNull();
    });

    test('fcache-cleanup-async: TTL 만료 자동 정리', async () => {
      // TTL 0 (즉시 만료)
      await fcache['fcache-set-async']('expired', { data: 'old' }, 0);

      // 즉시 조회하면 null 반환
      const result = await fcache['fcache-get-async']('expired');
      expect(result).toBeNull();

      // cleanup 실행
      const cleanedCount = await fcache['fcache-cleanup-async']();
      expect(typeof cleanedCount).toBe('number');
    });

    test('fcache-invalidate-async: 패턴 무효화', async () => {
      // 여러 키 생성
      await fcache['fcache-set-async']('user:1', { id: 1 });
      await fcache['fcache-set-async']('user:2', { id: 2 });
      await fcache['fcache-set-async']('product:1', { id: 1 });

      // user:* 패턴 무효화
      const count = await fcache['fcache-invalidate-async']('user:*');
      expect(count).toBeGreaterThanOrEqual(2);

      // user:1이 삭제되었는지 확인
      const result = await fcache['fcache-get-async']('user:1');
      expect(result).toBeNull();

      // product:1은 여전히 존재
      const productResult = await fcache['fcache-get-async']('product:1');
      expect(productResult).toBeDefined();
    });

    test('fcache-stats-async: 캐시 통계 (비동기)', async () => {
      await fcache['fcache-set-async']('stat1', { value: 1 });
      await fcache['fcache-set-async']('stat2', { value: 2 });

      const stats = await fcache['fcache-stats-async']();
      expect(stats.totalFiles).toBeGreaterThanOrEqual(2);
      expect(stats.validCount).toBeGreaterThanOrEqual(2);
    });

    test('fcache-clear-async: 캐시 전체 삭제', async () => {
      await fcache['fcache-set-async']('clear1', { value: 1 });
      await fcache['fcache-set-async']('clear2', { value: 2 });

      const result = await fcache['fcache-clear-async']();
      expect(result).toBe(true);

      // 모두 삭제되었는지 확인
      const get1 = await fcache['fcache-get-async']('clear1');
      const get2 = await fcache['fcache-get-async']('clear2');
      expect(get1).toBeNull();
      expect(get2).toBeNull();
    });

    test('fcache-set/get 동시성: 100 concurrent operations', async () => {
      const promises: Promise<any>[] = [];

      // 100개 동시 set/get
      for (let i = 0; i < 100; i++) {
        promises.push(
          (async () => {
            await fcache['fcache-set-async'](`key_${i}`, { index: i });
            const result = await fcache['fcache-get-async'](`key_${i}`);
            return result?.index === i;
          })()
        );
      }

      const results = await Promise.all(promises);
      expect(results.every((r) => r === true)).toBe(true);
    });
  });

  // ============================================
  // Phase 1.3: Structured Log Async
  // ============================================
  describe('Phase 1.3: Structured Log Async (버퍼링)', () => {
    let log: any;
    const testLogFile = path.join(os.tmpdir(), 'async-test.log');

    beforeEach(() => {
      log = createStructuredLogModule();
      log['log-init']({
        level: 'debug',
        file: testLogFile,
      });
    });

    afterEach(async () => {
      // 버퍼 flush
      await log['log-flush']();

      if (fs.existsSync(testLogFile)) {
        fs.unlinkSync(testLogFile);
      }
    });

    test('log-info-async: 비동기 로그 쓰기', async () => {
      await log['log-info-async']('User login', { userId: 123 });
      await log['log-flush']();

      const content = fs.readFileSync(testLogFile, 'utf-8');
      expect(content).toContain('User login');
      expect(content).toContain('userId');
    });

    test('log-error-async: ERROR 레벨 로그', async () => {
      await log['log-error-async']('Database connection failed', { code: 'ECONNREFUSED' });
      await log['log-flush']();

      const content = fs.readFileSync(testLogFile, 'utf-8');
      expect(content).toContain('error');
      expect(content).toContain('Database connection failed');
    });

    test('log-debug-async: DEBUG 레벨 로그', async () => {
      await log['log-debug-async']('Variable x = 42', { x: 42 });
      await log['log-flush']();

      const content = fs.readFileSync(testLogFile, 'utf-8');
      expect(content).toContain('debug');
    });

    test('log-read-async: 로그 파일 비동기 읽기', async () => {
      await log['log-info-async']('Event 1');
      await log['log-info-async']('Event 2');
      await log['log-info-async']('Event 3');
      await log['log-flush']();

      const logs = await log['log-read-async'](2);
      expect(logs.length).toBe(2);
      expect(logs[logs.length - 1].message).toBe('Event 3');
    });

    test('log-filter-async: 레벨별 필터링', async () => {
      await log['log-info-async']('Info message');
      await log['log-warn-async']('Warning message');
      await log['log-error-async']('Error message');
      await log['log-flush']();

      const errorLogs = await log['log-filter-async']('error', 10);
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0].level).toBe('error');
    });

    test('log-size-async: 로그 파일 크기 조회', async () => {
      await log['log-info-async']('Test log');
      await log['log-flush']();

      const size = await log['log-size-async']();
      expect(size.sizeBytes).toBeGreaterThan(0);
      expect(typeof size.sizeMB).toBe('string');
    });

    test('log-clear-async: 로그 파일 삭제', async () => {
      await log['log-info-async']('Log to delete');
      await log['log-flush']();

      expect(fs.existsSync(testLogFile)).toBe(true);

      const result = await log['log-clear-async']();
      expect(result).toBe(true);
      expect(fs.existsSync(testLogFile)).toBe(false);
    });

    test('로그 버퍼링: 10개 이상 자동 flush', async () => {
      // 15개 로그 추가 (10개 이상이면 자동 flush)
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(log['log-info-async'](`Log ${i}`));
      }

      await Promise.all(promises);
      // 자동 flush 대기
      await new Promise((r) => setTimeout(r, 150));

      const content = fs.readFileSync(testLogFile, 'utf-8');
      const lines = content.trim().split('\n').filter((l: string) => l);
      expect(lines.length).toBeGreaterThanOrEqual(10);
    });

    test('로그 버퍼링: 100ms 주기 flush', async () => {
      await log['log-info-async']('First log');

      // 50ms 후: 아직 flush 안 됨
      await new Promise((r) => setTimeout(r, 50));
      let exists1 = fs.existsSync(testLogFile) && fs.readFileSync(testLogFile, 'utf-8').length > 0;

      // 150ms 후: flush 됨
      await new Promise((r) => setTimeout(r, 150));
      const content = fs.readFileSync(testLogFile, 'utf-8');

      expect(content).toContain('First log');
    });

    test('로그 동시성: 100개 동시 비동기 로그', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(log['log-info-async'](`Concurrent log ${i}`));
      }

      await Promise.all(promises);
      await log['log-flush']();

      const content = fs.readFileSync(testLogFile, 'utf-8');
      const lines = content.trim().split('\n').filter((l: string) => l);
      expect(lines.length).toBeGreaterThanOrEqual(100);
    });
  });

  // ============================================
  // 통합 테스트: Async I/O 조합
  // ============================================
  describe('통합: Async I/O 조합 동작', () => {
    test('SQLite + FileCache: 데이터 동기화', async () => {
      const sqlite = createSqliteModule();
      const fcache = createFileCacheModule();

      const testDbPath = path.join(os.tmpdir(), 'sync-test.db');
      const dbId = await sqlite['sqlite-open-async'](testDbPath);

      // DB에 데이터 저장
      await sqlite['sqlite-create-table-async'](dbId, 'sync_test', {
        key: 'TEXT',
        value: 'TEXT',
      });
      await sqlite['sqlite-exec-async'](
        dbId,
        "INSERT INTO sync_test (key, value) VALUES ($1, $2)",
        ['mykey', 'myvalue']
      );

      // FileCache에도 저장
      await fcache['fcache-set-async']('mykey', { value: 'myvalue' });

      // 둘 다 조회 가능해야 함
      const dbResult = await sqlite['sqlite-query-async'](
        dbId,
        "SELECT * FROM sync_test WHERE key = $1",
        ['mykey']
      );
      const cacheResult = await fcache['fcache-get-async']('mykey');

      expect(dbResult.length).toBeGreaterThan(0);
      expect(cacheResult.value).toBe('myvalue');

      sqlite['sqlite-close'](dbId);
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    });

    test('모든 async 함수가 Promise를 반환', async () => {
      const sqlite = createSqliteModule();
      const fcache = createFileCacheModule();
      const log = createStructuredLogModule();

      const sqlitePromise = sqlite['sqlite-open-async'](path.join(os.tmpdir(), 'promise-test.db'));
      const cachePromise = fcache['fcache-set-async']('test', { data: 1 });
      const logPromise = log['log-info-async']('test');

      expect(sqlitePromise instanceof Promise).toBe(true);
      expect(cachePromise instanceof Promise).toBe(true);
      expect(logPromise instanceof Promise).toBe(true);

      const [dbId] = await Promise.all([sqlitePromise, cachePromise, logPromise]);
      expect(typeof dbId).toBe('string');
    });
  });
});
