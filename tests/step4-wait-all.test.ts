/**
 * FreeLang v10 Phase 1 Step 4: WAIT-ALL Test
 *
 * 테스트 내용:
 * 1. wait-all Promise 배열 대기
 * 2. wait-race 첫 결과 대기
 * 3. wait-any 하나라도 완료 대기
 * 4. wait-all-settled 모든 정착 대기
 * 5. wait-filter 조건 필터링
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('FreeLang v10 Phase 1 Step 4: WAIT-ALL', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 1: wait-all 기본
   */
  test('wait-all은 Promise 배열 입력을 받음', () => {
    const code = `
      (define p1 (promise-resolve 1))
      (define p2 (promise-resolve 2))
      (define results (wait-all [p1 p2]))
      (length results)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(2);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 2: wait-race 첫 결과
   */
  test('wait-race는 첫 Promise 결과 반환', () => {
    const code = `
      (define p1 (promise-resolve 10))
      (define p2 (promise-resolve 20))
      (wait-race [p1 p2])
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 3: wait-any 하나라도 완료
   */
  test('wait-any는 [결과 인덱스] 반환', () => {
    const code = `
      (define p1 (promise-resolve 100))
      (define p2 (promise-resolve 200))
      (define any-result (wait-any [p1 p2]))
      (length any-result)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(2); // [결과, 인덱스]
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 4: wait-count 완료된 개수
   */
  test('wait-count는 완료된 Promise 개수 반환', () => {
    const code = `
      (define p1 (promise-resolve 1))
      (define p2 (promise-resolve 2))
      (define p3 (promise-resolve 3))
      (wait-count [p1 p2 p3])
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(3);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 5: wait-all-settled 모든 정착
   */
  test('wait-all-settled는 모든 Promise 상태 반환', () => {
    const code = `
      (define p1 (promise-resolve 1))
      (define p2 (promise-resolve 2))
      (define settled (wait-all-settled [p1 p2]))
      (length settled)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(2);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 6: wait-first-resolved 첫 성공
   */
  test('wait-first-resolved는 첫 성공 값 반환', () => {
    const code = `
      (define p1 (promise-resolve 42))
      (define p2 (promise-resolve 99))
      (wait-first-resolved [p1 p2])
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(42);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 7: wait-last-resolved 마지막 성공
   */
  test('wait-last-resolved는 마지막 성공 값 반환', () => {
    const code = `
      (define p1 (promise-resolve 10))
      (define p2 (promise-resolve 20))
      (define p3 (promise-resolve 30))
      (wait-last-resolved [p1 p2 p3])
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(30);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 8: wait-all-timeout 타임아웃
   */
  test('wait-all-timeout은 타임아웃 정보 반환', () => {
    const code = `
      (define p1 (promise-resolve 1))
      (define p2 (promise-resolve 2))
      (define timeout-result (wait-all-timeout [p1 p2] 5000))
      (string? timeout-result)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    // timeout-result는 맵 또는 배열
    expect(result).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 9: wait-pending-count 대기 개수
   */
  test('wait-pending-count는 대기 중인 Promise 개수 반환', () => {
    const code = `
      (define p1 (promise-resolve 1))
      (wait-pending-count [p1])
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(0); // 이미 완료됨
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 10: wait-each Promise 결과에 함수 적용
   */
  test('wait-each는 각 결과에 함수 적용', () => {
    const code = `
      (define p1 (promise-resolve 1))
      (define p2 (promise-resolve 2))
      (define doubled (wait-each [p1 p2] "double"))
      (length doubled)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // double 함수 정의
    interp.eval(new Parser(new Lexer('(define (double x) (* x 2))').tokenize()).parse());

    const result = interp.eval(ast);
    expect(result).toBe(2);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Cleanup
   */
  afterEach(() => {
    // 테스트별 정리
  });
});
