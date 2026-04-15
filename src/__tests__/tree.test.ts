import { describe, it, expect, beforeEach } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FL_CLI = path.resolve(__dirname, '../../target/release/fl');

describe('Phase 161: Tree Structures & Traversal', () => {
  const runFlCode = (code: string): string => {
    const testFile = path.join('/tmp', `test_${Date.now()}.fl`);
    fs.writeFileSync(testFile, code);
    try {
      return execFileSync(FL_CLI, [testFile], { encoding: 'utf-8' });
    } finally {
      fs.unlinkSync(testFile);
    }
  };

  // ========== Tree Structure Tests ==========
  describe('Tree Structure', () => {
    it('1. create tree-node basic', () => {
      const code = `
(load "src/tree-structure.fl")
(let [node (tree-node 5)]
  (print (node-value node)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('5');
    });

    it('2. node-value extraction', () => {
      const code = `
(load "src/tree-structure.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (node-value root)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('5');
    });

    it('3. tree-height calculation', () => {
      const code = `
(load "src/tree-structure.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (tree-height root)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('4. tree-size count', () => {
      const code = `
(load "src/tree-structure.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (tree-size root)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('5. tree-leaf-count', () => {
      const code = `
(load "src/tree-structure.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (tree-leaf-count root)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('6. tree-is-bst validation', () => {
      const code = `
(load "src/tree-structure.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (tree-is-bst root)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('7. tree-is-balanced check', () => {
      const code = `
(load "src/tree-structure.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (tree-is-balanced root)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  // ========== BST Operations Tests ==========
  describe('BST Operations', () => {
    it('8. bst-insert single value', () => {
      const code = `
(load "src/tree-structure.fl")
(let [tree (bst-insert nil 5)]
  (print (node-value tree)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('5');
    });

    it('9. bst-insert multiple', () => {
      const code = `
(load "src/tree-structure.fl")
(let [tree (bst-insert nil 5)]
  (let [tree (bst-insert tree 3)]
    (let [tree (bst-insert tree 7)]
      (print (tree-size tree)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('10. bst-search found', () => {
      const code = `
(load "src/tree-structure.fl")
(let [tree (bst-insert nil 5)]
  (let [tree (bst-insert tree 3)]
    (let [tree (bst-insert tree 7)]
      (print (bst-search tree 3)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('11. bst-min value', () => {
      const code = `
(load "src/tree-structure.fl")
(let [tree (bst-insert nil 5)]
  (let [tree (bst-insert tree 3)]
    (let [tree (bst-insert tree 7)]
      (print (bst-min tree)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });
  });

  // ========== Traversal Tests ==========
  describe('Tree Traversal', () => {
    it('12. tree-bfs order', () => {
      const code = `
(load "src/tree-traversal.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (tree-bfs root) [5 3 7])))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('13. tree-inorder order', () => {
      const code = `
(load "src/tree-traversal.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (tree-inorder root) [3 5 7])))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('14. tree-preorder order', () => {
      const code = `
(load "src/tree-traversal.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (tree-preorder root) [5 3 7])))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('15. tree-postorder order', () => {
      const code = `
(load "src/tree-traversal.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (tree-postorder root) [3 7 5])))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('16. tree-level-order 2D', () => {
      const code = `
(load "src/tree-traversal.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (count (tree-level-order root)) 2)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('17. tree-right-view', () => {
      const code = `
(load "src/tree-traversal.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (tree-right-view root) [7])))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  // ========== Tree Analysis Tests ==========
  describe('Tree Analysis', () => {
    it('18. lca-tree finding', () => {
      const code = `
(load "src/tree-analysis.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (lca-tree root 3 7) 5)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('19. tree-diameter calculation', () => {
      const code = `
(load "src/tree-analysis.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (> (tree-diameter root) 0)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('20. tree-sum all nodes', () => {
      const code = `
(load "src/tree-analysis.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (tree-sum root) 15)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('21. max-path-sum finding', () => {
      const code = `
(load "src/tree-analysis.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (> (max-path-sum root) 0)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('22. tree-statistics comprehensive', () => {
      const code = `
(load "src/tree-analysis.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (let [stats (tree-statistics root)]
    (print (> (:height stats) 0))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('23. path-sum counting', () => {
      const code = `
(load "src/tree-analysis.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (>= (path-sum root 8) 0)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('24. distance-between nodes', () => {
      const code = `
(load "src/tree-analysis.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (>= (distance-between root 3 7) 0)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('25. tree-edge-count', () => {
      const code = `
(load "src/tree-analysis.fl")
(let [left (tree-node 3)
      right (tree-node 7)
      root (tree-node 5 :left left :right right)]
  (print (= (tree-edge-count root) 2)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });
});
