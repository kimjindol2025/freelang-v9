// FreeLang v9 — Phase 154: Performance Profiling & Flame Graph Tests

import { Interpreter } from '../interpreter';

describe('Phase 154: Performance Profiling & Flame Graphs', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: CPU Profiling
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Profile CPU with sampling and throughput calculation', () => {
    const code = `
      (load "src/profiler.fl")
      (let [test-fn (fn [] (reduce + 0 (range 100)))
            profile (profile-cpu test-fn 1000 :sample-interval 10)]
        {:has-iterations (= (:iterations profile) 1000)
         :has-total-ms (not (nil? (:total-ms profile)))
         :has-avg-ms (> (:avg-ms profile) 0)
         :has-throughput (> (:throughput profile) 0)
         :has-min-max (and (not (nil? (:min-ms profile))) (not (nil? (:max-ms profile))))})
    `;
    const result = interp.eval(code);
    expect(result['has-iterations']).toBe(true);
    expect(result['has-total-ms']).toBe(true);
    expect(result['has-avg-ms']).toBe(true);
    expect(result['has-throughput']).toBe(true);
    expect(result['has-min-max']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Memory Profiling
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Profile memory with heap tracking', () => {
    const code = `
      (load "src/profiler.fl")
      (let [test-fn (fn [] (vec (range 1000)))
            profile (profile-memory test-fn 100)]
        {:has-heap-before (not (nil? (:heap-before-mb profile)))
         :has-heap-after (not (nil? (:heap-after-mb profile)))
         :has-allocated (not (nil? (:allocated-mb profile)))
         :has-gc-time (not (nil? (:gc-time-ms profile)))
         :has-per-iter (not (nil? (:allocations-per-iter profile)))})
    `;
    const result = interp.eval(code);
    expect(result['has-heap-before']).toBe(true);
    expect(result['has-heap-after']).toBe(true);
    expect(result['has-allocated']).toBe(true);
    expect(result['has-gc-time']).toBe(true);
    expect(result['has-per-iter']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Find Hotspots (Slowest Functions)
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Detect hotspots from profile collection', () => {
    const code = `
      (load "src/profiler.fl")
      (let [profiles [{:function-name "func-a" :avg-ms 150}
                      {:function-name "func-b" :avg-ms 50}
                      {:function-name "func-c" :avg-ms 200}]
            hotspots (find-hotspots profiles 2)]
        {:count-limited (= (count hotspots) 2)
         :first-fastest (= (:function-name (first hotspots)) "func-c")
         :second-is-a (= (:function-name (second hotspots)) "func-a")})
    `;
    const result = interp.eval(code);
    expect(result['count-limited']).toBe(true);
    expect(result['first-fastest']).toBe(true);
    expect(result['second-is-a']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Latency Percentiles (p50, p95, p99)
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Calculate latency percentiles', () => {
    const code = `
      (load "src/profiler.fl")
      (let [latencies (range 1 101)
            stats (calculate-percentiles latencies)]
        {:has-p50 (not (nil? (:p50 stats)))
         :has-p95 (not (nil? (:p95 stats)))
         :has-p99 (not (nil? (:p99 stats)))
         :has-median (not (nil? (:median stats)))
         :has-stddev (not (nil? (:stddev stats)))
         :min-correct (= (:min stats) 1)
         :max-correct (= (:max stats) 100)})
    `;
    const result = interp.eval(code);
    expect(result['has-p50']).toBe(true);
    expect(result['has-p95']).toBe(true);
    expect(result['has-p99']).toBe(true);
    expect(result['has-median']).toBe(true);
    expect(result['has-stddev']).toBe(true);
    expect(result['min-correct']).toBe(true);
    expect(result['max-correct']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Time Distribution Analysis
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Analyze time distribution across functions', () => {
    const code = `
      (load "src/profiler.fl")
      (let [profiles [{:function-name "func-a" :total-ms 300}
                      {:function-name "func-b" :total-ms 200}]
            dist (analyze-time-distribution profiles)]
        {:has-percentages (every? (fn [p] (not (nil? (:time-percentage p)))) dist)
         :first-percentage (= (Math/round (* 100 (:time-percentage (first dist)))) 60)})
    `;
    const result = interp.eval(code);
    expect(result['has-percentages']).toBe(true);
    expect(result['first-percentage']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Memory Leak Detection
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Detect potential memory leaks', () => {
    const code = `
      (load "src/profiler.fl")
      (let [profiles [{:iteration 0 :heap-after-mb 100 :allocated-mb 10}
                      {:iteration 1 :heap-after-mb 110 :allocated-mb 10}
                      {:iteration 2 :heap-after-mb 120 :allocated-mb 10}]
            result (detect-memory-leak profiles 5.0)]
        {:has-avg-growth (not (nil? (:average-growth-mb result)))
         :has-potential-leak (boolean? (:potential-leak result))
         :has-details (vector? (:details result))})
    `;
    const result = interp.eval(code);
    expect(result['has-avg-growth']).toBe(true);
    expect(result['has-potential-leak']).toBe(true);
    expect(result['has-details']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: Compare Two Functions
  // ─────────────────────────────────────────────────────────────────────────
  test('7. Compare performance of two functions', () => {
    const code = `
      (load "src/profiler.fl")
      (let [fn1 (fn [] (reduce + 0 (range 10)))
            fn2 (fn [] (reduce + 0 (range 20)))
            comparison (compare-functions fn1 fn2 100)]
        {:has-profile1 (not (nil? (:function1 comparison)))
         :has-profile2 (not (nil? (:function2 comparison)))
         :has-speedup (not (nil? (:speedup-factor comparison)))
         :has-faster (not (nil? (:faster comparison)))})
    `;
    const result = interp.eval(code);
    expect(result['has-profile1']).toBe(true);
    expect(result['has-profile2']).toBe(true);
    expect(result['has-speedup']).toBe(true);
    expect(result['has-faster']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Generate Performance Report
  // ─────────────────────────────────────────────────────────────────────────
  test('8. Generate comprehensive performance report', () => {
    const code = `
      (load "src/profiler.fl")
      (let [profiles [{:function-name "op1" :total-ms 100 :iterations 10}
                      {:function-name "op2" :total-ms 50 :iterations 10}]
            report (generate-performance-report profiles)]
        {:has-total-execution (not (nil? (:total-execution-ms report)))
         :has-total-iterations (not (nil? (:total-iterations report)))
         :has-hotspots (vector? (:hotspots report))
         :has-profile-count (> (:profile-count report) 0)})
    `;
    const result = interp.eval(code);
    expect(result['has-total-execution']).toBe(true);
    expect(result['has-total-iterations']).toBe(true);
    expect(result['has-hotspots']).toBe(true);
    expect(result['has-profile-count']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: Stack Trace Processing
  // ─────────────────────────────────────────────────────────────────────────
  test('9. Normalize and aggregate stack frames', () => {
    const code = `
      (load "src/flamegraph.fl")
      (let [frame "main;utils.fl;42"
            normalized (normalize-frame frame)]
        {:has-func-name (str-includes? normalized "main")
         :has-file (str-includes? normalized "utils.fl")
         :has-line (str-includes? normalized "42")})
    `;
    const result = interp.eval(code);
    expect(result['has-func-name']).toBe(true);
    expect(result['has-file']).toBe(true);
    expect(result['has-line']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: Generate Flame Graph SVG
  // ─────────────────────────────────────────────────────────────────────────
  test('10. Generate Flame Graph SVG visualization', () => {
    const code = `
      (load "src/flamegraph.fl")
      (let [samples [{:stack ["main" "process" "calc"] :time 100}
                     {:stack ["main" "process" "calc"] :time 50}]
            svg (generate-flame-graph-svg samples :width 1200 :height 600)]
        {:is-string (string? svg)
         :has-svg-tag (str-includes? svg "<svg")
         :has-width (str-includes? svg "1200")
         :has-height (str-includes? svg "600")
         :has-rect (str-includes? svg "<rect")
         :has-text (str-includes? svg "<text")})
    `;
    const result = interp.eval(code);
    expect(result['is-string']).toBe(true);
    expect(result['has-svg-tag']).toBe(true);
    expect(result['has-width']).toBe(true);
    expect(result['has-height']).toBe(true);
    expect(result['has-rect']).toBe(true);
    expect(result['has-text']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: HTML Report Generation
  // ─────────────────────────────────────────────────────────────────────────
  test('11. Generate HTML performance report', () => {
    const code = `
      (load "src/flamegraph.fl")
      (let [profiles [{:function-name "op1" :avg-ms 100 :total-ms 1000 :iterations 10}]
            result (generate-html-report profiles "/tmp/test-report.html")]
        {:ok-result (:ok result)
         :has-file (string? (:file result))})
    `;
    const result = interp.eval(code);
    expect(result['ok-result']).toBe(true);
    expect(result['has-file']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: JSON Profile Export
  // ─────────────────────────────────────────────────────────────────────────
  test('12. Export profile data as JSON', () => {
    const code = `
      (load "src/flamegraph.fl")
      (let [profiles [{:function-name "op1" :avg-ms 100 :total-ms 1000 :iterations 10}]
            result (export-profile-json profiles "/tmp/test-profile.json")]
        {:ok-result (:ok result)
         :has-file (string? (:file result))})
    `;
    const result = interp.eval(code);
    expect(result['ok-result']).toBe(true);
    expect(result['has-file']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 13: Benchmark Comparison Chart
  // ─────────────────────────────────────────────────────────────────────────
  test('13. Visualize benchmark comparison with Chart.js', () => {
    const code = `
      (load "src/flamegraph.fl")
      (let [comparisons [{:name "Benchmark A" :avg-ms 150}
                         {:name "Benchmark B" :avg-ms 100}]
            result (visualize-benchmark-comparison comparisons "/tmp/compare.html")]
        {:ok-result (:ok result)
         :has-file (string? (:file result))})
    `;
    const result = interp.eval(code);
    expect(result['ok-result']).toBe(true);
    expect(result['has-file']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 14: Build Complete Performance Report
  // ─────────────────────────────────────────────────────────────────────────
  test('14. Build integrated performance report with all formats', () => {
    const code = `
      (load "src/flamegraph.fl")
      (let [profiles [{:function-name "op1" :avg-ms 100 :total-ms 1000 :iterations 10}]
            result (build-performance-report profiles
                     :output-dir "/tmp/profile-output"
                     :include-html true
                     :include-json true
                     :include-flamegraph true)]
        {:ok-result (:ok result)
         :has-dir (string? (:report-dir result))
         :has-files (not (nil? (:files result)))})
    `;
    const result = interp.eval(code);
    expect(result['ok-result']).toBe(true);
    expect(result['has-dir']).toBe(true);
    expect(result['has-files']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 15: Throughput Analysis
  // ─────────────────────────────────────────────────────────────────────────
  test('15. Analyze throughput (RPS) metrics', () => {
    const code = `
      (load "src/profiler.fl")
      (let [profiles [{:function-name "api-call" :throughput 1000}
                      {:function-name "process" :throughput 500}]
            analyzed (analyze-throughput profiles)]
        {:has-rps (every? (fn [p] (not (nil? (:rps p)))) analyzed)
         :first-rps (= (:rps (first analyzed)) 1000)})
    `;
    const result = interp.eval(code);
    expect(result['has-rps']).toBe(true);
    expect(result['first-rps']).toBe(true);
  });
});
