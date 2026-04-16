/**
 * FreeLang v10 Phase B (Step 57-62): AI 스트리밍 & 프롬프트 엔진 Test
 */

import { Interpreter } from '../src/interpreter';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('Phase B (Step 57-62): AI 스트리밍 & 프롬프트 엔진', () => {
  let interp: Interpreter;

  beforeEach(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 57: LLM 스트리밍
  // ─────────────────────────────────────────────────────────────────

  test('Step 57: stream-running?', () => {
    const code = '(boolean? (stream-running?))';
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 57: stream-cancel', () => {
    const code = '(stream-cancel "stream_123")';
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 58: defprompt 프롬프트 템플릿
  // ─────────────────────────────────────────────────────────────────

  test('Step 58: defprompt', () => {
    const code = `
      (defprompt "greet" ["name"] "You are helpful" "Hello {{name}}" "text")
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 58: prompt-get', () => {
    const code = `
      (defprompt "test" ["x"] "sys" "user {{x}}" "text")
      (map? (prompt-get "test"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 58: prompt-render', () => {
    const code = `
      (defprompt "greet" ["name"] "You are helpful" "Hello {{name}}" "text")
      (define rendered (prompt-render "greet" {:name "Alice"}))
      (map? rendered)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 58: prompts-list', () => {
    const code = `
      (defprompt "p1" [] "" "" "text")
      (defprompt "p2" [] "" "" "json")
      (array? (prompts-list))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 58: prompt-delete', () => {
    const code = `
      (defprompt "temp" [] "" "" "text")
      (prompt-delete "temp")
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 59: 벡터 임베딩
  // ─────────────────────────────────────────────────────────────────

  test('Step 59: embed-text', () => {
    const code = `
      (string? (embed-text "hello world" "local"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 59: embed-get', () => {
    const code = `
      (define id (embed-text "test data"))
      (map? (embed-get id))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 59: embed-batch', () => {
    const code = `
      (define ids (embed-batch ["text1" "text2" "text3"]))
      (array? ids)
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 59: embed-search', () => {
    const code = `
      (embed-text "apple fruit" "local")
      (embed-text "banana yellow" "local")
      (array? (embed-search "fruit"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 59: embed-stats', () => {
    const code = `
      (embed-text "sample")
      (map? (embed-stats))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 60: RAG-V2 청킹 & 검색
  // ─────────────────────────────────────────────────────────────────

  test('Step 60: rag-index-text', () => {
    const code = `
      (number? (rag-index-text "Lorem ipsum dolor sit amet" {}))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 60: rag-search', () => {
    const code = `
      (rag-index-text "This is a test document about ML")
      (array? (rag-search "machine learning"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 60: rag-stats', () => {
    const code = `
      (rag-index-text "sample data")
      (map? (rag-stats))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 60: rag-clear', () => {
    const code = `
      (rag-index-text "data")
      (number? (rag-clear))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 61: AI-TOOL Function Calling
  // ─────────────────────────────────────────────────────────────────

  test('Step 61: deftool', () => {
    const code = `
      (deftool "add" "Add two numbers" {:a "number" :b "number"} "add_impl")
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 61: tool-get', () => {
    const code = `
      (deftool "sub" "Subtract" {:a "number"} "sub_fn")
      (map? (tool-get "sub"))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 61: tools-list', () => {
    const code = `
      (deftool "t1" "Test 1" {} "fn1")
      (deftool "t2" "Test 2" {} "fn2")
      (array? (tools-list))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 61: tools-to-anthropic', () => {
    const code = `
      (deftool "mul" "Multiply" {:a "number"} "mul_fn")
      (array? (tools-to-anthropic))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 61: tool-validate', () => {
    const code = `
      (deftool "div" "Divide" {:x "number" :y "number"} "div_fn")
      (map? (tool-validate "div" {:x 10 :y 2}))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 62: AI-PIPELINE
  // ─────────────────────────────────────────────────────────────────

  test('Step 62: pipeline-create', () => {
    const code = `
      (string? (pipeline-create [{:name "step1" :type "fetch" :fn "fetch_data"}]))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 62: pipelines-stats', () => {
    const code = `
      (pipeline-create [{:name "s1" :type "process" :fn "process_fn"}])
      (map? (pipelines-stats))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });

  test('Step 62: pipelines-clear', () => {
    const code = `
      (pipeline-create [{:name "p1" :type "fetch" :fn "f1"}])
      (number? (pipelines-clear))
    `;
    const result = interp.eval(new Parser(new Lexer(code).tokenize()).parse());
    expect(result).toBe(true);
  });
});
