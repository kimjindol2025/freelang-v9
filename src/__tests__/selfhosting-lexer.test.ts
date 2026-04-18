/**
 * Phase 2A: Self-Hosting Lexer Verification
 * Test that freelang-lexer.fl (v9 lexer) generates correct tokens
 *
 * Target: freelang-lexer.fl (Phase 35 implementation)
 * Test cases: 10 scenarios covering all token types
 */

import { Interpreter } from '../interpreter';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 2: Self-Hosting Lexer (freelang-lexer.fl) Verification', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
    // Load freelang-lexer.fl (실제 구현체, Phase 35)
    const lexerFlPath = path.join(__dirname, '../freelang-lexer.fl');
    const lexerFlCode = fs.readFileSync(lexerFlPath, 'utf-8');

    try {
      interp.run(lexerFlCode);
      console.log('✅ freelang-lexer.fl loaded successfully');
    } catch (e) {
      console.error('❌ Failed to load freelang-lexer.fl:', e);
      throw e;
    }
  });

  // Helper function to tokenize using freelang-lexer.fl
  function tokenize(source: string): any {
    // Escape quotes in source for FL code
    const escaped = source.replace(/"/g, '\\"');
    const code = `(lex "${escaped}")`;
    try {
      const ctx = interp.run(code);
      return ctx.lastValue;
    } catch (e) {
      console.error(`Error tokenizing: ${source}`, e);
      throw e;
    }
  }

  // Test 1: 숫자
  test('1. 숫자: "123" → NUMBER token', () => {
    const tokens = tokenize('123');
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);

    const numToken = tokens[0];
    expect(numToken.type).toBe('NUMBER');
    expect(numToken.value).toBe('123');
    expect(numToken.line).toBe(1);
    expect(numToken.col).toBe(1);
  });

  // Test 2: 문자열
  test('2. 문자열: "\\"hello\\"" → STRING token', () => {
    const tokens = tokenize('"hello"');
    expect(Array.isArray(tokens)).toBe(true);

    const strToken = tokens[0];
    expect(strToken.type).toBe('STRING');
    expect(strToken.value).toBe('hello');
  });

  // Test 3: 변수
  test('3. 변수: "$x" → VARIABLE token', () => {
    const tokens = tokenize('$x');
    expect(Array.isArray(tokens)).toBe(true);

    const varToken = tokens[0];
    expect(varToken.type).toBe('VARIABLE');
    expect(varToken.value).toBe('x');
  });

  // Test 4: 심볼 (연산자)
  test('4. 심볼: "+" → SYMBOL token', () => {
    const tokens = tokenize('+');
    expect(Array.isArray(tokens)).toBe(true);

    const symToken = tokens[0];
    expect(symToken.type).toBe('SYMBOL');
    expect(symToken.value).toBe('+');
  });

  // Test 5: 키워드 (:type 형식)
  test('5. 키워드: ":type" → KEYWORD token', () => {
    const tokens = tokenize(':type');
    expect(Array.isArray(tokens)).toBe(true);

    const kwToken = tokens[0];
    expect(kwToken.type).toBe('KEYWORD');
    expect(kwToken.value).toBe('type');
  });

  // Test 6: 콜론 단독
  test('6. 콜론: ":" (no symbol after) → COLON token', () => {
    const tokens = tokenize(': ');  // colon followed by space
    expect(Array.isArray(tokens)).toBe(true);

    const colonToken = tokens[0];
    expect(colonToken.type).toBe('COLON');
    expect(colonToken.value).toBe(':');
  });

  // Test 7: 괄호 표현식
  test('7. 괄호: "(+ 1 2)" → [LPAREN, SYMBOL(+), NUMBER(1), NUMBER(2), RPAREN, EOF]', () => {
    const tokens = tokenize('(+ 1 2)');
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThanOrEqual(6); // at least 6 tokens + EOF

    expect(tokens[0].type).toBe('LPAREN');
    expect(tokens[1].type).toBe('SYMBOL');
    expect(tokens[1].value).toBe('+');
    expect(tokens[2].type).toBe('NUMBER');
    expect(tokens[2].value).toBe('1');
    expect(tokens[3].type).toBe('NUMBER');
    expect(tokens[3].value).toBe('2');
    expect(tokens[4].type).toBe('RPAREN');
  });

  // Test 8: 주석 무시
  test('8. 주석: "; comment\\n42" → skip comment, return [NUMBER(42), EOF]', () => {
    // Note: escaping \n in string for Jest
    const tokens = tokenize('; comment\n42');
    expect(Array.isArray(tokens)).toBe(true);

    // First non-EOF token should be NUMBER 42
    const numberToken = tokens.find((t: any) => t.type === 'NUMBER');
    expect(numberToken).toBeDefined();
    expect(numberToken.value).toBe('42');
  });

  // Test 9: 배열 리터럴
  test('9. 배열: "[1 2]" → [LBRACKET, NUMBER(1), NUMBER(2), RBRACKET, EOF]', () => {
    const tokens = tokenize('[1 2]');
    expect(Array.isArray(tokens)).toBe(true);

    expect(tokens[0].type).toBe('LBRACKET');
    expect(tokens[1].type).toBe('NUMBER');
    expect(tokens[1].value).toBe('1');
    expect(tokens[2].type).toBe('NUMBER');
    expect(tokens[2].value).toBe('2');
    expect(tokens[3].type).toBe('RBRACKET');
  });

  // Test 10: 전체 표현식 (let 바인딩)
  test('10. 전체 표현식: "(let [[$x 10]] $x)" → 올바른 토큰 배열', () => {
    const tokens = tokenize('(let [[$x 10]] $x)');
    expect(Array.isArray(tokens)).toBe(true);

    // Verify structure: LPAREN, SYMBOL(let), LBRACKET, LBRACKET, VARIABLE(x), NUMBER(10), RBRACKET, RBRACKET, VARIABLE(x), RPAREN, EOF
    expect(tokens[0].type).toBe('LPAREN');
    expect(tokens[1].type).toBe('SYMBOL');
    expect(tokens[1].value).toBe('let');
    expect(tokens[2].type).toBe('LBRACKET');
    expect(tokens[3].type).toBe('LBRACKET');
    expect(tokens[4].type).toBe('VARIABLE');
    expect(tokens[4].value).toBe('x');
    expect(tokens[5].type).toBe('NUMBER');
    expect(tokens[5].value).toBe('10');
    expect(tokens[6].type).toBe('RBRACKET');
    expect(tokens[7].type).toBe('RBRACKET');
    expect(tokens[8].type).toBe('VARIABLE');
    expect(tokens[8].value).toBe('x');
    expect(tokens[9].type).toBe('RPAREN');
  });
});
