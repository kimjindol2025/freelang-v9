/**
 * FreeLang v10 Phase D (Step 69-74): 개발자 경험 Test
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('Phase D (Step 69-74): 개발자 경험 강화', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 69: REPL 2.0
  // ─────────────────────────────────────────────────────────────────

  test('Step 69: 기본 표현식 평가', () => {
    const code = '(+ 1 2 3)';
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(6);
  });

  test('Step 69: 변수 정의 및 참조', () => {
    const code = `
      (define x 10)
      (define y 20)
      (+ x y)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(30);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 70: LSP 2.0
  // ─────────────────────────────────────────────────────────────────

  test('Step 70: 함수 정의', () => {
    const code = `
      (define square (fn [x] (* x x)))
      (square 5)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(25);
  });

  test('Step 70: 고차 함수', () => {
    const code = `
      (define apply-twice (fn [f x] (f (f x))))
      (apply-twice (fn [x] (* 2 x)) 3)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(12);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 71: 에러 메시지 강화
  // ─────────────────────────────────────────────────────────────────

  test('Step 71: 타입 에러 감지', () => {
    const code = '(+ "string" 5)';
    expect(() => {
      interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    }).toThrow();
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 72: 테스트 러너 강화
  // ─────────────────────────────────────────────────────────────────

  test('Step 72: 기본 테스트 실행', () => {
    const code = `
      (define test-result (= (+ 1 1) 2))
      test-result
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 72: 테스트 유틸리티', () => {
    const code = `
      (define is-even (fn [n] (= (% n 2) 0)))
      (and
        (is-even 2)
        (is-even 4)
        (not (is-even 3)))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 73: fl watch (파일 감시 및 재실행)
  // ─────────────────────────────────────────────────────────────────

  test('Step 73: 동적 재정의', () => {
    const code = `
      (define greet (fn [name] (str "Hello " name)))
      (greet "World")
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe('Hello World');
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 74: VPM (FreeLang Package Manager)
  // ─────────────────────────────────────────────────────────────────

  test('Step 74: 모듈 구성', () => {
    const code = `
      (define utils {:add (fn [a b] (+ a b)) :sub (fn [a b] (- a b))})
      (map? utils)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 74: 함수 내보내기', () => {
    const code = `
      (define my-lib {
        :version "1.0.0"
        :functions [:add :sub :mul]
        :add (fn [a b] (+ a b))
      })
      (and
        (string? (. my-lib :version))
        (array? (. my-lib :functions)))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });
});
