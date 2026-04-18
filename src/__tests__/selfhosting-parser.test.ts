/**
 * Phase 3: Self-Hosting Parser Verification
 * Test that freelang-parser.fl (v9 parser) generates correct AST
 *
 * Target: freelang-parser.fl (Phase 34 implementation)
 * Dependencies: freelang-lexer.fl (Phase 35)
 * Pattern: (parse (lex "source"))
 * Test cases: 10 scenarios covering all AST node types
 */

import { Interpreter } from '../interpreter';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 3: Self-Hosting Parser (freelang-parser.fl) Verification', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();

    // Load lexer first (dependency)
    const lexerFlPath = path.join(__dirname, '../freelang-lexer.fl');
    const lexerFlCode = fs.readFileSync(lexerFlPath, 'utf-8');
    interp.run(lexerFlCode);
    console.log('✅ freelang-lexer.fl loaded');

    // Load parser
    const parserFlPath = path.join(__dirname, '../freelang-parser.fl');
    const parserFlCode = fs.readFileSync(parserFlPath, 'utf-8');
    try {
      interp.run(parserFlCode);
      console.log('✅ freelang-parser.fl loaded successfully');
    } catch (e) {
      console.error('❌ Failed to load freelang-parser.fl:', e);
      throw e;
    }
  });

  // Helper function to parse using freelang-lexer.fl + freelang-parser.fl
  function parseSource(source: string): any {
    // Escape both backslash and quotes for FL code embedding
    const escaped = source.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const code = `(parse (lex "${escaped}"))`;
    try {
      const ctx = interp.run(code);
      return ctx.lastValue; // returns nodes array
    } catch (e) {
      console.error(`Error parsing: ${source}`, e);
      throw e;
    }
  }

  // Test 1: 숫자 리터럴
  test('1. 숫자: "123" → NUMBER literal token', () => {
    const nodes = parseSource('123');
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes.length).toBeGreaterThan(0);

    const node = nodes[0];
    expect(node.kind).toBe('literal');
    expect(node.type).toBe('number');
    expect(node.value).toBe(123);
    expect(node.line).toBeGreaterThan(0);
  });

  // Test 2: 문자열 리터럴
  test('2. 문자열: "\\"hello\\"" → STRING literal', () => {
    const nodes = parseSource('"hello"');
    expect(Array.isArray(nodes)).toBe(true);

    const node = nodes[0];
    expect(node.kind).toBe('literal');
    expect(node.type).toBe('string');
    expect(node.value).toBe('hello');
  });

  // Test 3: 불리언
  test('3. 불리언: "true" → BOOL literal', () => {
    const nodes = parseSource('true');
    expect(Array.isArray(nodes)).toBe(true);

    const node = nodes[0];
    expect(node.kind).toBe('literal');
    expect(node.type).toBe('boolean');
    expect(node.value).toBe(true);
  });

  // Test 4: 변수
  test('4. 변수: "$x" → VARIABLE node', () => {
    const nodes = parseSource('$x');
    expect(Array.isArray(nodes)).toBe(true);

    const node = nodes[0];
    expect(node.kind).toBe('variable');
    expect(node.name).toBe('x');
  });

  // Test 5: 키워드
  test('5. 키워드: ":type" → KEYWORD node', () => {
    const nodes = parseSource(':type');
    expect(Array.isArray(nodes)).toBe(true);

    const node = nodes[0];
    expect(node.kind).toBe('keyword');
    expect(node.name).toBe('type');
  });

  // Test 6: 심볼
  test('6. 심볼: "foo" → SYMBOL literal', () => {
    const nodes = parseSource('foo');
    expect(Array.isArray(nodes)).toBe(true);

    const node = nodes[0];
    expect(node.kind).toBe('literal');
    expect(node.type).toBe('symbol');
    expect(node.value).toBe('foo');
  });

  // Test 7: S-expression
  test('7. S-expression: "(+ 1 2)" → sexpr node', () => {
    const nodes = parseSource('(+ 1 2)');
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes.length).toBeGreaterThan(0);

    const node = nodes[0];
    expect(node.kind).toBe('sexpr');
    expect(node.op).toBe('+');
    expect(Array.isArray(node.args)).toBe(true);
    expect(node.args.length).toBe(2);
    // Check arguments are numbers
    expect(node.args[0].kind).toBe('literal');
    expect(node.args[0].value).toBe(1);
    expect(node.args[1].kind).toBe('literal');
    expect(node.args[1].value).toBe(2);
  });

  // Test 8: 배열 리터럴
  test('8. 배열: "[1 2 3]" → array node', () => {
    const nodes = parseSource('[1 2 3]');
    expect(Array.isArray(nodes)).toBe(true);

    const node = nodes[0];
    expect(node.kind).toBe('array');
    expect(Array.isArray(node.items)).toBe(true);
    expect(node.items.length).toBe(3);
    // Check items
    expect(node.items[0].kind).toBe('literal');
    expect(node.items[0].value).toBe(1);
    expect(node.items[1].value).toBe(2);
    expect(node.items[2].value).toBe(3);
  });

  // Test 9: FUNC 블록
  test('9. FUNC 블록: "[FUNC foo :params [$x] :body $x]" → block node', () => {
    const nodes = parseSource('[FUNC foo :params [$x] :body $x]');
    expect(Array.isArray(nodes)).toBe(true);

    const node = nodes[0];
    expect(node.kind).toBe('block');
    expect(node.type).toBe('FUNC');
    expect(node.name).toBe('foo');
    expect(node.fields).toBeDefined();
    // Check fields
    const fields = node.fields;
    expect(fields.params).toBeDefined();
    expect(Array.isArray(fields.params.items)).toBe(true); // Should be array node
    expect(fields.body).toBeDefined();
  });

  // Test 10: let 표현식
  test('10. let 표현식: "(let [[$x 10]] $x)" → sexpr with op="let"', () => {
    const nodes = parseSource('(let [[$x 10]] $x)');
    expect(Array.isArray(nodes)).toBe(true);

    const node = nodes[0];
    expect(node.kind).toBe('sexpr');
    expect(node.op).toBe('let');
    expect(Array.isArray(node.args)).toBe(true);
    expect(node.args.length).toBe(2); // binding array + body
    // First arg: binding array [[$x 10]]
    expect(node.args[0].kind).toBe('array');
    expect(node.args[0].items.length).toBe(1); // one binding
    // Second arg: body $x
    expect(node.args[1].kind).toBe('variable');
    expect(node.args[1].name).toBe('x');
  });
});
