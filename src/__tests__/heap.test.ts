import { describe, it, expect } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FL_CLI = path.resolve(__dirname, '../../target/release/fl');

describe('Phase 162: Heap & Priority Queue', () => {
  const runFlCode = (code: string): string => {
    const testFile = path.join('/tmp', `test_${Date.now()}.fl`);
    fs.writeFileSync(testFile, code);
    try {
      return execFileSync(FL_CLI, [testFile], { encoding: 'utf-8' });
    } finally {
      fs.unlinkSync(testFile);
    }
  };

  describe('Heap Structure', () => {
    it('1. create-heap min', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :min)]
  (print (heap-empty? h)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('2. heap-insert single', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :min)]
  (heap-insert h 5)
  (print (heap-size h)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('1');
    });

    it('3. heap-peek root', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :min)]
  (heap-insert h 5)
  (heap-insert h 3)
  (print (= (heap-peek h) 3)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('4. heap-extract min', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :min)]
  (heap-insert h 5)
  (heap-insert h 3)
  (print (= (heap-extract h) 3)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('5. heap-valid check', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :min)]
  (heap-insert h 5)
  (heap-insert h 3)
  (print (heap-valid? h)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('6. build-heap from array', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (build-heap [5 3 7 1] :type :min)]
  (print (= (heap-peek h) 1)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('7. heap-height calculation', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (build-heap [1 2 3 4 5] :type :min)]
  (print (> (heap-height h) 0)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('8. max-heap insertion', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :max)]
  (heap-insert h 3)
  (heap-insert h 7)
  (print (= (heap-peek h) 7)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  describe('Priority Queue', () => {
    it('9. pq-create empty', () => {
      const code = `
(load "src/heap-operations.fl")
(let [pq (pq-create :type :min)]
  (print (heap-empty? (:heap pq))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('10. pq-enqueue single', () => {
      const code = `
(load "src/heap-operations.fl")
(let [pq (pq-create :type :min)]
  (pq-enqueue pq "task" 5)
  (print (= (pq-peek pq) "task")))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('11. pq-dequeue order', () => {
      const code = `
(load "src/heap-operations.fl")
(let [pq (pq-create :type :min)]
  (pq-enqueue pq "a" 3)
  (pq-enqueue pq "b" 1)
  (print (= (pq-dequeue pq) "b")))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  describe('Heap Sorting & K-way', () => {
    it('12. heap-sort ascending', () => {
      const code = `
(load "src/heap-operations.fl")
(let [result (heap-sort [5 3 7 1] :type :asc)]
  (print (= result [1 3 5 7])))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('13. heap-sort descending', () => {
      const code = `
(load "src/heap-operations.fl")
(let [result (heap-sort [5 3 7 1] :type :desc)]
  (print (= result [7 5 3 1])))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('14. find-k-largest', () => {
      const code = `
(load "src/heap-operations.fl")
(let [result (find-k-largest [5 3 7 1 9] 2)]
  (print (= (count result) 2)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('15. find-k-smallest', () => {
      const code = `
(load "src/heap-operations.fl")
(let [result (find-k-smallest [5 3 7 1 9] 2)]
  (print (= (count result) 2)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('16. merge-heaps', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h1 (build-heap [1 3] :type :min)]
  (let [h2 (build-heap [2 4] :type :min)]
    (let [merged (merge-heaps h1 h2)]
      (print (= (heap-size merged) 4)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('17. heap-leaf-count', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (build-heap [1 2 3 4 5] :type :min)]
  (print (> (heap-leaf-count h) 0)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('18. find-median single', () => {
      const code = `
(load "src/heap-operations.fl")
(let [m (find-median [5 3 7])]
  (print (= m 5)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  describe('Advanced Operations', () => {
    it('19. heap-insert-extract cycle', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :min)]
  (heap-insert h 3)
  (heap-insert h 1)
  (let [v1 (heap-extract h)]
    (print (= v1 1))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('20. max-heap structure', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (build-heap [1 2 3 4 5] :type :max)]
  (print (= (heap-peek h) 5)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('21. heap extract all', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (build-heap [5 3 7] :type :min)]
  (let [v1 (heap-extract h)]
    (let [v2 (heap-extract h)]
      (let [v3 (heap-extract h)]
        (print (= (+ v1 v2 v3) 15))))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('22. heap with duplicates', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (build-heap [3 3 1 1] :type :min)]
  (print (= (heap-peek h) 1)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('23. heap-size after extract', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (build-heap [1 2 3] :type :min)]
  (heap-extract h)
  (print (= (heap-size h) 2)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('24. heap-valid after ops', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :min)]
  (heap-insert h 5)
  (heap-insert h 3)
  (heap-insert h 7)
  (print (heap-valid? h)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('25. empty heap operations', () => {
      const code = `
(load "src/heap-operations.fl")
(let [h (create-heap :type :min)]
  (print (= (heap-peek h) nil)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });
});
