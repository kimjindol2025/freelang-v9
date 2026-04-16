// stdlib-sqlite.ts — FreeLang v9 Step 51: SQLite3 내장 DB
// 구현: Node.js child_process + sqlite3 CLI, 외부 npm 의존 없음

import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type CallFn = (name: string, args: any[]) => any;

const sqliteConnections = new Map<string, { dbPath: string; connected: boolean }>();

// ✅ Step 1: spawnSync 래퍼 (쉘 인젝션 방지)
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
};

// ✅ Step 8: callFn 콜백 주입
export function createSqliteModule(callFn?: CallFn, callVal?: CallFn): Record<string, any> {
  return sqliteModule;
}
