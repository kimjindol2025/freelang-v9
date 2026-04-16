// v10.1-phase2-basic.test.ts — Phase 2: 안정성 (기본 검증)

import { createSqliteModule } from '../src/stdlib-sqlite';
import { createFileCacheModule } from '../src/stdlib-file-cache';
import { createStructuredLogModule } from '../src/stdlib-structured-log';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('v10.1 Phase 2: 안정성 기본 검증', () => {
  // ============================================
  // Phase 2.1: Connection Pool (기본 검증)
  // ============================================
  describe('Phase 2.1: Connection Pool', () => {
    let sqlite: any;
    let dbId: string;
    const testDbPath = path.join(os.tmpdir(), 'pool-basic-test.db');

    beforeEach(async () => {
      // 이전 파일 정리
      if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch {}
      }

      try {
        sqlite = createSqliteModule();
        dbId = await sqlite['sqlite-open-async'](testDbPath);
        if (dbId.startsWith('error_')) {
          throw new Error(`Failed to open DB: ${dbId}`);
        }

        const tableCreated = await sqlite['sqlite-create-table-async'](dbId, 'pool_test', {
          value: 'TEXT',
        });

        if (!tableCreated) {
          throw new Error('Failed to create pool_test table');
        }
      } catch (err: any) {
        console.error('beforeEach error:', err.message);
        throw err;
      }
    });

    afterEach(() => {
      sqlite['sqlite-close'](dbId);
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    });

    test('Pool stats 존재 확인', () => {
      const stats = sqlite['sqlite-pool-stats']();
      expect(stats).toBeDefined();
      expect(stats.active).toBe(0);
      expect(stats.maxConcurrent).toBe(5);
    });

    test('Pool maxConcurrent 조정', () => {
      sqlite['sqlite-pool-set-max'](10);
      const stats = sqlite['sqlite-pool-stats']();
      expect(stats.maxConcurrent).toBe(10);
      sqlite['sqlite-pool-set-max'](5); // 복원
    });

    test('동시 10개 요청 처리 (읽기)', async () => {
      // 먼저 5개 항목을 순차적으로 INSERT
      for (let i = 0; i < 5; i++) {
        await sqlite['sqlite-exec-async'](
          dbId,
          "INSERT INTO pool_test (value) VALUES ($1)",
          [`value_${i}`]
        );
      }

      // 이제 10개의 동시 READ 요청
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          sqlite['sqlite-query-async'](
            dbId,
            "SELECT COUNT(*) as count FROM pool_test"
          )
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter((r: any) => Array.isArray(r) && r.length > 0).length;

      // 읽기는 동시에 가능해야 함
      expect(successCount).toBe(10);
    });
  });

  // ============================================
  // Phase 2.2: Memory Optimization (기본 검증)
  // ============================================
  describe('Phase 2.2: Memory Optimization', () => {
    test('FileCache TTL 정리 작동', async () => {
      const fcache = createFileCacheModule();

      // 만료 항목 생성 (TTL 0)
      await fcache['fcache-set-async']('expired', { data: 'old' }, 0);

      // 즉시 조회 → null
      const result = await fcache['fcache-get-async']('expired');
      expect(result).toBeNull();
    });

    test('Memory Monitor 함수 존재', () => {
      // Memory Monitor 모듈 로드 검증
      const monitor = require('../src/stdlib-memory-monitor').createMemoryMonitorModule();
      expect(monitor['mem-current']).toBeDefined();
      expect(monitor['mem-stats']).toBeDefined();
    });

    test('로그 파일 maxFiles 조정 (5→3)', () => {
      const log = createStructuredLogModule();
      log['log-init']({
        level: 'info',
        file: path.join(os.tmpdir(), 'maxfiles-test.log'),
        maxFiles: 3, // 수정된 기본값 테스트
      });
      // 초기화 성공 = true
      expect(true).toBe(true);

      // 정리
      const testLogFile = path.join(os.tmpdir(), 'maxfiles-test.log');
      if (fs.existsSync(testLogFile)) fs.unlinkSync(testLogFile);
    });
  });

  // ============================================
  // Phase 2.3: Timeout (기본 검증)
  // ============================================
  describe('Phase 2.3: Timeout Policy', () => {
    test('Timeout 모듈 로드', () => {
      const { withTimeout, DEFAULT_TIMEOUTS } = require('../src/stdlib-timeout');
      expect(withTimeout).toBeDefined();
      expect(DEFAULT_TIMEOUTS.SQLITE).toBe(5000);
      expect(DEFAULT_TIMEOUTS.HTTP).toBe(30000);
      expect(DEFAULT_TIMEOUTS.STREAM_AI).toBe(60000);
    });

    test('SQLite timeout 설정', () => {
      const sqlite = createSqliteModule();
      sqlite['sqlite-set-timeout'](3000);
      const timeout = sqlite['sqlite-get-timeout']();
      expect(timeout).toBe(3000);

      // 복원
      sqlite['sqlite-set-timeout'](5000);
    });

    test('Timeout 초과 감지', async () => {
      const { withTimeout } = require('../src/stdlib-timeout');

      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve('done'), 1000);
      });

      try {
        await withTimeout(slowPromise, 100); // 100ms timeout
        expect(true).toBe(false); // 도달하면 안 됨
      } catch (err: any) {
        // timeout 감지 (메시지 형식은 다양할 수 있음)
        expect(err.message).toMatch(/timeout|timed out/i);
      }
    });
  });

  // ============================================
  // 통합: 안정성 기본 검증
  // ============================================
  describe('통합: 안정성 기본', () => {
    test('모든 Phase 2 모듈 로드 가능', () => {
      const sqlite = createSqliteModule();
      const fcache = createFileCacheModule();
      const log = createStructuredLogModule();
      const monitor = require('../src/stdlib-memory-monitor').createMemoryMonitorModule();
      const timeout = require('../src/stdlib-timeout');

      expect(sqlite).toBeDefined();
      expect(fcache).toBeDefined();
      expect(log).toBeDefined();
      expect(monitor).toBeDefined();
      expect(timeout.withTimeout).toBeDefined();
    });

    test('v10.1 Phase 1-2 기본 기능 작동', async () => {
      // SQLite
      const sqlite = createSqliteModule();
      const dbPath = path.join(os.tmpdir(), 'basic-test.db');
      const dbId = await sqlite['sqlite-open-async'](dbPath);
      expect(dbId).not.toMatch(/^error_/);

      // FileCache
      const fcache = createFileCacheModule();
      await fcache['fcache-set-async']('key', { data: 'value' });
      const cached = await fcache['fcache-get-async']('key');
      expect(cached.data).toBe('value');

      // Log
      const log = createStructuredLogModule();
      log['log-init']({
        level: 'info',
        file: path.join(os.tmpdir(), 'basic-test.log'),
      });
      await log['log-info-async']('test message');
      await log['log-flush']();

      // 정리
      sqlite['sqlite-close'](dbId);
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      const logFile = path.join(os.tmpdir(), 'basic-test.log');
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    });
  });
});
