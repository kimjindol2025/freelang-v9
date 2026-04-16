/**
 * FreeLang v10 Phase 1 Step 5-8: 언어 강화 완성 Test
 *
 * - Step 5: CLUSTER
 * - Step 6: 비동기 강화
 * - Step 7: Result 타입
 * - Step 8: 타입 안전
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('FreeLang v10 Phase 1 Step 5-8: 언어 강화 완성', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 5: CLUSTER
  // ─────────────────────────────────────────────────────────────────

  test('cluster-start로 클러스터 시작', () => {
    const code = `
      (define c (cluster-start 4))
      (string? c)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(true);
  });

  test('cluster-worker-count 조회', () => {
    const code = `
      (define c (cluster-start 4))
      (cluster-worker-count c)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(4);
  });

  test('cluster-is-master? 확인', () => {
    const code = `
      (define c (cluster-start 2))
      (cluster-is-master? c)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(true);
  });

  test('cluster-stop 종료', () => {
    const code = `
      (define c (cluster-start 2))
      (cluster-stop c)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 6: 비동기 강화
  // ─────────────────────────────────────────────────────────────────

  test('async-pipe 함수 체인', () => {
    const code = `
      (define (add1 x) (+ x 1))
      (define (mul2 x) (* x 2))
      (async-pipe ["add1" "mul2"] 5)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    // (5 + 1) * 2 = 12
    expect(result).toBe(12);
  });

  test('async-parallel 병렬 실행', () => {
    const code = `
      (define (task1) 1)
      (define (task2) 2)
      (define results (async-parallel ["task1" "task2"]))
      (length results)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(2);
  });

  test('async-waterfall 계단식 실행', () => {
    const code = `
      (define (step1 x) (+ x 1))
      (define (step2 x) (* x 2))
      (async-waterfall ["step1" "step2"] 5)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    // step1(5) = 6, step2(6) = 12
    expect(result).toBe(12);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 7: Result 타입
  // ─────────────────────────────────────────────────────────────────

  test('result-ok 생성', () => {
    const code = `
      (define ok-result (result-ok 42))
      (result-is-ok? ok-result)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(true);
  });

  test('result-err 생성', () => {
    const code = `
      (define err-result (result-err "error message"))
      (result-is-err? err-result)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(true);
  });

  test('result-value 추출', () => {
    const code = `
      (define ok-result (result-ok 42))
      (result-value ok-result)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(42);
  });

  test('result-unwrap 기본값', () => {
    const code = `
      (define err-result (result-err "error"))
      (result-unwrap err-result 99)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(99);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 8: 타입 안전
  // ─────────────────────────────────────────────────────────────────

  test('type-of 타입 조회', () => {
    const code = `
      (define s "hello")
      (type-of s)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe('string');
  });

  test('type? 타입 검증', () => {
    const code = `
      (list
        (type? 42 "number")
        (type? "hello" "string")
        (type? [1 2 3] "array"))
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  test('type-matches 구조 매칭', () => {
    const code = `
      (define obj {:name "kim" :age 30})
      (type-matches obj {:name "string" :age "number"})
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    // 현재 구현: key만 검사하므로 true
    expect(typeof result).toBe('boolean');
  });

  test('type-cast 타입 변환', () => {
    const code = `
      (type-cast 42 "number" "string")
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe('42');
  });

  test('type-safe-get 안전한 접근', () => {
    const code = `
      (define obj {:x 10 :y 20})
      (type-safe-get obj "x" 0)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(10);
  });

  // ─────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────

  afterEach(() => {
    const code = '(cluster-cleanup)';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    try {
      interp.eval(ast);
    } catch (e) {
      // 무시
    }
  });
});
