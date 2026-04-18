/**
 * Phase 4: Full Self-Hosting Chain Verification
 * Test complete chain: (interpret (parse (lex "source")))
 *
 * All components are v9 language:
 * - freelang-lexer.fl (Phase 35)
 * - freelang-parser.fl (Phase 34)
 * - freelang-interpreter.fl (Phase 45)
 *
 * Test cases: 10 scenarios covering all operations
 */

import { Interpreter } from '../interpreter';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 4: Full Self-Hosting Chain (lex → parse → interpret)', () => {
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

  // Test 1: 산술
  test('1. 산술: (+ 1 2) → 3', () => {
    const result = flEval('(+ 1 2)');
    expect(result).toBe(3);
  });

  // Test 2: let 바인딩
  test('2. let 바인딩: (let [[$x 10]] $x) → 10', () => {
    const result = flEval('(let [[$x 10]] $x)');
    expect(result).toBe(10);
  });

  // Test 3: if 참
  test('3. if 참: (if true "yes" "no") → "yes"', () => {
    const result = flEval('(if true "yes" "no")');
    expect(result).toBe('yes');
  });

  // Test 4: if 거짓
  test('4. if 거짓: (if false "yes" "no") → "no"', () => {
    const result = flEval('(if false "yes" "no")');
    expect(result).toBe('no');
  });

  // Test 5: 다중 바인딩 + 연산
  test('5. 다중 바인딩: (let [[$x 5] [$y 3]] (- $x $y)) → 2', () => {
    const result = flEval('(let [[$x 5] [$y 3]] (- $x $y))');
    expect(result).toBe(2);
  });

  // Test 6: FUNC 정의 + 호출
  test('6. FUNC 정의: [FUNC square :params [$n] :body (* $n $n)] + (square 4) → 16', () => {
    const result = flEval('[FUNC square :params [$n] :body (* $n $n)] (square 4)');
    expect(result).toBe(16);
  });

  // Test 7: 배열 인덱싱
  test('7. 배열: (let [[$arr [1 2 3]]] (get $arr 1)) → 2', () => {
    const result = flEval('(let [[$arr [1 2 3]]] (get $arr 1))');
    expect(result).toBe(2);
  });

  // Test 8: 불린 리터럴 true/false
  test('8. 불린: true → true, false → false', () => {
    const result1 = flEval('true');
    const result2 = flEval('false');
    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  // Test 9: 중첩 연산
  test('9. 중첩: (+ (* 2 3) 4) → 10', () => {
    const result = flEval('(+ (* 2 3) 4)');
    expect(result).toBe(10);
  });

  // Test 10: let + if 조합
  test('10. let + if: (let [[$x 10]] (if (> $x 5) "big" "small")) → "big"', () => {
    const result = flEval('(let [[$x 10]] (if (> $x 5) "big" "small"))');
    expect(result).toBe('big');
  });
});
