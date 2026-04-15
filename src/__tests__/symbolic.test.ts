import { describe, it, expect, beforeEach } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FL_CLI = path.resolve(__dirname, '../../target/release/fl');

describe('Phase 159: Symbolic Computation & Expression Trees', () => {
  const runFlCode = (code: string): string => {
    const testFile = path.join('/tmp', `test_${Date.now()}.fl`);
    fs.writeFileSync(testFile, code);
    try {
      return execFileSync(FL_CLI, [testFile], { encoding: 'utf-8' });
    } finally {
      fs.unlinkSync(testFile);
    }
  };

  // ========== Expression Representation Tests ==========
  describe('Expression Representation', () => {
    it('1. const-expr creation', () => {
      const code = `
(load "src/expression.fl")
(let [expr (const-expr 42)]
  (print (:value expr)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('42');
    });

    it('2. var-expr creation', () => {
      const code = `
(load "src/expression.fl")
(let [expr (var-expr "x")]
  (print (:name expr)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('x');
    });

    it('3. binop-expr creation', () => {
      const code = `
(load "src/expression.fl")
(let [expr (binop-expr :+ (const-expr 2) (const-expr 3))]
  (print (:op expr)))
      `;
      const output = runFlCode(code);
      expect(output).toContain(':+');
    });

    it('4. expr-depth calculation', () => {
      const code = `
(load "src/expression.fl")
(let [expr (binop-expr :+
              (const-expr 1)
              (binop-expr :* (const-expr 2) (const-expr 3)))]
  (print (expr-depth expr)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('5. expr-size calculation', () => {
      const code = `
(load "src/expression.fl")
(let [expr (binop-expr :+ (const-expr 1) (const-expr 2))]
  (print (expr-size expr)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('6. extract-vars from expression', () => {
      const code = `
(load "src/expression.fl")
(let [expr (binop-expr :+ (var-expr "x") (var-expr "y"))]
  (print (count (extract-vars expr))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('7. expr-to-string conversion', () => {
      const code = `
(load "src/expression.fl")
(let [expr (binop-expr :+ (const-expr 1) (const-expr 2))]
  (print (expr-to-string expr)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('+');
    });
  });

  // ========== Expression Evaluation Tests ==========
  describe('Expression Evaluation', () => {
    it('8. eval-expr constant', () => {
      const code = `
(load "src/expression.fl")
(let [expr (const-expr 42)]
  (print (eval-expr expr {})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('42');
    });

    it('9. eval-expr variable substitution', () => {
      const code = `
(load "src/expression.fl")
(let [expr (var-expr "x")]
  (print (eval-expr expr {"x" 10})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('10');
    });

    it('10. eval-expr addition', () => {
      const code = `
(load "src/expression.fl")
(let [expr (binop-expr :+ (const-expr 5) (const-expr 3))]
  (print (eval-expr expr {})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('8');
    });

    it('11. eval-expr multiplication', () => {
      const code = `
(load "src/expression.fl")
(let [expr (binop-expr :* (const-expr 4) (const-expr 5))]
  (print (eval-expr expr {})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('20');
    });

    it('12. eval-expr with variables', () => {
      const code = `
(load "src/expression.fl")
(let [expr (binop-expr :* (var-expr "x") (var-expr "y"))]
  (print (eval-expr expr {"x" 3 "y" 4})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('12');
    });
  });

  // ========== Differentiation Tests ==========
  describe('Differentiation', () => {
    it('13. differentiate constant', () => {
      const code = `
(load "src/differentiation.fl")
(let [expr (const-expr 5)
      deriv (differentiate expr "x")]
  (print (eval-expr deriv {})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('0');
    });

    it('14. differentiate variable', () => {
      const code = `
(load "src/differentiation.fl")
(let [expr (var-expr "x")
      deriv (differentiate expr "x")]
  (print (eval-expr deriv {})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('1');
    });

    it('15. differentiate x^2', () => {
      const code = `
(load "src/differentiation.fl")
(let [expr (binop-expr :^ (var-expr "x") (const-expr 2))
      deriv (differentiate expr "x")]
  (print (eval-expr deriv {"x" 3})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('6');
    });

    it('16. differentiate sum', () => {
      const code = `
(load "src/differentiation.fl")
(let [expr (binop-expr :+ (var-expr "x") (const-expr 3))
      deriv (differentiate expr "x")]
  (print (eval-expr deriv {})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('1');
    });

    it('17. differentiate product', () => {
      const code = `
(load "src/differentiation.fl")
(let [expr (binop-expr :* (var-expr "x") (var-expr "x"))
      deriv (differentiate expr "x")]
  (print (eval-expr deriv {"x" 2})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('4');
    });

    it('18. gradient computation', () => {
      const code = `
(load "src/differentiation.fl")
(let [expr (binop-expr :+ (var-expr "x") (var-expr "y"))
      grad (gradient expr)]
  (print (count grad)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('19. nth-derivative', () => {
      const code = `
(load "src/differentiation.fl")
(let [expr (binop-expr :^ (var-expr "x") (const-expr 3))
      deriv2 (nth-derivative expr "x" 2)]
  (print (eval-expr deriv2 {"x" 1})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('6');
    });
  });

  // ========== Simplification Tests ==========
  describe('Simplification', () => {
    it('20. fold-constants', () => {
      const code = `
(load "src/simplification.fl")
(let [expr (binop-expr :+ (const-expr 2) (const-expr 3))
      folded (fold-constants expr)]
  (print (eval-expr folded {})))
      `;
      const output = runFlCode(code);
      expect(output).toContain('5');
    });

    it('21. identity-simplify x+0', () => {
      const code = `
(load "src/simplification.fl")
(let [expr (binop-expr :+ (var-expr "x") (const-expr 0))
      simp (identity-simplify expr)]
  (print (:name simp)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('x');
    });

    it('22. identity-simplify x*1', () => {
      const code = `
(load "src/simplification.fl")
(let [expr (binop-expr :* (var-expr "x") (const-expr 1))
      simp (identity-simplify expr)]
  (print (:name simp)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('x');
    });

    it('23. simplify complex expression', () => {
      const code = `
(load "src/simplification.fl")
(let [expr (binop-expr :+ (binop-expr :* (const-expr 1) (var-expr "x")) (const-expr 0))
      simp (simplify expr)]
  (print (:name simp)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('x');
    });

    it('24. simplification-ratio', () => {
      const code = `
(load "src/simplification.fl")
(let [expr (binop-expr :+ (const-expr 2) (const-expr 3))]
  (print (< (simplification-ratio expr) 1)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('25. equivalent-expr check', () => {
      const code = `
(load "src/simplification.fl")
(let [expr1 (binop-expr :+ (var-expr "x") (const-expr 0))
      expr2 (var-expr "x")]
  (print (equivalent-expr expr1 expr2)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });
});
