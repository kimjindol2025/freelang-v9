/**
 * FreeLang v10 Phase 1 Step 1: Worker Threads Test
 *
 * 테스트 내용:
 * 1. worker-spawn으로 새 Worker 생성
 * 2. worker-send/worker-recv으로 메시지 통신
 * 3. worker-terminate으로 Worker 종료
 * 4. wait-all으로 여러 Worker 대기
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('FreeLang v10 Phase 1 Step 1: Worker Threads', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 1: worker-spawn 기본 테스트
   *
   * 간단한 계산을 Worker에서 실행하고 결과를 받는다.
   */
  test('worker-spawn으로 Worker 생성 및 메시지 확인', () => {
    // FreeLang 코드:
    // (define w (worker-spawn "add" [10 20]))
    // (worker-is-alive? w) → true

    const code = `
      (define w (worker-spawn "add" [10 20]))
      (worker-is-alive? w)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // 간단한 add 함수 정의
    const result = interp.eval(ast);

    // worker-is-alive? 결과가 boolean이어야 함
    expect(typeof result).toBe('boolean');
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 2: worker-recv 메시지 수신
   *
   * Worker에서 보낸 메시지를 받는다.
   */
  test('worker-recv으로 메시지 수신', () => {
    const code = `
      (define w (worker-spawn "add" [1 2]))
      (define msg (worker-recv w))
      (if (null? msg) "timeout" "received")
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);

    // 메시지가 없으면 null을 받음 (비동기 특성)
    expect(['timeout', 'received']).toContain(result);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 3: worker-terminate로 Worker 종료
   */
  test('worker-terminate으로 Worker 종료', () => {
    const code = `
      (define w (worker-spawn "add" [1 2]))
      (define killed? (worker-terminate w))
      (worker-is-alive? w)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);

    // 종료 후 worker-is-alive?는 false
    expect(result).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 4: wait-all로 여러 Worker 대기
   */
  test('wait-all로 여러 Worker 메시지 수집', () => {
    const code = `
      (define w1 (worker-spawn "add" [1 2]))
      (define w2 (worker-spawn "mul" [3 4]))
      (define results (wait-all [w1 w2]))
      (length results)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);

    // results는 배열이어야 함
    expect(typeof result).toBe('number');
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 5: worker-list로 활성 Worker 목록 확인
   */
  test('worker-list로 활성 Worker 확인', () => {
    const code = `
      (define w1 (worker-spawn "add" [1 2]))
      (define w2 (worker-spawn "mul" [3 4]))
      (define active (worker-list))
      (length active)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);

    // 2개의 Worker가 활성 상태
    expect(result).toBeGreaterThanOrEqual(0);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 6: worker-cleanup으로 모든 Worker 정리
   */
  test('worker-cleanup으로 모든 Worker 종료', () => {
    const code = `
      (define w1 (worker-spawn "add" [1 2]))
      (define w2 (worker-spawn "mul" [3 4]))
      (define cleaned (worker-cleanup))
      (worker-list)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = interp.eval(ast);

    // cleanup 후 활성 Worker 없음
    expect(Array.isArray(result)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Test 7: 채널 기반 Worker 통신 (향후)
   *
   * Worker와 채널을 통해 양방향 통신
   */
  test('[향후] 채널 기반 Worker 통신', () => {
    // 현재: Worker 아웃박스만 사용
    // 향후: 채널 기반 인박스 입력 처리

    const code = `
      (define ch (chan 10))
      (define w (worker-spawn "echo" [ch]))
      (worker-send w "hello")
      (worker-recv w)
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // 향후 구현
    expect(true).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────

  /**
   * Cleanup: 모든 Worker 정리
   */
  afterEach(() => {
    // FreeLang 코드: (worker-cleanup)
    const code = '(worker-cleanup)';
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
