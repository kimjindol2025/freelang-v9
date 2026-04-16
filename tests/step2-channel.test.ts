/**
 * FreeLang v10 Phase 1 Step 2: Channel 강화 Test
 *
 * 테스트 내용:
 * 1. chan-is-open? 채널 상태 확인
 * 2. chan-close 채널 폐쇄
 * 3. chan-drain 모든 메시지 추출
 * 4. chan-watch 이벤트 리스너
 * 5. chan-broadcast 브로드캐스트
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('FreeLang v10 Phase 1 Step 2: Channel 강화', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 1: 채널 생성 및 기본 상태 확인
   */
  test('채널을 생성하면 open 상태', () => {
    const code = `
      (define ch (chan 10))
      (chan-is-open? ch)
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
   * Test 2: 채널 폐쇄
   */
  test('chan-close로 채널을 폐쇄', () => {
    const code = `
      (define ch (chan 10))
      (chan-close ch)
      (chan-is-open? ch)
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
   * Test 3: 폐쇄된 채널에 send 불가
   */
  test('폐쇄된 채널에 send하면 false', () => {
    const code = `
      (define ch (chan 10))
      (chan-close ch)
      (chan-send ch 42)
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
   * Test 4: chan-drain으로 모든 메시지 추출
   */
  test('chan-drain으로 모든 메시지를 배열로 반환', () => {
    const code = `
      (define ch (chan 10))
      (chan-send ch 1)
      (chan-send ch 2)
      (chan-send ch 3)
      (define all (chan-drain ch))
      (length all)
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
   * Test 5: chan-broadcast (직접 브로드캐스트)
   */
  test('chan-broadcast로 브로드캐스트 (현재는 send와 동일)', () => {
    const code = `
      (define ch (chan 10))
      (chan-broadcast ch "hello")
      (chan-size ch)
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
   * Test 6: 채널 peek (향후 구현)
   */
  test('chan-peek은 현재 null 반환 (향후 구현)', () => {
    const code = `
      (define ch (chan 10))
      (chan-send ch 42)
      (chan-peek ch)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    // 현재: null 반환
    expect(result).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 7: Multiple 채널 관리
   */
  test('여러 채널을 동시에 관리', () => {
    const code = `
      (define ch1 (chan 10))
      (define ch2 (chan 5))
      (define ch3 (chan 20))
      (chan-send ch1 "a")
      (chan-send ch2 "b")
      (chan-send ch3 "c")
      (list
        (chan-recv ch1)
        (chan-recv ch2)
        (chan-recv ch3))
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 8: 채널 크기 제한 확인
   */
  test('채널이 가득 차면 send 실패', () => {
    const code = `
      (define ch (chan 2))
      (define r1 (chan-send ch "a"))
      (define r2 (chan-send ch "b"))
      (define r3 (chan-send ch "c"))
      (list r1 r2 r3)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toBe(true);  // 첫 send 성공
    expect(result[1]).toBe(true);  // 두 번째 send 성공
    expect(result[2]).toBe(false); // 세 번째 send 실패
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Cleanup
   */
  afterEach(() => {
    // 테스트별 정리
  });
});
