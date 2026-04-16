// stdlib-sqlite.ts — FreeLang v9 Step 51: SQLite3 내장 DB
// 구현: Node.js child_process + sqlite3 CLI, 외부 npm 의존 없음

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type CallFn = (name: string, args: any[]) => any;

const sqliteConnections = new Map<string, { dbPath: string; connected: boolean }>();

const sqliteModule = {
  // Step 51: SQLite 연결 열기
  "sqlite-open": (dbPath: string): string => {
    const id = `sqlite_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fullPath = path.resolve(dbPath);

    try {
      // DB 파일 디렉토리 생성
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // sqlite3 CLI로 테이블 생성 시도 (검증)
      execSync(`sqlite3 "${fullPath}" ".tables"`, { stdio: 'pipe' });

      sqliteConnections.set(id, {
        dbPath: fullPath,
        connected: true,
      });
      return id;
    } catch (err) {
      return `error_${id}`;
    }
  },

  // Step 51: SQLite 쿼리 실행
  "sqlite-query": (dbId: string, sql: string, params: any[] = []): any => {
    const conn = sqliteConnections.get(dbId);
    if (!conn) return { error: "Connection not found" };

    try {
      // 파라미터 바인딩: $1, $2, ... → 실제 값으로 치환
      let boundSql = sql;
      params.forEach((param, i) => {
        const placeholder = `$${i + 1}`;
        const value = typeof param === 'string'
          ? `'${param.replace(/'/g, "''")}'`
          : param === null
          ? 'NULL'
          : String(param);
        boundSql = boundSql.replace(new RegExp(`\\${placeholder}`, 'g'), value);
      });

      // JSON 출력 포맷으로 실행
      const result = execSync(
        `sqlite3 -json "${conn.dbPath}" "${boundSql.replace(/"/g, '\\"')}"`,
        { stdio: 'pipe', encoding: 'utf-8' }
      );

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
      let boundSql = sql;
      params.forEach((param, i) => {
        const placeholder = `$${i + 1}`;
        const value = typeof param === 'string'
          ? `'${param.replace(/'/g, "''")}'`
          : param === null
          ? 'NULL'
          : String(param);
        boundSql = boundSql.replace(new RegExp(`\\${placeholder}`, 'g'), value);
      });

      execSync(
        `sqlite3 "${conn.dbPath}" "${boundSql.replace(/"/g, '\\"')}"`,
        { stdio: 'pipe' }
      );

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
      const cols = Object.entries(schema)
        .map(([name, type]) => `${name} ${type}`)
        .join(', ');
      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (id INTEGER PRIMARY KEY, ${cols})`;

      execSync(`sqlite3 "${conn.dbPath}" "${sql.replace(/"/g, '\\"')}"`, {
        stdio: 'pipe',
      });

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
      execSync(`sqlite3 "${conn.dbPath}" "BEGIN TRANSACTION"`, { stdio: 'pipe' });
      const result = callFn ? callFn(callback, [dbId]) : null;
      execSync(`sqlite3 "${conn.dbPath}" "COMMIT"`, { stdio: 'pipe' });
      return result;
    } catch (err: any) {
      try {
        execSync(`sqlite3 "${conn.dbPath}" "ROLLBACK"`, { stdio: 'pipe' });
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

export function createSqliteModule(): Record<string, any> {
  return sqliteModule;
}
