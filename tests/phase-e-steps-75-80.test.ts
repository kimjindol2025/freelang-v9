/**
 * FreeLang v10 Phase E (Step 75-80): AI-Native 완성 Test
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('Phase E (Step 75-80): AI-Native 완성', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 75: CODE-GEN AI 코드 생성
  // ─────────────────────────────────────────────────────────────────

  test('Step 75: codegen', () => {
    const code = `
      (string? (codegen "Create a function that adds 10 to input"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 75: codegen-validate', () => {
    const code = `
      (define generated-code "(define f (fn [x] (+ x 10)))")
      (map? (codegen-validate generated-code))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 76: SELF-TEST 자동 테스트 생성
  // ─────────────────────────────────────────────────────────────────

  test('Step 76: self-test-generate', () => {
    const code = `
      (define code "(define add (fn [a b] (+ a b)))")
      (array? (self-test-generate code 3))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 76: self-test-run', () => {
    const code = `
      (define code "(define mul (fn [a b] (* a b)))")
      (define tests ["(assert-eq (mul 2 3) 6)"])
      (map? (self-test-run code tests))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 77: 에이전트 실도구 연동
  // ─────────────────────────────────────────────────────────────────

  test('Step 77: agent-tools', () => {
    const code = `
      (array? (agent-tools))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 77: agent-run', () => {
    const code = `
      (define agent-result (agent-run "Find user with ID 123" ["sqlite-query"] 5))
      (map? agent-result)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 78: 문서 자동 생성
  // ─────────────────────────────────────────────────────────────────

  test('Step 78: doc-generate', () => {
    const code = `
      (string? (doc-generate "mymodule.fl"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 79: 벤치마크 & 성능
  // ─────────────────────────────────────────────────────────────────

  test('Step 79: bench', () => {
    const code = `
      (map? (bench "quick-sort" "sort_fn" 100))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 79: bench-compare', () => {
    const code = `
      (define b1 {:name "sort-a" :avgTimeMs 1.2})
      (define b2 {:name "sort-b" :avgTimeMs 2.5})
      (map? (bench-compare [b1 b2]))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 80: CLI 통합
  // ─────────────────────────────────────────────────────────────────

  test('Step 80: cli-help', () => {
    const code = `
      (string? (cli-help))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 80: version', () => {
    const code = `
      (string? (version))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // 통합 시나리오: AI 에이전트 전체 플로우
  // ─────────────────────────────────────────────────────────────────

  test('Full AI Pipeline', () => {
    const code = `
      (define goal "Create a fast sorting function")
      (define generated (codegen goal {:language "fl"}))
      (define validated (codegen-validate generated))
      (and (map? validated) (string? generated))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });
});
