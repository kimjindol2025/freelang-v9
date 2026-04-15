// FreeLang v9 — Phase 153: Distributed Tracing Tests

import { Interpreter } from '../interpreter';

describe('Phase 153: Distributed Tracing', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Trace ID Generation
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Generate trace ID (32 hex characters)', () => {
    const code = `
      (load "src/tracing.fl")
      (let [trace-id (generate-trace-id)]
        {:is-string (string? trace-id)
         :correct-length (= (count trace-id) 32)
         :is-hex (every? (fn [c]
           (contains? #{"0" "1" "2" "3" "4" "5" "6" "7" "8" "9" "a" "b" "c" "d" "e" "f"} (str c)))
           (seq trace-id))})
    `;
    const result = interp.eval(code);
    expect(result['is-string']).toBe(true);
    expect(result['correct-length']).toBe(true);
    expect(result['is-hex']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Span ID Generation
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Generate span ID (16 hex characters)', () => {
    const code = `
      (load "src/tracing.fl")
      (let [span-id (generate-span-id)]
        {:is-string (string? span-id)
         :correct-length (= (count span-id) 16)})
    `;
    const result = interp.eval(code);
    expect(result['is-string']).toBe(true);
    expect(result['correct-length']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Create Span
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Create span with attributes', () => {
    const code = `
      (load "src/tracing.fl")
      (let [span (create-span "abc123" "parent123" "GetUser")]
        {:operation (= (:operation span) "GetUser")
         :has-span-id (string? (:span-id span))
         :has-trace-id (= (:trace-id span) "abc123")
         :status-running (= (:status span) :running)})
    `;
    const result = interp.eval(code);
    expect(result.operation).toBe(true);
    expect(result['has-span-id']).toBe(true);
    expect(result['has-trace-id']).toBe(true);
    expect(result['status-running']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Add tag to span
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Add tag to span', () => {
    const code = `
      (load "src/tracing.fl")
      (let [span (create-span "abc123" "parent123" "GetUser")
            with-tag (add-tag span "http.status" 200)]
        {:tag-added (= (get (:tags with-tag) "http.status") 200)})
    `;
    const result = interp.eval(code);
    expect(result['tag-added']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Add log to span
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Add log to span', () => {
    const code = `
      (load "src/tracing.fl")
      (let [span (create-span "abc123" "parent123" "GetUser")
            with-log (add-log span (now) "User found")]
        {:log-added (= (count (:logs with-log)) 1)
         :log-message (= (:message (first (:logs with-log))) "User found")})
    `;
    const result = interp.eval(code);
    expect(result['log-added']).toBe(true);
    expect(result['log-message']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Finish span
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Finish span and record duration', () => {
    const code = `
      (load "src/tracing.fl")
      (let [span (create-span "abc123" "parent123" "GetUser")
            finished (finish-span span :status :success)]
        {:has-end-time (not (nil? (:end-time finished)))
         :has-duration (not (nil? (:duration-ms finished)))
         :status-success (= (:status finished) :success)})
    `;
    const result = interp.eval(code);
    expect(result['has-end-time']).toBe(true);
    expect(result['has-duration']).toBe(true);
    expect(result['status-success']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: Create context
  // ─────────────────────────────────────────────────────────────────────────
  test('7. Create trace context', () => {
    const code = `
      (load "src/tracing.fl")
      (let [ctx (create-context)]
        {:has-trace-id (string? (:trace-id ctx))
         :has-span-id (string? (:span-id ctx))
         :sampled (= (:sampled ctx) true)
         :empty-baggage (= (count (:baggage ctx)) 0)})
    `;
    const result = interp.eval(code);
    expect(result['has-trace-id']).toBe(true);
    expect(result['has-span-id']).toBe(true);
    expect(result.sampled).toBe(true);
    expect(result['empty-baggage']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Serialize to W3C traceparent header
  // ─────────────────────────────────────────────────────────────────────────
  test('8. Serialize context to W3C traceparent header', () => {
    const code = `
      (load "src/tracing.fl")
      (let [ctx (create-context :trace-id "abc123def456" :span-id "xyz789" :sampled true)
            header (serialize-traceparent ctx)]
        {:format-valid (str-starts-with? header "00-")
         :has-trace (str-includes? header "abc123def456")
         :has-span (str-includes? header "xyz789")})
    `;
    const result = interp.eval(code);
    expect(result['format-valid']).toBe(true);
    expect(result['has-trace']).toBe(true);
    expect(result['has-span']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: Deserialize from W3C traceparent header
  // ─────────────────────────────────────────────────────────────────────────
  test('9. Deserialize context from W3C traceparent', () => {
    const code = `
      (load "src/tracing.fl")
      (let [header "00-abc123def456-xyz789-01"
            ctx (deserialize-traceparent header)]
        {:parsed (not (nil? ctx))
         :sampled (:sampled ctx)})
    `;
    const result = interp.eval(code);
    expect(result.parsed).toBe(true);
    expect(result.sampled).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: Inject context into HTTP headers
  // ─────────────────────────────────────────────────────────────────────────
  test('10. Inject context into HTTP headers', () => {
    const code = `
      (load "src/tracing.fl")
      (let [ctx (create-context)
            headers (inject-context {:authorization "Bearer token"} ctx)]
        {:has-traceparent (contains? headers :traceparent)
         :has-tracestate (contains? headers :tracestate)
         :has-auth (contains? headers :authorization)})
    `;
    const result = interp.eval(code);
    expect(result['has-traceparent']).toBe(true);
    expect(result['has-tracestate']).toBe(true);
    expect(result['has-auth']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Extract context from HTTP headers
  // ─────────────────────────────────────────────────────────────────────────
  test('11. Extract context from HTTP headers', () => {
    const code = `
      (load "src/tracing.fl")
      (let [original (create-context)
            headers (inject-context {} original)
            extracted (extract-context headers)]
        {:has-trace-id (= (:trace-id extracted) (:trace-id original))
         :sampled (:sampled extracted)})
    `;
    const result = interp.eval(code);
    expect(result['has-trace-id']).toBe(true);
    expect(result.sampled).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: With Span (instrumentation)
  // ─────────────────────────────────────────────────────────────────────────
  test('12. Execute function with automatic span', () => {
    const code = `
      (load "src/tracing.fl")
      (let [ctx (create-context)
            result (with-span ctx "TestOp" (fn [] 42))]
        {:has-span (contains? result :span)
         :result-ok (= (:result result) 42)
         :no-error (nil? (:error result))
         :span-finished (not (nil? (:end-time (:span result))))})
    `;
    const result = interp.eval(code);
    expect(result['has-span']).toBe(true);
    expect(result['result-ok']).toBe(true);
    expect(result['no-error']).toBe(true);
    expect(result['span-finished']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 13: Baggage management
  // ─────────────────────────────────────────────────────────────────────────
  test('13. Add and retrieve baggage from context', () => {
    const code = `
      (load "src/tracing.fl")
      (let [ctx (create-context)
            with-baggage (add-baggage ctx "user-id" "123")
            value (get-baggage with-baggage "user-id")]
        {:baggage-added (= value "123")})
    `;
    const result = interp.eval(code);
    expect(result['baggage-added']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 14: Calculate span metrics
  // ─────────────────────────────────────────────────────────────────────────
  test('14. Calculate metrics from spans', () => {
    const code = `
      (load "src/tracing.fl")
      (let [span1 (finish-span (create-span "abc" "parent" "Op1") :status :success)
            span2 (finish-span (create-span "abc" "parent" "Op2") :status :error)
            metrics (calculate-span-metrics [span1 span2])]
        {:total-spans (= (:total-spans metrics) 2)
         :errors (= (:errors metrics) 1)
         :has-avg (not (nil? (:average-duration-ms metrics)))})
    `;
    const result = interp.eval(code);
    expect(result['total-spans']).toBe(true);
    expect(result.errors).toBe(true);
    expect(result['has-avg']).toBe(true);
  });
});
