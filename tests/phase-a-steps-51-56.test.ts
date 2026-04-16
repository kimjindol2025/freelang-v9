/**
 * FreeLang v10 Phase A (Step 51-56): 실질적 기반 강화 Test
 * Step 51-56: SQLite, SSE, 파일캐시, 구조화로깅, OAuth2, WebSocket
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Phase A (Step 51-56): 실질적 기반 강화', () => {
  let interp: Interpreter;
  const testDbPath = path.join(os.tmpdir(), 'test-freelang.db');

  beforeEach(() => {
    interp = new Interpreter();
    // 각 테스트 전에 이전 DB 삭제
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    // 테스트 후 DB 정리
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 51: SQLite3 내장 DB
  // ─────────────────────────────────────────────────────────────────

  test('Step 51: sqlite-open', () => {
    const code = `(string? (sqlite-open "${testDbPath}"))`;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 51: sqlite-create-table', () => {
    const code = `
      (define db (sqlite-open "${testDbPath}"))
      (sqlite-create-table db "users" {:name "TEXT" :age "INTEGER"})
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 51: sqlite-exec (INSERT)', () => {
    const code = `
      (define db (sqlite-open "${testDbPath}"))
      (sqlite-create-table db "users" {:name "TEXT"})
      (define result (sqlite-exec db "INSERT INTO users (name) VALUES ($1)" ["Alice"]))
      (map? result)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 51: sqlite-query (SELECT)', () => {
    const code = `
      (define db (sqlite-open "${testDbPath}"))
      (sqlite-create-table db "users" {:name "TEXT"})
      (sqlite-exec db "INSERT INTO users (name) VALUES ($1)" ["Bob"])
      (array? (sqlite-query db "SELECT * FROM users"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 51: sqlite-close', () => {
    const code = `
      (define db (sqlite-open "${testDbPath}"))
      (sqlite-close db)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 52: HTTP SSE 스트리밍
  // ─────────────────────────────────────────────────────────────────

  test('Step 52: sse-connect', () => {
    const code = `
      (define mockResponse {:write (fn [x] true) :end (fn [] nil)})
      (string? (sse-connect mockResponse))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 52: sse-broadcast', () => {
    const code = `
      (define mockResponse {:write (fn [x] true) :end (fn [] nil)})
      (define conn (sse-connect mockResponse))
      (number? (sse-broadcast {:event "test" :data 42}))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 52: sse-active-connections', () => {
    const code = `
      (number? (sse-active-connections))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 53: 파일 기반 캐시 (TTL)
  // ─────────────────────────────────────────────────────────────────

  test('Step 53: fcache-set', () => {
    const code = `
      (fcache-set "user:1" {:name "Alice"} 3600)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 53: fcache-get', () => {
    const code = `
      (fcache-set "key1" "value1" 3600)
      (define retrieved (fcache-get "key1"))
      (string? retrieved)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 53: fcache-del', () => {
    const code = `
      (fcache-set "key2" "data" 3600)
      (fcache-del "key2")
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 53: fcache-stats', () => {
    const code = `
      (fcache-set "test" "data" 3600)
      (define stats (fcache-stats))
      (map? stats)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 53: fcache-cleanup', () => {
    const code = `
      (number? (fcache-cleanup))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 54: 구조화 로깅
  // ─────────────────────────────────────────────────────────────────

  test('Step 54: log-init', () => {
    const logFile = path.join(os.tmpdir(), 'test-app.log');
    const code = `
      (log-init {:level "info" :file "${logFile}"})
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
    // 정리
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
  });

  test('Step 54: log-info', () => {
    const code = `
      (log-info "Server started" {:port 43000})
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBeNull();
  });

  test('Step 54: log-structured', () => {
    const code = `
      (log-structured "warn" "High memory" {:usage 95})
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 55: OAuth2 토큰 교환
  // ─────────────────────────────────────────────────────────────────

  test('Step 55: oauth-register', () => {
    const code = `
      (oauth-register "github" "client_id" "client_secret")
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 55: oauth-exchange-code', () => {
    const code = `
      (oauth-register "github" "cid" "secret")
      (define token (oauth-exchange-code "github" "code123"))
      (map? token)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 55: oauth-user-info', () => {
    const code = `
      (define user (oauth-user-info "github" "token123"))
      (map? user)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 56: WebSocket 클라이언트 재연결
  // ─────────────────────────────────────────────────────────────────

  test('Step 56: wsc-state', () => {
    const code = `
      (string? (wsc-state "mock_conn_id"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 56: wsc-on-open-fn', () => {
    const code = `
      (null? (wsc-on-open-fn "on_open_handler"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });
});
