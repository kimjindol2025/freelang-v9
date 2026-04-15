// FreeLang v9 — Phase 155: Metrics Collection & Aggregation Tests

import { Interpreter } from '../interpreter';

describe('Phase 155: Metrics Collection & Aggregation', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
  });

  beforeEach(() => {
    const resetCode = `(load "src/metrics.fl") (reset-metrics)`;
    interp.eval(resetCode);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Counter Metric Creation
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Create and increment counter metric', () => {
    const code = `
      (load "src/metrics.fl")
      (let [counter (create-counter "requests_total" "Total HTTP requests")
            id (:name counter)]
        (increment-counter id :amount 5)
        (let [metric (get-metric id)]
          {:type (= (:type counter) :counter)
           :value (= (:value metric) 5)
           :help-set (string? (:help counter))}))
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.value).toBe(true);
    expect(result['help-set']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Gauge Metric
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Create and set gauge metric', () => {
    const code = `
      (load "src/metrics.fl")
      (let [gauge (create-gauge "temperature_celsius" "Room temperature" :initial-value 20)
            id (:name gauge)]
        (set-gauge id 25)
        (let [metric (get-metric id)]
          {:type (= (:type gauge) :gauge)
           :value (= (:value metric) 25)}))
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.value).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Histogram Metric
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Create and observe histogram', () => {
    const code = `
      (load "src/metrics.fl")
      (let [hist (create-histogram "request_duration_seconds" "Request latency")
            id (:name hist)]
        (observe-histogram id 0.05)
        (observe-histogram id 0.1)
        (let [metric (get-metric id)]
          {:type (= (:type hist) :histogram)
           :count (= (:count metric) 2)
           :sum-positive (> (:sum metric) 0)}))
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.count).toBe(true);
    expect(result['sum-positive']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Summary Metric
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Create and observe summary', () => {
    const code = `
      (load "src/metrics.fl")
      (let [summary (create-summary "gc_duration_seconds" "GC pause duration")
            id (:name summary)]
        (observe-summary id 0.05)
        (observe-summary id 0.03)
        (let [metric (get-metric id)]
          {:type (= (:type summary) :summary)
           :count (= (:count metric) 2)
           :values-stored (= (count (:values metric)) 2)}))
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.count).toBe(true);
    expect(result['values-stored']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Metric Aggregation (Sum/Avg/Max/Min)
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Aggregate metrics (sum, avg, max, min)', () => {
    const code = `
      (load "src/metrics.fl")
      (let [g1 (create-gauge "metric" "Test" :initial-value 10)
            g2 (create-gauge "metric" "Test" :initial-value 20)
            g3 (create-gauge "metric" "Test" :initial-value 30)
            metrics (query-metrics-by-name "metric")
            sum (aggregate-sum metrics)
            avg (aggregate-avg metrics)
            max (aggregate-max metrics)
            min (aggregate-min metrics)]
        {:sum-correct (= sum 60)
         :avg-correct (= avg 20)
         :max-correct (= max 30)
         :min-correct (= min 10)})
    `;
    const result = interp.eval(code);
    expect(result['sum-correct']).toBe(true);
    expect(result['avg-correct']).toBe(true);
    expect(result['max-correct']).toBe(true);
    expect(result['min-correct']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Prometheus Text Format Generation
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Generate Prometheus text exposition format', () => {
    const code = `
      (load "src/prometheus-exporter.fl")
      (let [counter (create-counter "test_counter" "Test counter")
            id (:name counter)]
        (increment-counter id :amount 42)
        (let [text (generate-prometheus-text)]
          {:has-help (str-includes? text "HELP test_counter")
           :has-type (str-includes? text "TYPE test_counter counter")
           :has-value (str-includes? text " 42")}))
    `;
    const result = interp.eval(code);
    expect(result['has-help']).toBe(true);
    expect(result['has-type']).toBe(true);
    expect(result['has-value']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: Histogram Percentile Calculation
  // ─────────────────────────────────────────────────────────────────────────
  test('7. Calculate histogram percentiles', () => {
    const code = `
      (load "src/metrics.fl")
      (let [hist (create-histogram "latency" "Latency distribution")
            id (:name hist)]
        (observe-histogram id 0.01)
        (observe-histogram id 0.05)
        (observe-histogram id 0.1)
        (let [p50 (histogram-percentile id 0.5)
              p95 (histogram-percentile id 0.95)]
          {:p50-exists (not (nil? p50))
           :p95-exists (not (nil? p95))}))
    `;
    const result = interp.eval(code);
    expect(result['p50-exists']).toBe(true);
    expect(result['p95-exists']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Cardinality Check
  // ─────────────────────────────────────────────────────────────────────────
  test('8. Check metrics cardinality limits', () => {
    const code = `
      (load "src/metrics.fl")
      (create-gauge "metric1" "Test")
      (create-gauge "metric2" "Test")
      (create-gauge "metric3" "Test")
      (let [cardinality (check-cardinality :limit 1000)]
        {:within-limit (:within-limit cardinality)
         :has-usage (:usage-percentage cardinality)})
    `;
    const result = interp.eval(code);
    expect(result['within-limit']).toBe(true);
    expect(typeof result['has-usage']).toBe('number');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: Memory Estimation
  // ─────────────────────────────────────────────────────────────────────────
  test('9. Estimate metrics memory usage', () => {
    const code = `
      (load "src/metrics.fl")
      (create-gauge "metric1" "Test")
      (create-counter "metric2" "Test")
      (let [memory (estimate-metrics-memory)]
        {:has-count (number? (:metric-count memory))
         :has-samples (number? (:sample-count memory))
         :has-mb (number? (:estimated-mb memory))})
    `;
    const result = interp.eval(code);
    expect(result['has-count']).toBe(true);
    expect(result['has-samples']).toBe(true);
    expect(result['has-mb']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: Alert Rule Creation
  // ─────────────────────────────────────────────────────────────────────────
  test('10. Define alert rule', () => {
    const code = `
      (load "src/alerting.fl")
      (let [rule (define-alert-rule "high-cpu"
                   :expr "cpu_usage > 80"
                   :duration-seconds 300
                   :severity :critical
                   :description "CPU above 80%")]
        {:name (= (:name rule) "high-cpu")
         :severity (= (:severity rule) :critical)
         :duration (= (:duration-seconds rule) 300)})
    `;
    const result = interp.eval(code);
    expect(result.name).toBe(true);
    expect(result.severity).toBe(true);
    expect(result.duration).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Fire and Resolve Alert
  // ─────────────────────────────────────────────────────────────────────────
  test('11. Fire and resolve alert', () => {
    const code = `
      (load "src/alerting.fl")
      (define-alert-rule "test-alert"
        :severity :warning
        :description "Test alert")
      (let [fired (fire-alert "test-alert" :value 95)
            resolved (resolve-alert "test-alert")]
        {:fired (string? (:alert-name fired))
         :resolved (string? (:alert-name resolved))})
    `;
    const result = interp.eval(code);
    expect(result.fired).toBe(true);
    expect(result.resolved).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: Alert State Transitions
  // ─────────────────────────────────────────────────────────────────────────
  test('12. Alert state machine transitions', () => {
    const code = `
      (load "src/alerting.fl")
      (define-alert-rule "state-test" :duration-seconds 1)
      (fire-alert "state-test" :value 100)
      (let [stats (alert-statistics)]
        {:has-rules (> (:total-rules stats) 0)
         :has-active (number? (:active-alerts stats))})
    `;
    const result = interp.eval(code);
    expect(result['has-rules']).toBe(true);
    expect(result['has-active']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 13: Metrics Statistics
  // ─────────────────────────────────────────────────────────────────────────
  test('13. Get metrics system statistics', () => {
    const code = `
      (load "src/metrics.fl")
      (create-counter "cnt1" "Test")
      (create-gauge "gag1" "Test")
      (create-histogram "hist1" "Test")
      (let [stats (metrics-stats)]
        {:has-total (> (:total-metrics stats) 0)
         :has-types (:by-type stats)
         :has-memory (:memory-estimate stats)})
    `;
    const result = interp.eval(code);
    expect(result['has-total']).toBe(true);
    expect(result['has-types']).toBeDefined();
    expect(result['has-memory']).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 14: Metric Filtering
  // ─────────────────────────────────────────────────────────────────────────
  test('14. Filter metrics by type and label', () => {
    const code = `
      (load "src/prometheus-exporter.fl")
      (create-counter "req_total" "Requests")
      (create-counter "err_total" "Errors")
      (create-gauge "mem_usage" "Memory")
      (let [counters (filter-metrics-by-type :counter)
            gauges (filter-metrics-by-type :gauge)]
        {:counters (> (count counters) 0)
         :gauges (> (count gauges) 0)})
    `;
    const result = interp.eval(code);
    expect(result.counters).toBe(true);
    expect(result.gauges).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 15: Scrape Configuration Generation
  // ─────────────────────────────────────────────────────────────────────────
  test('15. Generate Prometheus scrape configuration', () => {
    const code = `
      (load "src/prometheus-exporter.fl")
      (let [config (generate-scrape-config "freelang-app" "localhost:8080"
                     :interval-seconds 30
                     :timeout-seconds 10)]
        {:has-job (str-includes? config "job_name: 'freelang-app'")
         :has-interval (str-includes? config "30s")
         :has-timeout (str-includes? config "10s")
         :has-path (str-includes? config "metrics_path")})
    `;
    const result = interp.eval(code);
    expect(result['has-job']).toBe(true);
    expect(result['has-interval']).toBe(true);
    expect(result['has-timeout']).toBe(true);
    expect(result['has-path']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 16: Gauge Update (Increment/Decrement)
  // ─────────────────────────────────────────────────────────────────────────
  test('16. Update gauge with positive and negative deltas', () => {
    const code = `
      (load "src/metrics.fl")
      (let [gauge (create-gauge "pool-size" "Connection pool size" :initial-value 10)
            id (:name gauge)]
        (update-gauge id 5)
        (update-gauge id -3)
        (let [metric (get-metric id)]
          {:value (= (:value metric) 12)}))
    `;
    const result = interp.eval(code);
    expect(result.value).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 17: Rate Calculation
  // ─────────────────────────────────────────────────────────────────────────
  test('17. Calculate metric rate of change', () => {
    const code = `
      (load "src/metrics.fl")
      (let [counter (create-counter "operations" "Operation count")
            id (:name counter)]
        (increment-counter id :amount 10)
        (let [rate (calculate-rate id 1000)]
          {:rate-exists (number? rate)}))
    `;
    const result = interp.eval(code);
    expect(result['rate-exists']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 18: List All Metrics
  // ─────────────────────────────────────────────────────────────────────────
  test('18. List all registered metrics', () => {
    const code = `
      (load "src/metrics.fl")
      (create-counter "http_requests" "HTTP requests")
      (create-gauge "memory_bytes" "Memory usage")
      (let [all (list-all-metrics)]
        {:count (= (count all) 2)
         :has-ids (every? (fn [m] (string? (:id m))) all)
         :has-names (every? (fn [m] (string? (:name m))) all)})
    `;
    const result = interp.eval(code);
    expect(result.count).toBe(true);
    expect(result['has-ids']).toBe(true);
    expect(result['has-names']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 19: Alert History Recording
  // ─────────────────────────────────────────────────────────────────────────
  test('19. Record and retrieve alert history', () => {
    const code = `
      (load "src/alerting.fl")
      (define-alert-rule "alert-history-test")
      (record-alert-event "alert-history-test" :FIRING :value 95)
      (record-alert-event "alert-history-test" :RESOLVED)
      (let [history (get-alert-history "alert-history-test")]
        {:count (= (count history) 2)
         :has-events (every? (fn [e] (not (nil? (:event-type e)))) history)})
    `;
    const result = interp.eval(code);
    expect(result.count).toBe(true);
    expect(result['has-events']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 20: Active Alerts Count
  // ─────────────────────────────────────────────────────────────────────────
  test('20. Count active (firing) alerts', () => {
    const code = `
      (load "src/alerting.fl")
      (define-alert-rule "alert1")
      (define-alert-rule "alert2")
      (fire-alert "alert1" :value 100)
      (let [count (count-active-alerts)]
        {:count (> count 0)})
    `;
    const result = interp.eval(code);
    expect(result.count).toBe(true);
  });
});
