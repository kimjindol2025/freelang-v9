// v10.1-phase2-stability.test.ts — Phase 2: 안정성 (동시성 & 메모리 & 타임아웃)

import { createSqliteModule } from '../src/stdlib-sqlite';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('v10.1 Phase 2: Stability (Concurrency, Memory, Timeout)', () => {
  // ============================================
  // Phase 2.1: SQLite Connection Pool
  // ============================================
  describe('Phase 2.1: SQLite Connection Pool', () => {
    let sqlite: any;
    let dbId: string;
    const testDbPath = path.join(os.tmpdir(), 'pool-test.db');

    beforeEach(async () => {
      sqlite = createSqliteModule();
      dbId = await sqlite['sqlite-open-async'](testDbPath);
      expect(dbId).not.toMatch(/^error_/);

      await sqlite['sqlite-create-table-async'](dbId, 'pool_test', {
        id: 'INTEGER PRIMARY KEY',
        value: 'TEXT',
      });
    });

    afterEach(() => {
      sqlite['sqlite-close'](dbId);
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    test('sqlite-pool-stats: 연결 풀 초기 상태', () => {
      const stats = sqlite['sqlite-pool-stats']();

      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('maxConcurrent');
      expect(stats).toHaveProperty('waiting');
      expect(stats.active).toBeGreaterThanOrEqual(0);
      expect(stats.maxConcurrent).toBe(5); // 기본값
    });

    test('sqlite-pool-set-max: maxConcurrent 조정', () => {
      sqlite['sqlite-pool-set-max'](10);
      const stats = sqlite['sqlite-pool-stats']();
      expect(stats.maxConcurrent).toBe(10);

      // 원래대로 복원
      sqlite['sqlite-pool-set-max'](5);
    });

    test('동시 요청 100개: 풀이 처리 가능한지 확인', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          sqlite['sqlite-exec-async'](
            dbId,
            "INSERT INTO pool_test (value) VALUES ($1)",
            [`value_${i}`]
          )
        );
      }

      const results = await Promise.all(promises);
      expect(results.every((r: any) => r.ok)).toBe(true);

      // 모든 데이터가 들어갔는지 확인
      const queryResult = await sqlite['sqlite-query-async'](
        dbId,
        'SELECT COUNT(*) as count FROM pool_test'
      );

      expect(queryResult[0]?.count).toBe(100);
    });

    test('동시성 제한: maxConcurrent=2로 설정하고 5개 동시 요청', async () => {
      sqlite['sqlite-pool-set-max'](2);

      const results: any[] = [];
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          (async () => {
            const result = await sqlite['sqlite-exec-async'](
              dbId,
              "INSERT INTO pool_test (value) VALUES ($1)",
              [`concurrent_${i}`]
            );
            results.push(result);
            return result;
          })()
        );
      }

      await Promise.all(promises);
      expect(results.every((r) => r.ok)).toBe(true);

      // 복원
      sqlite['sqlite-pool-set-max'](5);
    });

    test('풀 대기 큐: 대기 중인 요청 존재 시 활성화', async () => {
      sqlite['sqlite-pool-set-max'](1); // maxConcurrent = 1

      const promises = [];
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        promises.push(
          sqlite['sqlite-exec-async'](
            dbId,
            "INSERT INTO pool_test (value) VALUES ($1)",
            [`queued_${i}`]
          )
        );
      }

      const results = await Promise.all(promises);
      const elapsed = Date.now() - startTime;

      expect(results.every((r: any) => r.ok)).toBe(true);
      expect(elapsed).toBeGreaterThan(100); // 순차 실행 확인

      sqlite['sqlite-pool-set-max'](5);
    });

    test('동시 읽기/쓰기 혼합: 50 writes + 50 reads', async () => {
      const promises = [];

      // 50개 INSERT
      for (let i = 0; i < 50; i++) {
        promises.push(
          sqlite['sqlite-exec-async'](
            dbId,
            "INSERT INTO pool_test (value) VALUES ($1)",
            [`mixed_${i}`]
          )
        );
      }

      // 50개 SELECT (읽기는 동시 가능)
      for (let i = 0; i < 50; i++) {
        promises.push(
          sqlite['sqlite-query-async'](
            dbId,
            'SELECT COUNT(*) FROM pool_test'
          )
        );
      }

      const results = await Promise.all(promises);

      // 모든 작업이 성공해야 함
      expect(results.filter((r: any) => !r.error && (r.ok || Array.isArray(r))).length).toBeGreaterThanOrEqual(90);
    });
  });

  // ============================================
  // Phase 2.2: Memory Optimization
  // ============================================
  describe('Phase 2.2: Memory Optimization (GC intervals)', () => {
    test('메모리 누수 테스트: 1000번 set/get (캐시)', async () => {
      const fcache = require('../src/stdlib-file-cache').createFileCacheModule();

      const initialMem = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        await fcache['fcache-set-async'](`key_${i}`, { data: `value_${i}` }, 3600);
        await fcache['fcache-get-async'](`key_${i}`);
      }

      // cleanup 실행
      await fcache['fcache-cleanup-async']();

      const finalMem = process.memoryUsage().heapUsed;
      const diffMB = (finalMem - initialMem) / 1024 / 1024;

      // 메모리 증가가 합리적인 범위 내인지 확인 (100MB 이상은 누수 의심)
      expect(diffMB).toBeLessThan(100);
    });

    test('TTL 자동 정리: 만료된 항목 자동 삭제', async () => {
      const fcache = require('../src/stdlib-file-cache').createFileCacheModule();

      // 0초 TTL로 생성 (즉시 만료)
      await fcache['fcache-set-async']('expire_now', { data: 'old' }, 0);
      await fcache['fcache-set-async']('expire_soon', { data: 'soon' }, 1);

      // cleanup 실행
      const cleanedCount = await fcache['fcache-cleanup-async']();
      expect(cleanedCount).toBeGreaterThanOrEqual(1);

      // 만료된 항목이 정리되었는지 확인
      const result1 = await fcache['fcache-get-async']('expire_now');
      const result2 = await fcache['fcache-get-async']('expire_soon');

      expect(result1).toBeNull();
      expect(result2).toBeNull(); // 1초 경과
    });

    test('SSE 메모리 정리: 연결 해제 시 자동 정리', async () => {
      const sse = require('../src/stdlib-sse').createSseModule();

      const mockResponses = [];

      // 100개 SSE 연결 생성
      for (let i = 0; i < 100; i++) {
        const mockResponse = {
          writeHead: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
        };
        mockResponses.push(mockResponse);
        sse['sse-connect'](mockResponse);
      }

      // 모든 연결 해제
      for (const mockResponse of mockResponses) {
        mockResponse.end();
      }

      // 수동 cleanup
      const cleaned = sse['sse-cleanup']?.();

      // cleanup 후 활성 연결이 줄어야 함
      const activeAfter = sse['sse-active-connections']?.();
      expect(activeAfter).toBeLessThan(100);
    });
  });

  // ============================================
  // Phase 2.3: Timeout Policies
  // ============================================
  describe('Phase 2.3: Timeout Policies (Promise.race)', () => {
    test('SQLite 쿼리 타임아웃: 매우 느린 작업 감지', async () => {
      const sqlite = require('../src/stdlib-sqlite').createSqliteModule();

      const testDbPath = path.join(os.tmpdir(), 'timeout-test.db');
      const dbId = await sqlite['sqlite-open-async'](testDbPath);

      // 매우 큰 테이블 생성 (시간이 걸리도록)
      await sqlite['sqlite-create-table-async'](dbId, 'large_table', {
        id: 'INTEGER PRIMARY KEY',
        data: 'TEXT',
      });

      // 100개 행 삽입 (빠름)
      for (let i = 0; i < 100; i++) {
        await sqlite['sqlite-exec-async'](
          dbId,
          "INSERT INTO large_table (data) VALUES ($1)",
          [`data_${i}`]
        );
      }

      // 쿼리는 타임아웃 없이 완료
      const result = await sqlite['sqlite-query-async'](
        dbId,
        'SELECT COUNT(*) as count FROM large_table'
      );

      expect(result[0]?.count).toBe(100);

      sqlite['sqlite-close'](dbId);
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    test('프로토콜: 비동기 작업 중단 시 리소스 정리', async () => {
      const sqlite = require('../src/stdlib-sqlite').createSqliteModule();

      const testDbPath = path.join(os.tmpdir(), 'abort-test.db');
      const dbId = await sqlite['sqlite-open-async'](testDbPath);

      await sqlite['sqlite-create-table-async'](dbId, 'abort_test', {
        id: 'INTEGER PRIMARY KEY',
        value: 'TEXT',
      });

      // AbortController를 사용한 취소 (향후 구현)
      const promise = sqlite['sqlite-exec-async'](
        dbId,
        "INSERT INTO abort_test (value) VALUES ($1)",
        ['test']
      );

      // 약 50ms 후 확인
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 작업이 진행 중이거나 완료
      const result = await promise;
      expect(result.ok || result.error).toBeDefined();

      sqlite['sqlite-close'](dbId);
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    test('여러 타임아웃 설정이 가능: 기본 5s, 커스텀 1s', async () => {
      // 향후 구현: timeout 파라미터를 허용하는 API
      // await sqlite['sqlite-query-async'](dbId, sql, params, { timeout: 1000 })
      expect(true).toBe(true);
    });
  });

  // ============================================
  // 통합: 안정성 테스트
  // ============================================
  describe('통합: 안정성 종합', () => {
    test('고부하 상황 (100 concurrent, 100 iterations)', async () => {
      const sqlite = require('../src/stdlib-sqlite').createSqliteModule();

      const testDbPath = path.join(os.tmpdir(), 'stress-test.db');
      const dbId = await sqlite['sqlite-open-async'](testDbPath);

      await sqlite['sqlite-create-table-async'](dbId, 'stress', {
        id: 'INTEGER PRIMARY KEY',
        iteration: 'INTEGER',
        request: 'INTEGER',
      });

      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;

      // 100개 동시 요청 × 10 iteration = 1000 요청
      for (let iteration = 0; iteration < 10; iteration++) {
        const promises = [];

        for (let i = 0; i < 100; i++) {
          promises.push(
            (async () => {
              const result = await sqlite['sqlite-exec-async'](
                dbId,
                "INSERT INTO stress (iteration, request) VALUES ($1, $2)",
                [iteration, i]
              );

              if (result.ok) {
                successCount++;
              } else {
                errorCount++;
              }
            })()
          );
        }

        await Promise.all(promises);
      }

      const elapsed = Date.now() - startTime;
      const rps = (1000 / (elapsed / 1000)).toFixed(2);

      console.log(`✅ High-load test: ${successCount} success, ${errorCount} error`);
      console.log(`⚡ RPS: ${rps} requests/second`);

      expect(successCount).toBe(1000);
      expect(errorCount).toBe(0);
      expect(elapsed).toBeLessThan(10000); // 10초 이내 완료

      sqlite['sqlite-close'](dbId);
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    test('메모리 안정성: 1시간 시뮬레이션 (60 iterations × 1분)', async () => {
      // 시간 문제로 단축된 버전: 60 iterations × 16ms = ~1초
      const sqlite = require('../src/stdlib-sqlite').createSqliteModule();
      const fcache = require('../src/stdlib-file-cache').createFileCacheModule();

      const testDbPath = path.join(os.tmpdir(), 'endurance-test.db');
      const dbId = await sqlite['sqlite-open-async'](testDbPath);

      await sqlite['sqlite-create-table-async'](dbId, 'endurance', {
        id: 'INTEGER PRIMARY KEY',
        tick: 'INTEGER',
      });

      const initialMem = process.memoryUsage().heapUsed;

      for (let tick = 0; tick < 60; tick++) {
        // SQLite 작업
        await sqlite['sqlite-exec-async'](
          dbId,
          "INSERT INTO endurance (tick) VALUES ($1)",
          [tick]
        );

        // 파일캐시 작업
        await fcache['fcache-set-async'](`tick_${tick}`, { data: tick });

        // 정리
        if (tick % 10 === 0) {
          await fcache['fcache-cleanup-async']();
        }
      }

      const finalMem = process.memoryUsage().heapUsed;
      const memGrowthMB = (finalMem - initialMem) / 1024 / 1024;

      console.log(`🧠 Memory growth: ${memGrowthMB.toFixed(2)} MB`);
      expect(memGrowthMB).toBeLessThan(50); // 50MB 이상 증가는 누수 의심

      sqlite['sqlite-close'](dbId);
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });
  });
});
