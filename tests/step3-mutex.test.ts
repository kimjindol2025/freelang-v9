/**
 * FreeLang v10 Phase 1 Step 3: MUTEX Test
 *
 * 테스트 내용:
 * 1. 뮤텍스 생성 및 잠금
 * 2. 세마포어 생성 및 획득/해제
 * 3. 읽기/쓰기 뮤텍스
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('FreeLang v10 Phase 1 Step 3: MUTEX', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 1: 뮤텍스 생성
   */
  test('mutex-create로 뮤텍스 생성', () => {
    const code = `
      (define m (mutex-create))
      (string? m)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 2: mutex-try-lock 성공
   */
  test('mutex-try-lock으로 잠금 시도', () => {
    const code = `
      (define m (mutex-create))
      (mutex-try-lock m)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 3: 잠금된 뮤텍스는 재획득 불가
   */
  test('이미 잠금된 뮤텍스는 try-lock 실패', () => {
    const code = `
      (define m (mutex-create))
      (mutex-try-lock m)
      (mutex-try-lock m)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    // 두 번째 시도는 실패
    expect(result).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 4: mutex-is-locked? 상태 확인
   */
  test('mutex-is-locked?로 잠금 상태 확인', () => {
    const code = `
      (define m (mutex-create))
      (define locked-before (mutex-is-locked? m))
      (mutex-try-lock m)
      (define locked-after (mutex-is-locked? m))
      (list locked-before locked-after)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toBe(false); // 락 전
    expect(result[1]).toBe(true);  // 락 후
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 5: mutex-unlock으로 해제
   */
  test('mutex-unlock으로 뮤텍스 해제', () => {
    const code = `
      (define m (mutex-create))
      (mutex-try-lock m)
      (mutex-unlock m)
      (mutex-is-locked? m)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 6: 세마포어 생성
   */
  test('semaphore-create로 세마포어 생성', () => {
    const code = `
      (define s (semaphore-create 3))
      (semaphore-available s)
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
   * Test 7: 세마포어 획득/해제
   */
  test('세마포어 acquire/release', () => {
    const code = `
      (define s (semaphore-create 2))
      (define a1 (semaphore-acquire s))
      (define avail1 (semaphore-available s))
      (define a2 (semaphore-acquire s))
      (define avail2 (semaphore-available s))
      (define a3 (semaphore-acquire s))
      (list a1 a2 a3 avail2)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toBe(true);   // 첫 acquire 성공
    expect(result[1]).toBe(true);   // 두 번째 acquire 성공
    expect(result[2]).toBe(false);  // 세 번째 acquire 실패
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 8: 세마포어 용률
   */
  test('semaphore-utilization 계산', () => {
    const code = `
      (define s (semaphore-create 4))
      (semaphore-acquire s)
      (semaphore-acquire s)
      (semaphore-utilization s)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    // 4개 중 2개 사용 → 0.5
    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(0.5, 1);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 9: 읽기/쓰기 뮤텍스 생성
   */
  test('rwmutex-create로 읽기/쓰기 뮤텍스 생성', () => {
    const code = `
      (define rw (rwmutex-create))
      (rwmutex-lock-read rw)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 10: 뮤텍스 정리
   */
  test('mutex-cleanup으로 모든 동기화 객체 정리', () => {
    const code = `
      (define m1 (mutex-create))
      (define m2 (mutex-create))
      (define s1 (semaphore-create 5))
      (mutex-cleanup)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Cleanup
   */
  afterEach(() => {
    const code = '(mutex-cleanup)';
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
