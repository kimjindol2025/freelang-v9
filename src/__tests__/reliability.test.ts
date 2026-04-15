// FreeLang v9 — Phase 151: Reliability Tests

import { Interpreter } from '../interpreter';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 151: Reliability Layer', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Circuit Breaker 생성
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Circuit Breaker 생성 및 초기 상태 확인', () => {
    const code = `
      (load "src/reliability.fl")
      (let [cb (create-circuit-breaker :failure-threshold 3 :success-threshold 2)]
        {:id (string? (:id cb))
         :state (= (:state cb) :closed)
         :fail-count (= (:fail-count cb) 0)})
    `;
    const result = interp.eval(code);
    expect(result.id).toBe(true);
    expect(result.state).toBe(true);
    expect(result.fail-count).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Circuit Breaker CLOSED 상태 — 정상 호출
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Circuit Breaker CLOSED 상태 — 정상 호출 성공', () => {
    const code = `
      (load "src/reliability.fl")
      (let [cb (create-circuit-breaker)
            result (call-with-breaker cb (fn [] 42))]
        {:ok (:ok result)
         :result (:result result)
         :state (= (get-circuit-state (:breaker result)) :closed)})
    `;
    const result = interp.eval(code);
    expect(result.ok).toBe(true);
    expect(result.result).toBe(42);
    expect(result.state).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Circuit Breaker CLOSED → OPEN 전환
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Circuit Breaker CLOSED → OPEN 전환 (실패 누적)', () => {
    const code = `
      (load "src/reliability.fl")
      (let [cb (create-circuit-breaker :failure-threshold 2)
            err-fn (fn [] (throw "error"))
            r1 (call-with-breaker cb err-fn)
            r2 (call-with-breaker (:breaker r1) err-fn)
            r3 (call-with-breaker (:breaker r2) err-fn)]
        (= (get-circuit-state (:breaker r3)) :open))
    `;
    const result = interp.eval(code);
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Circuit Breaker OPEN — 빠른 실패
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Circuit Breaker OPEN — 빠른 실패 (fail-fast)', () => {
    const code = `
      (load "src/reliability.fl")
      (let [cb (create-circuit-breaker :failure-threshold 1)
            err-fn (fn [] (throw "error"))
            r1 (call-with-breaker cb err-fn)
            r2 (call-with-breaker (:breaker r1) (fn [] 42))]
        {:ok (:ok r2)
         :error (string? (:error r2))
         :state (= (get-circuit-state (:breaker r2)) :open)})
    `;
    const result = interp.eval(code);
    expect(result.ok).toBe(false);
    expect(result.error).toBe(true);
    expect(result.state).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Exponential Backoff 계산
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Exponential Backoff 계산', () => {
    const code = `
      (load "src/reliability.fl")
      (let [b0 (calculate-backoff 0 :base 100 :max-delay 10000)
            b1 (calculate-backoff 1 :base 100 :max-delay 10000)
            b2 (calculate-backoff 2 :base 100 :max-delay 10000)]
        {:b0-range (and (>= b0 100) (<= b0 120))
         :b1-range (and (>= b1 100) (<= b1 240))
         :b2-range (and (>= b2 100) (<= b2 480))})
    `;
    const result = interp.eval(code);
    expect(result['b0-range']).toBe(true);
    expect(result['b1-range']).toBe(true);
    expect(result['b2-range']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Backoff Sequence 생성
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Backoff Sequence 생성', () => {
    const code = `
      (load "src/reliability.fl")
      (let [seq (backoff-sequence :base 100 :max-attempts 3)]
        {:count (= (count seq) 3)
         :all-numbers (every? number? seq)
         :increasing (and (>= (nth seq 1) (nth seq 0))
                         (>= (nth seq 2) (nth seq 1)))})
    `;
    const result = interp.eval(code);
    expect(result.count).toBe(true);
    expect(result['all-numbers']).toBe(true);
    expect(result.increasing).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: Retry with Backoff (성공하는 경우)
  // ─────────────────────────────────────────────────────────────────────────
  test('7. Retry with Backoff — 재시도 없이 성공', () => {
    const code = `
      (load "src/reliability.fl")
      (let [counter (atom 0)
            fn (fn []
              (swap! counter inc)
              (if (= @counter 1) 100 (throw "should not reach")))
            result (retry-with-backoff fn :max-attempts 3)]
        {:result (= result 100)
         :attempts (= @counter 1)})
    `;
    const result = interp.eval(code);
    expect(result.result).toBe(true);
    expect(result.attempts).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Retry with Backoff (재시도 후 성공)
  // ─────────────────────────────────────────────────────────────────────────
  test('8. Retry with Backoff — 재시도 후 성공', () => {
    const code = `
      (load "src/reliability.fl")
      (let [counter (atom 0)
            fn (fn []
              (swap! counter inc)
              (if (>= @counter 2) "success" (throw "not yet")))
            result (retry-with-backoff fn :max-attempts 3 :base-delay 10)]
        {:result (= result "success")
         :attempts (= @counter 2)})
    `;
    const result = interp.eval(code);
    expect(result.result).toBe(true);
    expect(result.attempts).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: With Fallback
  // ─────────────────────────────────────────────────────────────────────────
  test('9. With Fallback — Primary 실패 시 Fallback 실행', () => {
    const code = `
      (load "src/reliability.fl")
      (let [primary (fn [] (throw "primary failed"))
            fallback (fn [] "fallback result")
            result (with-fallback primary fallback)]
        (= result "fallback result"))
    `;
    const result = interp.eval(code);
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: Chain Fallbacks
  // ─────────────────────────────────────────────────────────────────────────
  test('10. Chain Fallbacks — 순차 실행', () => {
    const code = `
      (load "src/reliability.fl")
      (let [fns [(fn [] (throw "f1"))
                 (fn [] (throw "f2"))
                 (fn [] "success")]]
        (= (chain-fallbacks fns) "success"))
    `;
    const result = interp.eval(code);
    expect(result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Circuit Breaker 메트릭
  // ─────────────────────────────────────────────────────────────────────────
  test('11. Circuit Breaker 메트릭 조회', () => {
    const code = `
      (load "src/reliability.fl")
      (let [cb (create-circuit-breaker)
            metrics (get-breaker-metrics cb)]
        {:has-id (string? (:id metrics))
         :has-state (keyword? (:state metrics))
         :is-healthy (= (:is-healthy metrics) true)})
    `;
    const result = interp.eval(code);
    expect(result['has-id']).toBe(true);
    expect(result['has-state']).toBe(true);
    expect(result['is-healthy']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: Breaker Pool 관리
  // ─────────────────────────────────────────────────────────────────────────
  test('12. Breaker Pool — 여러 Circuit Breaker 관리', () => {
    const code = `
      (load "src/reliability.fl")
      (let [pool (create-breaker-pool ["api1" "api2" "api3"] {})
            has-api1 (contains? pool :api1)
            has-api2 (contains? pool :api2)
            count (= (count (keys pool)) 3)]
        {:has-api1 has-api1
         :has-api2 has-api2
         :count count})
    `;
    const result = interp.eval(code);
    expect(result['has-api1']).toBe(true);
    expect(result['has-api2']).toBe(true);
    expect(result.count).toBe(true);
  });
});
