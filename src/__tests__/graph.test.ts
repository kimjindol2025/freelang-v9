import { describe, it, expect, beforeEach } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FL_CLI = path.resolve(__dirname, '../../target/release/fl');

describe('Phase 160: Graph Algorithms & Analysis', () => {
  const runFlCode = (code: string): string => {
    const testFile = path.join('/tmp', `test_${Date.now()}.fl`);
    fs.writeFileSync(testFile, code);
    try {
      return execFileSync(FL_CLI, [testFile], { encoding: 'utf-8' });
    } finally {
      fs.unlinkSync(testFile);
    }
  };

  // ========== Graph Structure Tests ==========
  describe('Graph Structure', () => {
    it('1. create-graph basic', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (print (count (:vertices g))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('2. add-edge undirected', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (print (count (get-neighbors g 1)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('1');
    });

    it('3. add-edge directed', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3] :directed true)]
  (do
    (add-edge g 1 2)
    (print (count (get-neighbors g 2)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('0');
    });

    it('4. has-edge check', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (print (has-edge g 1 2))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('5. vertex-degree calculation', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3 4])]
  (do
    (add-edge g 1 2)
    (add-edge g 1 3)
    (print (vertex-degree g 1))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('6. graph-density sparse', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3 4 5])]
  (do
    (add-edge g 1 2)
    (print (< (graph-density g) 1))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('7. graph-info summary', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (print (> (:edges (graph-info g)) 0))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  // ========== Graph Algorithms Tests ==========
  describe('Graph Algorithms', () => {
    it('8. bfs ordering', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3 4])]
  (do
    (add-edge g 1 2)
    (add-edge g 1 3)
    (add-edge g 2 4)
    (print (= (bfs g 1) [1 2 3 4]))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('9. bfs-distances calculation', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3 4])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (add-edge g 3 4)
    (let [dists (bfs-distances g 1)]
      (print (get dists 3)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('10. dfs ordering', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (print (contains? (set (dfs g 1)) 3))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('11. topological-sort DAG', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3] :directed true)]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (print (not (nil? (topological-sort g))))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('12. has-cycle-undirected detection', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (add-edge g 3 1)
    (print (has-cycle-undirected g))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('13. dijkstra shortest path', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3 4])]
  (do
    (add-edge g 1 2 :weight 1)
    (add-edge g 2 4 :weight 2)
    (add-edge g 1 3 :weight 5)
    (add-edge g 3 4 :weight 1)
    (let [dists (dijkstra g 1)]
      (print (< (get dists 4) 10)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('14. bfs-path finding', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3 4])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 4)
    (print (= (count (bfs-path g 1 4)) 3))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  // ========== Graph Analysis Tests ==========
  describe('Graph Analysis', () => {
    it('15. connected-components detection', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3 4 5])]
  (do
    (add-edge g 1 2)
    (add-edge g 3 4)
    (print (> (count (connected-components g)) 1))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('16. is-connected check', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (print (is-connected g 1 3))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('17. degree-centrality computation', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 1 3)
    (let [centrality (degree-centrality g)]
      (print (> (get centrality 1) 0)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('18. clustering-coefficient calculation', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 1 3)
    (add-edge g 2 3)
    (print (= (clustering-coefficient g 1) 1))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('19. graph-diameter calculation', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (print (= (graph-diameter g) 2))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('20. vertex-distance calculation', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3 4])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (add-edge g 3 4)
    (print (= (vertex-distance g 1 4) 3))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('21. closeness-centrality computation', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (let [centrality (closeness-centrality g)]
      (print (> (get centrality 2) 0)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('22. is-fully-connected check', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (add-edge g 1 3)
    (print (is-fully-connected g))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('23. count-triangles', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (add-edge g 1 3)
    (print (= (count-triangles g) 1))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('24. avg-clustering-coefficient', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (add-edge g 2 3)
    (add-edge g 1 3)
    (print (> (avg-clustering-coefficient g) 0))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('25. graph-statistics summary', () => {
      const code = `
(load "src/graph-analysis.fl")
(let [g (create-graph [1 2 3])]
  (do
    (add-edge g 1 2)
    (let [stats (graph-statistics g)]
      (print (> (:vertices stats) 0)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });
});
