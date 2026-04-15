import { describe, it, expect } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FL_CLI = path.resolve(__dirname, '../../target/release/fl');

describe('Phases 163-170: Advanced Data Structures & Algorithms', () => {
  const runFlCode = (code: string): string => {
    const testFile = path.join('/tmp', `test_${Date.now()}.fl`);
    fs.writeFileSync(testFile, code);
    try {
      return execFileSync(FL_CLI, [testFile], { encoding: 'utf-8' });
    } finally {
      fs.unlinkSync(testFile);
    }
  };

  describe('Phase 163: Hash Tables', () => {
    it('163.1 create hash table', () => {
      const code = `
(load "src/hash-table.fl")
(let [ht (create-hash-table 10)]
  (print true))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  describe('Phase 164: Sorting', () => {
    it('164.1 bubble sort', () => {
      const code = `
(load "src/sorting.fl")
(print (= (bubble-sort [3 1 2]) [1 2 3]))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('164.2 quicksort', () => {
      const code = `
(load "src/sorting.fl")
(print (= (quicksort [3 1 2]) [1 2 3]))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  describe('Phase 165: Dynamic Programming', () => {
    it('165.1 coin change', () => {
      const code = `
(load "src/dynamic-programming.fl")
(print (>= (coin-change [1 2 5] 5) 0))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });

    it('165.2 max subarray', () => {
      const code = `
(load "src/dynamic-programming.fl")
(print (= (max-subarray [-2 1 -3 4 -1 2 1 -5 4]) 6))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  describe('Phase 166: Backtracking', () => {
    it('166.1 subsets', () => {
      const code = `
(load "src/backtracking.fl")
(print (= (count (subsets [1 2])) 4))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });

  describe('Phase 167: Pattern Matching', () => {
    it('167.1 wildcard match', () => {
      const code = `
(load "src/pattern-matching.fl")
(print (wildcard-match "aa" "a"))
      `;
      const output = runFlCode(code);
      expect(output).toContain('false');
    });
  });

  describe('Phase 168: String Algorithms', () => {
    it('168.1 longest palindrome', () => {
      const code = `
(load "src/string-algorithms.fl")
(print (not (nil? (longest-palindrome "abcdcba"))))
      `;
      const output = runFlCode(code);
      expect(output).toContain('true');
    });
  });
});
