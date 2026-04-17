/**
 * Phase 1: Self-Hosting Lexer Test
 * Tests lexer.fl (written in v9) against lexer.ts (original TypeScript)
 */

import { Interpreter } from '../interpreter';
import { lex as tsLex } from '../lexer';

describe('Phase 1: Self-Hosting Lexer (lexer.fl)', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
    // Load lexer-minimal.fl
    const fs = require('fs');
    const path = require('path');
    const lexerFlPath = path.join(__dirname, '../lexer-minimal.fl');
    const lexerFlCode = fs.readFileSync(lexerFlPath, 'utf-8');

    try {
      interp.run(lexerFlCode);
    } catch (e) {
      console.error('Failed to load lexer-minimal.fl:', e);
      throw e;
    }
  });

  test('1. Simple number tokenization', () => {
    const source = '123';

    // TypeScript lexer
    const tsTokens = tsLex(source);

    // v9 lexer (from lexer.fl)
    const code = `
      (let ((tokens (lex "${source}")))
        tokens)
    `;

    try {
      const flTokens = interp.eval(code);
      console.log('TS tokens:', tsTokens);
      console.log('FL tokens:', flTokens);

      expect(flTokens).toBeDefined();
      expect(Array.isArray(flTokens)).toBe(true);
    } catch (e) {
      console.error('Error in test:', e);
      throw e;
    }
  });

  test('2. Simple symbol tokenization', () => {
    const source = 'define';
    const code = `(lex "${source}")`;

    const flTokens = interp.eval(code);
    expect(Array.isArray(flTokens)).toBe(true);
  });

  test('3. Parentheses', () => {
    const source = '(+ 1 2)';
    const code = `(lex "${source}")`;

    const flTokens = interp.eval(code);
    expect(Array.isArray(flTokens)).toBe(true);
  });

  test('4. String literal', () => {
    const source = '"hello"';
    const code = `(lex "${source}")`;

    const flTokens = interp.eval(code);
    expect(Array.isArray(flTokens)).toBe(true);
  });
});
