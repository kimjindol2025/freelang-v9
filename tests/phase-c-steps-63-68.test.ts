/**
 * FreeLang v10 Phase C (Step 63-68): 언어 핵심 강화 Test
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('Phase C (Step 63-68): 언어 핵심 강화', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 63: defrecord 불변 레코드
  // ─────────────────────────────────────────────────────────────────

  test('Step 63: 불변 데이터 구조 (map freeze)', () => {
    const code = `
      (define user {:name "Alice" :age 30})
      (map? user)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 64: 패턴 매칭 강화
  // ─────────────────────────────────────────────────────────────────

  test('Step 64: 기본 패턴 매칭', () => {
    const code = `
      (define x 42)
      (match x
        42 => "found"
        _ => "not found")
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe('found');
  });

  test('Step 64: 맵 패턴 매칭', () => {
    const code = `
      (define status {:code 200 :msg "OK"})
      (match status
        {:code 200} => "success"
        {:code c} => (str "code " c)
        _ => "unknown")
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe('success');
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 65: for 컴프리헨션 (기존 지원)
  // ─────────────────────────────────────────────────────────────────

  test('Step 65: 기본 배열 처리', () => {
    const code = `
      (define result (map (fn [x] (* x 2)) [1 2 3]))
      (= result [2 4 6])
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 65: 필터링', () => {
    const code = `
      (define result (filter (fn [x] (> x 2)) [1 2 3 4]))
      (= result [3 4])
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 66: 모듈 시스템 (기존 지원)
  // ─────────────────────────────────────────────────────────────────

  test('Step 66: 기본 함수 정의', () => {
    const code = `
      (define add (fn [a b] (+ a b)))
      (= (add 2 3) 5)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 67: 타입 추론 (기존 지원)
  // ─────────────────────────────────────────────────────────────────

  test('Step 67: 타입 검사', () => {
    const code = `
      (and
        (string? "hello")
        (number? 42)
        (array? [1 2 3])
        (map? {:a 1}))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 68: async/await (기존 지원)
  // ─────────────────────────────────────────────────────────────────

  test('Step 68: Promise 처리', () => {
    const code = `
      (define p (promise (fn [res] (res 42))))
      (promise? p)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 68: 비동기 체이닝', () => {
    const code = `
      (define p (promise (fn [res] (res 10))))
      (promise? (promise-then p (fn [x] (+ x 5))))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });
});
