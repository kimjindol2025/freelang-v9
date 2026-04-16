// stdlib-sqlite.ts — FreeLang v9 Step 51: SQLite3 내장 DB
// 구현: Node.js child_process + sqlite3 CLI, 외부 npm 의존 없음
// v10.1: 비동기 I/O 지원 (spawn → Promise)

import { execSync, spawnSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type CallFn = (name: string, args: any[]) => any;

const sqliteConnections = new Map<string, { dbPath: string; connected: boolean }>();

// ✅ v10.1 Phase 2.1: SQLite 연결 풀 (동시성 강화)
class SqlitePool {
  private activeRequests = 0;
  private maxConcurrent: number;
  private waitQueue: Array<() => Promise<void>> = [];

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 현재 active requests가 maxConcurrent에 도달하면 대기
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise((resolve) => {
        this.waitQueue.push(resolve as any);
        setTimeout(() => {}, 10); // 10ms 간격 대기
      });
    }

    this.activeRequests++;
    try {
      return await fn();
    } finally {
      this.activeRequests--;

      // 대기 중인 요청이 있으면 깨우기
      if (this.waitQueue.length > 0) {
        const resume = this.waitQueue.shift();
        if (resume) resume();
      }
    }
  }

  getStats(): { active: number; maxConcurrent: number; waiting: number } {
    return {
      active: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
      waiting: this.waitQueue.length,
    };
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }
}

// 글로벌 연결 풀
const sqlitePool = new SqlitePool(5);

// ✅ Step 1: spawnSync 래퍼 (쉘 인젝션 방지, 동기 호환)
function sqliteRun(dbPath: string, sqlInput: string, json = false): string {
  const args = json ? ['-json', dbPath] : [dbPath];
  const result = spawnSync('sqlite3', args, {
    input: sqlInput,
    encoding: 'utf-8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || 'SQLite error');
  return result.stdout || '';
}

// ✅ v10.1 Phase 1.1: async 버전 (논블로킹 spawn)
function sqliteRunAsync(dbPath: string, sqlInput: string, json = false, timeout = 10000): Promise<string> {
  // ✅ v10.1 Phase 2.1: 연결 풀을 통한 실행
  return sqlitePool.execute(() => new Promise<string>((resolve, reject) => {
    const args = json ? ['-json', dbPath] : [dbPath];
    const proc = spawn('sqlite3', args);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // 타이머 설정
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      reject(new Error(`SQLite query timeout after ${timeout}ms`));
    }, timeout);

    proc.stdin.write(sqlInput);
    proc.stdin.end();

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0) {
        reject(new Error(stderr || 'SQLite error'));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  }));
}

// ✅ Step 3: 입력 검증
function validateTableName(name: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
}

function validateDbPath(dbPath: string): string {
  const resolved = path.resolve(dbPath);
  const cwd = process.cwd();
  const home = os.homedir();
  if (!resolved.startsWith(cwd) && !resolved.startsWith(home)) {
    throw new Error(`Path traversal detected: ${dbPath}`);
  }
  return resolved;
}

// ✅ Step 2: 파라미터 바인딩 (SQL 인젝션 방지)
function buildSqlWithParams(sql: string, params: any[]): string {
  const paramLines = params.map((p, i) => {
    if (p === null) return `.param set $${i + 1} NULL`;
    if (typeof p === 'number') return `.param set $${i + 1} ${p}`;

    // 문자열: 완전한 escape
    const escaped = String(p)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/\x00/g, '')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
    return `.param set $${i + 1} '${escaped}'`;
  });
  return [...paramLines, sql].join('\n');
}

const sqliteModule = {
  // Step 51: SQLite 연결 열기
  "sqlite-open": (dbPath: string): string => {
    const id = `sqlite_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const fullPath = validateDbPath(dbPath);

      // DB 파일 디렉토리 생성
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // ✅ spawnSync로 변경 (쉘 인젝션 방지)
      sqliteRun(fullPath, '.tables');

      sqliteConnections.set(id, {
        dbPath: fullPath,
        connected: true,
      });
      return id;
    } catch (err: any) {
      return `error_${id}`;
    }
  },

  // Step 51: SQLite 쿼리 실행
  "sqlite-query": (dbId: string, sql: string, params: any[] = []): any => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return { error: "Connection not found" };

    try {
      // ✅ Step 2: 파라미터 바인딩 (SQL 인젝션 방지)
      const fullSql = buildSqlWithParams(sql, params);

      // ✅ Step 1: spawnSync로 변경 (쉘 인젝션 방지)
      const result = sqliteRun(conn.dbPath, fullSql, true);

      return result ? JSON.parse(result) : [];
    } catch (err: any) {
      return { error: err.message };
    }
  },

  // Step 51: SQLite 실행 (INSERT/UPDATE/DELETE)
  "sqlite-exec": (dbId: string, sql: string, params: any[] = []): any => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return { error: "Connection not found" };

    try {
      // ✅ Step 2: 파라미터 바인딩 (SQL 인젝션 방지)
      const fullSql = buildSqlWithParams(sql, params);

      // ✅ Step 1: spawnSync로 변경 (쉘 인젝션 방지)
      sqliteRun(conn.dbPath, fullSql);

      return { ok: true, changes: 1 };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  // Step 51: 테이블 생성
  "sqlite-create-table": (
    dbId: string,
    tableName: string,
    schema: any // { name: 'TEXT', age: 'INTEGER', ... }
  ): boolean => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return false;

    try {
      // ✅ Step 3: 테이블명 검증
      validateTableName(tableName);

      const cols = Object.entries(schema)
        .map(([name, type]) => {
          validateTableName(name); // 컬럼명도 검증
          return `${name} ${type}`;
        })
        .join(', ');
      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (id INTEGER PRIMARY KEY, ${cols})`;

      // ✅ Step 1: spawnSync로 변경 (쉘 인젝션 방지)
      sqliteRun(conn.dbPath, sql);

      return true;
    } catch (err) {
      return false;
    }
  },

  // Step 51: 트랜잭션
  "sqlite-transaction": (dbId: string, callback: string, callFn?: CallFn): any => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return { error: "Connection not found" };

    try {
      // ✅ Step 1: spawnSync로 변경 (쉘 인젝션 방지)
      sqliteRun(conn.dbPath, 'BEGIN TRANSACTION');
      const result = callFn ? callFn(callback, [dbId]) : null;
      sqliteRun(conn.dbPath, 'COMMIT');
      return result;
    } catch (err: any) {
      try {
        sqliteRun(conn.dbPath, 'ROLLBACK');
      } catch {}
      return { error: err.message };
    }
  },

  // Step 51: 연결 종료
  "sqlite-close": (dbId: string): boolean => {
    return sqliteConnections.delete(dbId);
  },

  // Step 51: DB 파일 삭제
  "sqlite-delete-db": (dbPath: string): boolean => {
    try {
      const fullPath = path.resolve(dbPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // ✅ v10.1 Phase 1.1: Async 버전 (논블로킹)
  "sqlite-open-async": async (dbPath: string): Promise<string> => {
    const id = `sqlite_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const fullPath = validateDbPath(dbPath);

      // DB 파일 디렉토리 생성
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // async로 변경
      await sqliteRunAsync(fullPath, '.tables');

      sqliteConnections.set(id, {
        dbPath: fullPath,
        connected: true,
      });
      return id;
    } catch (err: any) {
      return `error_${id}`;
    }
  },

  "sqlite-query-async": async (dbId: string, sql: string, params: any[] = []): Promise<any> => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return { error: "Connection not found" };

    try {
      const fullSql = buildSqlWithParams(sql, params);
      const result = await sqliteRunAsync(conn.dbPath, fullSql, true);
      return result ? JSON.parse(result) : [];
    } catch (err: any) {
      return { error: err.message };
    }
  },

  "sqlite-exec-async": async (dbId: string, sql: string, params: any[] = []): Promise<any> => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return { error: "Connection not found" };

    try {
      const fullSql = buildSqlWithParams(sql, params);
      await sqliteRunAsync(conn.dbPath, fullSql);
      return { ok: true, changes: 1 };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  "sqlite-create-table-async": async (
    dbId: string,
    tableName: string,
    schema: any
  ): Promise<boolean> => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return false;

    try {
      validateTableName(tableName);

      const cols = Object.entries(schema)
        .map(([name, type]) => {
          validateTableName(name);
          return `${name} ${type}`;
        })
        .join(', ');
      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (id INTEGER PRIMARY KEY, ${cols})`;

      await sqliteRunAsync(conn.dbPath, sql);
      return true;
    } catch (err) {
      return false;
    }
  },

  "sqlite-transaction-async": async (dbId: string, callback: string, callFn?: CallFn): Promise<any> => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return { error: "Connection not found" };

    try {
      await sqliteRunAsync(conn.dbPath, 'BEGIN TRANSACTION');
      const result = callFn ? callFn(callback, [dbId]) : null;
      await sqliteRunAsync(conn.dbPath, 'COMMIT');
      return result;
    } catch (err: any) {
      try {
        await sqliteRunAsync(conn.dbPath, 'ROLLBACK');
      } catch {}
      return { error: err.message };
    }
  },

  // ✅ v10.1 Phase 2.1: 연결 풀 통계
  "sqlite-pool-stats": (): any => {
    return sqlitePool.getStats();
  },

  "sqlite-pool-set-max": (max: number): void => {
    sqlitePool.setMaxConcurrent(max);
  },
};

// ✅ Step 8: callFn 콜백 주입
export function createSqliteModule(callFn?: CallFn, callVal?: CallFn): Record<string, any> {
  return sqliteModule;
}
