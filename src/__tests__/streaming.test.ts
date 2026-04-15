import { describe, it, expect, beforeEach } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FL_CLI = path.resolve(__dirname, '../../target/release/fl');

describe('Phase 158: Lazy Evaluation & Stream Processing', () => {
  const runFlCode = (code: string): string => {
    const testFile = path.join('/tmp', `test_${Date.now()}.fl`);
    fs.writeFileSync(testFile, code);
    try {
      return execFileSync(FL_CLI, [testFile], { encoding: 'utf-8' });
    } finally {
      fs.unlinkSync(testFile);
    }
  };

  // ========== Lazy Sequences Tests ==========
  describe('Lazy Sequences', () => {
    it('1. lazy-range basic', () => {
      const code = `
(load "src/lazy-sequences.fl")
(let [seq (lazy-range 1 :end 5)]
  (let [first (lazy-realize seq 3)]
    (print (count first))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('2. lazy-repeat infinite sequence', () => {
      const code = `
(load "src/lazy-sequences.fl")
(let [seq (lazy-repeat 42)]
  (let [first (lazy-realize seq 5)]
    (print (every? (fn [x] (= x 42)) first))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('3. lazy-take limits', () => {
      const code = `
(load "src/lazy-sequences.fl")
(let [seq (lazy-range 0 :end 100)]
  (let [taken (lazy-take 5 seq)]
    (print (count (lazy-realize taken 5)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('5');
    });

    it('4. lazy-drop skips elements', () => {
      const code = `
(load "src/lazy-sequences.fl")
(let [seq (lazy-range 0 :end 10)]
  (let [dropped (lazy-drop 3 seq)]
    (print (first (lazy-realize dropped 1)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('5. lazy-cycle repeats', () => {
      const code = `
(load "src/lazy-sequences.fl")
(let [seq (lazy-cycle [1 2 3])]
  (let [items (lazy-realize seq 9)]
    (print (= items [1 2 3 1 2 3 1 2 3]))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('6. lazy-take-while condition', () => {
      const code = `
(load "src/lazy-sequences.fl")
(let [seq (lazy-range 1 :end 10)]
  (let [taken (lazy-take-while (fn [x] (< x 5)) seq)]
    (print (count (lazy-realize taken 10)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('4');
    });

    it('7. lazy-info caching', () => {
      const code = `
(load "src/lazy-sequences.fl")
(let [seq (lazy-range 0 :end 5)]
  (do
    (lazy-realize seq 3)
    (let [info (lazy-info seq)]
      (print (:cached-count info)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });
  });

  // ========== Stream Processing Tests ==========
  describe('Stream Processing', () => {
    it('8. stream-sum aggregation', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 1 :end 6)
      stream (create-stream seq)]
  (print (stream-sum stream)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('15');
    });

    it('9. stream-count elements', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 0 :end 10)
      stream (create-stream seq)]
  (print (stream-count stream)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('10');
    });

    it('10. stream-filter with transform', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 0 :end 10)
      stream (create-stream seq)]
  (do
    (stream-filter stream (fn [x] (> x 5)))
    (print (stream-count stream))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('4');
    });

    it('11. stream-map transformation', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 1 :end 4)
      stream (create-stream seq)]
  (do
    (stream-map stream (fn [x] (* x 2)))
    (print (stream-sum stream))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('12');
    });

    it('12. stream-average calculation', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 1 :end 6)
      stream (create-stream seq)]
  (print (stream-average stream)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('13. stream-min maximum finding', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 1 :end 100)
      stream (create-stream seq)]
  (print (stream-min stream)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('1');
    });

    it('14. stream-any predicate check', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 0 :end 10)
      stream (create-stream seq)]
  (print (stream-any stream (fn [x] (= x 5)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('15. stream-all predicate check', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 1 :end 10)
      stream (create-stream seq)]
  (print (stream-all stream (fn [x] (> x 0)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('16. stream-collect materialization', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 1 :end 4)
      stream (create-stream seq)]
  (do
    (stream-map stream (fn [x] (+ x 10)))
    (print (count (stream-collect stream)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('17. stream-scan accumulation', () => {
      const code = `
(load "src/streams.fl")
(let [seq (lazy-range 1 :end 5)
      stream (create-stream seq)
      scanned (stream-scan stream 0 +)]
  (print (last scanned)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('10');
    });

    it('18. stream-distinct removal', () => {
      const code = `
(load "src/streams.fl")
(let [seq (create-lazy-seq (fn [i]
            (if (< i 5)
              (mod i 3)
              nil)))
      stream (create-stream seq)]
  (print (count (stream-distinct stream))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });
  });

  // ========== Iterator Protocol Tests ==========
  describe('Iterator Protocol', () => {
    it('19. array-iterator basic', () => {
      const code = `
(load "src/iterators.fl")
(let [iter (array-iterator [1 2 3])]
  (do
    (iterator-next iter)
    (print (iterator-next iter))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('20. iterator-has-next check', () => {
      const code = `
(load "src/iterators.fl")
(let [iter (array-iterator [1 2 3])]
  (print (iterator-has-next iter)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('21. iterator-reset functionality', () => {
      const code = `
(load "src/iterators.fl")
(let [iter (array-iterator [1 2 3])]
  (do
    (iterator-next iter)
    (iterator-next iter)
    (iterator-reset iter)
    (print (iterator-next iter))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('1');
    });

    it('22. map-iterator entries', () => {
      const code = `
(load "src/iterators.fl")
(let [iter (map-iterator {:a 1 :b 2})]
  (do
    (let [entry (iterator-next iter)]
      (print (:key entry)))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('a');
    });

    it('23. filtered-iterator filtering', () => {
      const code = `
(load "src/iterators.fl")
(let [base (array-iterator [1 2 3 4 5])
      iter (filtered-iterator base (fn [x] (> x 2)))]
  (print (iterator-to-list iter)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('3');
    });

    it('24. mapped-iterator transformation', () => {
      const code = `
(load "src/iterators.fl")
(let [base (array-iterator [1 2 3])
      iter (mapped-iterator base (fn [x] (* x 2)))]
  (print (iterator-to-list iter)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('2');
    });

    it('25. fibonacci-iterator sequence', () => {
      const code = `
(load "src/iterators.fl")
(let [iter (fibonacci-iterator 6)]
  (print (iterator-to-list iter)))
      `;
      const output = runFlCode(code);
      expect(output).toContain('0');
    });
  });
});
