// FreeLang v9 — Phase 157: Online Learning & Adaptive Optimizers Tests

import { Interpreter } from '../interpreter';

describe('Phase 157: Online Learning & Adaptive Algorithms', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: SGD Optimizer Creation
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Create SGD optimizer', () => {
    const code = `
      (load "src/sgd.fl")
      (let [sgd (create-sgd-optimizer :learning-rate 0.01)]
        {:type (= (:type sgd) :sgd)
         :lr (= (:learning-rate sgd) 0.01)
         :iteration (= (:iteration sgd) 0)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.lr).toBe(true);
    expect(result.iteration).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: SGD Single Step
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Perform SGD single step', () => {
    const code = `
      (load "src/sgd.fl")
      (let [params (create-vector [1.0 2.0])
            grads (create-vector [0.1 0.2])
            sgd (create-sgd-optimizer :learning-rate 0.1)
            result (sgd-step params grads sgd)]
        {:has-params (not (nil? (:params result)))
         :has-optimizer (not (nil? (:optimizer result)))})
    `;
    const result = interp.eval(code);
    expect(result['has-params']).toBe(true);
    expect(result['has-optimizer']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Momentum SGD
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Create Momentum SGD optimizer', () => {
    const code = `
      (load "src/sgd.fl")
      (let [momentum (create-momentum-optimizer :learning-rate 0.01 :momentum 0.9)]
        {:type (= (:type momentum) :momentum)
         :momentum-val (= (:momentum momentum) 0.9)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result['momentum-val']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Nesterov AGD
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Create Nesterov AGD optimizer', () => {
    const code = `
      (load "src/sgd.fl")
      (let [nesterov (create-nesterov-optimizer :learning-rate 0.01 :momentum 0.9)]
        {:type (= (:type nesterov) :nesterov)
         :has-velocity (not (nil? (:velocity nesterov)))})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result['has-velocity']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Learning Rate Scheduling (Linear Decay)
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Apply linear decay learning rate', () => {
    const code = `
      (load "src/sgd.fl")
      (let [lr0 (linear-decay-lr 0.1 0 1000)
            lr500 (linear-decay-lr 0.1 500 1000)
            lr1000 (linear-decay-lr 0.1 1000 1000)]
        {:start (= lr0 0.1)
         :mid (= (Math/round (* lr500 1000)) 50)
         :end (= (Math/abs lr1000) < 0.0001)})
    `;
    const result = interp.eval(code);
    expect(result.start).toBe(true);
    expect(result.mid).toBe(true);
    expect(result.end).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Gradient Clipping
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Clip gradients by norm', () => {
    const code = `
      (load "src/sgd.fl")
      (let [grads (create-vector [3.0 4.0])
            clipped (clip-gradients-by-norm grads 1.0)
            norm (vector-length clipped)]
        {:clipped (>= norm 0.99)})
    `;
    const result = interp.eval(code);
    expect(result.clipped).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: Adam Optimizer
  // ─────────────────────────────────────────────────────────────────────────
  test('7. Create Adam optimizer', () => {
    const code = `
      (load "src/adaptive-optimizers.fl")
      (let [adam (create-adam-optimizer :learning-rate 0.001)]
        {:type (= (:type adam) :adam)
         :beta1 (= (:beta1 adam) 0.9)
         :beta2 (= (:beta2 adam) 0.999)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.beta1).toBe(true);
    expect(result.beta2).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Adam Step
  // ─────────────────────────────────────────────────────────────────────────
  test('8. Perform Adam optimizer step', () => {
    const code = `
      (load "src/adaptive-optimizers.fl")
      (let [params (create-vector [1.0 2.0])
            grads (create-vector [0.1 0.2])
            adam (create-adam-optimizer :learning-rate 0.001)
            result (adam-step params grads adam)]
        {:has-params (not (nil? (:params result)))
         :optimizer-updated (> (:iteration (:optimizer result)) 0)})
    `;
    const result = interp.eval(code);
    expect(result['has-params']).toBe(true);
    expect(result['optimizer-updated']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: RMSProp Optimizer
  // ─────────────────────────────────────────────────────────────────────────
  test('9. Create RMSProp optimizer', () => {
    const code = `
      (load "src/adaptive-optimizers.fl")
      (let [rmsprop (create-rmsprop-optimizer :learning-rate 0.001 :decay 0.99)]
        {:type (= (:type rmsprop) :rmsprop)
         :decay (= (:decay rmsprop) 0.99)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.decay).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: AdaGrad Optimizer
  // ─────────────────────────────────────────────────────────────────────────
  test('10. Create AdaGrad optimizer', () => {
    const code = `
      (load "src/adaptive-optimizers.fl")
      (let [adagrad (create-adagrad-optimizer :learning-rate 0.01)]
        {:type (= (:type adagrad) :adagrad)
         :lr (= (:learning-rate adagrad) 0.01)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.lr).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Optimizer Selection
  // ─────────────────────────────────────────────────────────────────────────
  test('11. Select optimizer by strategy', () => {
    const code = `
      (load "src/adaptive-optimizers.fl")
      (let [adam (select-optimizer :adam :learning-rate 0.001)
            sgd (select-optimizer :sgd)]
        {:adam-ok (= (:type adam) :adam)})
    `;
    const result = interp.eval(code);
    expect(result['adam-ok']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: Online Model Creation
  // ─────────────────────────────────────────────────────────────────────────
  test('12. Create online learning model', () => {
    const code = `
      (load "src/online-learning.fl")
      (let [initial-params (create-vector [0 0 0])
            model (create-online-model initial-params :optimizer :adam :window-size 100)]
        {:has-params (not (nil? (:params model)))
         :has-optimizer (not (nil? (:optimizer model)))
         :window-size (= (:window-size model) 100)})
    `;
    const result = interp.eval(code);
    expect(result['has-params']).toBe(true);
    expect(result['has-optimizer']).toBe(true);
    expect(result['window-size']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 13: Online Update
  // ─────────────────────────────────────────────────────────────────────────
  test('13. Perform online model update', () => {
    const code = `
      (load "src/online-learning.fl")
      (let [params (create-vector [1.0 2.0])
            model (create-online-model params :window-size 10)
            sample 42
            loss-fn (fn [x] (* x x))
            grad-fn (fn [x] (* 2 x))
            updated (online-update model sample loss-fn grad-fn)]
        {:updated-count (= (:update-count updated) 1)
         :has-loss (not (nil? (:loss updated)))})
    `;
    const result = interp.eval(code);
    expect(result['updated-count']).toBe(true);
    expect(result['has-loss']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 14: Concept Drift Detection (ADWIN)
  // ─────────────────────────────────────────────────────────────────────────
  test('14. Detect concept drift with ADWIN', () => {
    const code = `
      (load "src/online-learning.fl")
      (let [losses [0.5 0.5 0.5 0.5 0.4 0.3 0.2 0.1 0.1 0.1 0.1 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9]
            drift (detect-concept-drift losses)]
        {:has-detection (boolean? (:drift-detected drift))
         :has-stats (not (nil? (:t-statistic drift)))})
    `;
    const result = interp.eval(code);
    expect(result['has-detection']).toBe(true);
    expect(result['has-stats']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 15: DDM Drift Detection
  // ─────────────────────────────────────────────────────────────────────────
  test('15. Detect drift with DDM method', () => {
    const code = `
      (load "src/online-learning.fl")
      (let [errors (range 0.5 0.05 -0.01)
            drift (detect-drift-ddm errors)]
        {:has-z-score (number? (:z-score drift))
         :has-detection (boolean? (:drift-detected drift))})
    `;
    const result = interp.eval(code);
    expect(result['has-z-score']).toBe(true);
    expect(result['has-detection']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 16: Sliding Window Average
  // ─────────────────────────────────────────────────────────────────────────
  test('16. Compute sliding window average', () => {
    const code = `
      (load "src/online-learning.fl")
      (let [data [1 2 3 4 5]
            avg (sliding-window-average data 3)]
        {:avg-exists (number? avg)})
    `;
    const result = interp.eval(code);
    expect(result['avg-exists']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 17: Online Mean Calculation
  // ─────────────────────────────────────────────────────────────────────────
  test('17. Calculate online mean (Welford)', () => {
    const code = `
      (load "src/online-learning.fl")
      (let [mean0 0
            mean1 (online-mean mean0 0 1.0)
            mean2 (online-mean mean1 1 2.0)
            mean3 (online-mean mean2 2 3.0)]
        {:mean3 (= (Math/round (* mean3 100)) 200)})
    `;
    const result = interp.eval(code);
    expect(result.mean3).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 18: Adaptive Learning Rate
  // ─────────────────────────────────────────────────────────────────────────
  test('18. Adapt learning rate on plateau', () => {
    const code = `
      (load "src/online-learning.fl")
      (let [sgd (create-sgd-optimizer :learning-rate 0.1)
            losses [0.5 0.5 0.5 0.5 0.5]
            adapted (adapt-learning-rate sgd losses :patience 5 :factor 0.5)]
        {:lr-reduced (< (:learning-rate adapted) 0.1)})
    `;
    const result = interp.eval(code);
    expect(result['lr-reduced']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 19: Online Model Summary
  // ─────────────────────────────────────────────────────────────────────────
  test('19. Get online model summary', () => {
    const code = `
      (load "src/online-learning.fl")
      (let [params (create-vector [0 0])
            model (create-online-model params)
            summary (online-model-summary model)]
        {:has-type (string? (:type summary))
         :has-updates (number? (:total-updates summary))})
    `;
    const result = interp.eval(code);
    expect(result['has-type']).toBe(true);
    expect(result['has-updates']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 20: Optimizer Diagnostics
  // ─────────────────────────────────────────────────────────────────────────
  test('20. Get optimizer diagnostics', () => {
    const code = `
      (load "src/adaptive-optimizers.fl")
      (let [adam (create-adam-optimizer)
            diag (optimizer-diagnostics adam)]
        {:has-type (string? (:type diag))
         :has-iteration (number? (:iteration diag))})
    `;
    const result = interp.eval(code);
    expect(result['has-type']).toBe(true);
    expect(result['has-iteration']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 21: Mini-Batch Creation
  // ─────────────────────────────────────────────────────────────────────────
  test('21. Create mini-batches', () => {
    const code = `
      (load "src/sgd.fl")
      (let [data [1 2 3 4 5 6 7 8 9 10]
            batches (create-mini-batches data 3)]
        {:batch-count (> (count batches) 0)
         :first-batch-size (> (count (first batches)) 0)})
    `;
    const result = interp.eval(code);
    expect(result['batch-count']).toBe(true);
    expect(result['first-batch-size']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 22: Optimizer Metrics
  // ─────────────────────────────────────────────────────────────────────────
  test('22. Get optimizer performance metrics', () => {
    const code = `
      (load "src/adaptive-optimizers.fl")
      (let [adam (create-adam-optimizer)
            adam-with-loss (assoc adam :loss-history [1.0 0.9 0.8])
            metrics (optimizer-metrics adam-with-loss)]
        {:has-loss (number? (:avg-loss metrics))})
    `;
    const result = interp.eval(code);
    expect(result['has-loss']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 23: Convergence Check
  // ─────────────────────────────────────────────────────────────────────────
  test('23. Check optimization convergence', () => {
    const code = `
      (load "src/sgd.fl")
      (let [losses [1.0 0.9 0.85 0.82 0.81 0.8 0.8 0.8 0.8 0.79 0.79 0.79]
            conv (check-convergence losses :window 10)]
        {:has-convergence-flag (boolean? (:converged conv))
         :has-ratio (number? (:improvement-ratio conv))})
    `;
    const result = interp.eval(code);
    expect(result['has-convergence-flag']).toBe(true);
    expect(result['has-ratio']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 24: AdaDelta Optimizer
  // ─────────────────────────────────────────────────────────────────────────
  test('24. Create AdaDelta optimizer', () => {
    const code = `
      (load "src/adaptive-optimizers.fl")
      (let [adadelta (create-adadelta-optimizer :decay 0.95)]
        {:type (= (:type adadelta) :adadelta)
         :decay (= (:decay adadelta) 0.95)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.decay).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 25: Optimizer Reset
  // ─────────────────────────────────────────────────────────────────────────
  test('25. Reset optimizer state', () => {
    const code = `
      (load "src/sgd.fl")
      (let [sgd (create-sgd-optimizer :learning-rate 0.01)
            sgd-with-updates (assoc sgd :iteration 100 :loss-history [1.0 0.9])
            reset (reset-optimizer sgd-with-updates)]
        {:iteration-reset (= (:iteration reset) 0)
         :history-reset (= (count (:loss-history reset)) 0)})
    `;
    const result = interp.eval(code);
    expect(result['iteration-reset']).toBe(true);
    expect(result['history-reset']).toBe(true);
  });
});
