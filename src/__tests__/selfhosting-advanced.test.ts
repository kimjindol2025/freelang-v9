/**
 * Phase 4: Advanced Self-Hosting Features (재귀/고차함수)
 * Test recursive functions, higher-order functions
 *
 * ⚠️ 부분 self-hosting 상태 (TypeScript 패치 포함):
 * - freelang-lexer.fl: ✅ v9 구현
 * - freelang-parser.fl: ✅ v9 구현
 * - freelang-interpreter.fl: ✅ v9 구현
 * - fl-load-all-funcs: ❌ TypeScript native case (재귀 해결용)
 *   → closure-env 동적 업데이트는 TypeScript에서만 가능
 *
 * Test cases: 3 scenarios (재귀, 고차함수 검증)
 */

import { Interpreter } from '../interpreter';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 4: Advanced Self-Hosting (Recursion, Higher-Order Functions, FL Map)', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();

    // Load lexer
    const lexerFlPath = path.join(__dirname, '../freelang-lexer.fl');
    const lexerFlCode = fs.readFileSync(lexerFlPath, 'utf-8');
    interp.run(lexerFlCode);
    console.log('✅ freelang-lexer.fl loaded');

    // Load parser
    const parserFlPath = path.join(__dirname, '../freelang-parser.fl');
    const parserFlCode = fs.readFileSync(parserFlPath, 'utf-8');
    interp.run(parserFlCode);
    console.log('✅ freelang-parser.fl loaded');

    // Load interpreter
    const interpreterFlPath = path.join(__dirname, '../freelang-interpreter.fl');
    const interpreterFlCode = fs.readFileSync(interpreterFlPath, 'utf-8');
    try {
      interp.run(interpreterFlCode);
      console.log('✅ freelang-interpreter.fl loaded');
    } catch (e) {
      console.error('❌ Failed to load freelang-interpreter.fl:', e);
      throw e;
    }
  });

  // Helper: Complete chain (lex → parse → interpret)
  function flEval(source: string): any {
    const escaped = source.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const code = `(interpret (parse (lex "${escaped}")))`;
    try {
      const ctx = interp.run(code);
      return ctx.lastValue;
    } catch (e) {
      console.error(`Error in chain: ${source}`, e);
      throw e;
    }
  }

  // Test 11: 재귀 — factorial
  test('11. 재귀: [FUNC fact :params [$n] :body (if (= $n 0) 1 (* $n (fact (- $n 1))))] (fact 5) → 120', () => {
    const result = flEval('[FUNC fact :params [$n] :body (if (= $n 0) 1 (* $n (fact (- $n 1))))] (fact 5)');
    expect(result).toBe(120);
  });

  // Test 12: 재귀 — fibonacci
  test('12. 재귀: [FUNC fib :params [$n] :body (if (< $n 2) $n (+ (fib (- $n 1)) (fib (- $n 2))))] (fib 7) → 13', () => {
    const result = flEval('[FUNC fib :params [$n] :body (if (< $n 2) $n (+ (fib (- $n 1)) (fib (- $n 2))))] (fib 7)');
    expect(result).toBe(13);
  });

  // Test 13: 고차 함수 — make-adder (closure 반환)
  test('13. 고차: [FUNC make-adder :params [$x] :body (fn [$y] (+ $x $y))] (call (make-adder 3) 4) → 7', () => {
    const result = flEval('[FUNC make-adder :params [$x] :body (fn [$y] (+ $x $y))] (call (make-adder 3) 4)');
    expect(result).toBe(7);
  });

});
