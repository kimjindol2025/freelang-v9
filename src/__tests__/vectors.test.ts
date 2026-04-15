// FreeLang v9 — Phase 156: Vector Operations & Linear Algebra Tests

import { Interpreter } from '../interpreter';

describe('Phase 156: Vector Operations & Linear Algebra', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Vector Creation & Length
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Create vector and calculate length', () => {
    const code = `
      (load "src/vectors.fl")
      (let [v (create-vector [3 4])
            len (vector-length v)]
        {:dimension (= (:dimension v) 2)
         :length (= len 5)})
    `;
    const result = interp.eval(code);
    expect(result.dimension).toBe(true);
    expect(result.length).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Vector Normalization
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Normalize vector to unit vector', () => {
    const code = `
      (load "src/vectors.fl")
      (let [v (create-vector [3 4])
            normalized (normalize-vector v)
            len (vector-length normalized)]
        {:is-unit (Math/abs (- len 1) < 0.0001)})
    `;
    const result = interp.eval(code);
    expect(result['is-unit']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Vector Addition
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Add two vectors', () => {
    const code = `
      (load "src/vectors.fl")
      (let [v1 (create-vector [1 2 3])
            v2 (create-vector [4 5 6])
            v3 (vector-add v1 v2)]
        {:result (= (:values v3) [5 7 9])})
    `;
    const result = interp.eval(code);
    expect(result.result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Dot Product
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Calculate dot product', () => {
    const code = `
      (load "src/vectors.fl")
      (let [v1 (create-vector [1 2 3])
            v2 (create-vector [4 5 6])
            dp (dot-product v1 v2)]
        {:product (= dp 32)})
    `;
    const result = interp.eval(code);
    expect(result.product).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Cross Product (3D)
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Calculate cross product in 3D', () => {
    const code = `
      (load "src/vectors.fl")
      (let [v1 (create-vector [1 0 0])
            v2 (create-vector [0 1 0])
            cross (cross-product v1 v2)]
        {:dimension (= (:dimension cross) 3)
         :has-z (not (nil? (nth (:values cross) 2)))})
    `;
    const result = interp.eval(code);
    expect(result.dimension).toBe(true);
    expect(result['has-z']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Vector Distance
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Calculate distance between vectors', () => {
    const code = `
      (load "src/vectors.fl")
      (let [v1 (create-vector [0 0])
            v2 (create-vector [3 4])
            dist (distance v1 v2)]
        {:distance (= dist 5)})
    `;
    const result = interp.eval(code);
    expect(result.distance).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: Matrix Creation
  // ─────────────────────────────────────────────────────────────────────────
  test('7. Create and access matrix', () => {
    const code = `
      (load "src/vectors.fl")
      (let [M (create-matrix [[1 2] [3 4]])
            val (matrix-get M 1 1)]
        {:rows (= (:rows M) 2)
         :cols (= (:cols M) 2)
         :element (= val 4)})
    `;
    const result = interp.eval(code);
    expect(result.rows).toBe(true);
    expect(result.cols).toBe(true);
    expect(result.element).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Identity Matrix
  // ─────────────────────────────────────────────────────────────────────────
  test('8. Create identity matrix', () => {
    const code = `
      (load "src/vectors.fl")
      (let [I (identity-matrix 3)]
        {:diagonal (and (= (matrix-get I 0 0) 1)
                       (= (matrix-get I 1 1) 1)
                       (= (matrix-get I 2 2) 1))
         :off-diagonal (= (matrix-get I 0 1) 0)})
    `;
    const result = interp.eval(code);
    expect(result.diagonal).toBe(true);
    expect(result['off-diagonal']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: Matrix Transpose
  // ─────────────────────────────────────────────────────────────────────────
  test('9. Transpose matrix', () => {
    const code = `
      (load "src/vectors.fl")
      (let [M (create-matrix [[1 2 3] [4 5 6]])
            Mt (matrix-transpose M)]
        {:rows (= (:rows Mt) 3)
         :cols (= (:cols Mt) 2)
         :element (= (matrix-get Mt 0 0) 1)})
    `;
    const result = interp.eval(code);
    expect(result.rows).toBe(true);
    expect(result.cols).toBe(true);
    expect(result.element).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: Matrix Addition
  // ─────────────────────────────────────────────────────────────────────────
  test('10. Add two matrices', () => {
    const code = `
      (load "src/vectors.fl")
      (let [A (create-matrix [[1 2] [3 4]])
            B (create-matrix [[5 6] [7 8]])
            C (matrix-add A B)]
        {:val00 (= (matrix-get C 0 0) 6)
         :val11 (= (matrix-get C 1 1) 12)})
    `;
    const result = interp.eval(code);
    expect(result.val00).toBe(true);
    expect(result.val11).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Matrix Multiplication
  // ─────────────────────────────────────────────────────────────────────────
  test('11. Multiply two matrices', () => {
    const code = `
      (load "src/vectors.fl")
      (let [A (create-matrix [[1 2] [3 4]])
            B (create-matrix [[5 6] [7 8]])
            C (matrix-multiply A B)]
        {:val00 (= (matrix-get C 0 0) 19)
         :val11 (= (matrix-get C 1 1) 50)})
    `;
    const result = interp.eval(code);
    expect(result.val00).toBe(true);
    expect(result.val11).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: Determinant 2×2
  // ─────────────────────────────────────────────────────────────────────────
  test('12. Calculate 2×2 determinant', () => {
    const code = `
      (load "src/vectors.fl")
      (let [M (create-matrix [[1 2] [3 4]])
            det (determinant M)]
        {:det (= det -2)})
    `;
    const result = interp.eval(code);
    expect(result.det).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 13: Matrix Inverse 2×2
  // ─────────────────────────────────────────────────────────────────────────
  test('13. Calculate 2×2 matrix inverse', () => {
    const code = `
      (load "src/vectors.fl")
      (let [M (create-matrix [[1 2] [3 4]])
            M-inv (matrix-inverse M)
            det (determinant M-inv)]
        {:has-inverse (not (nil? M-inv))
         :is-square (= (:rows M-inv) 2)})
    `;
    const result = interp.eval(code);
    expect(result['has-inverse']).toBe(true);
    expect(result['is-square']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 14: Matrix Trace
  // ─────────────────────────────────────────────────────────────────────────
  test('14. Calculate matrix trace', () => {
    const code = `
      (load "src/vectors.fl")
      (let [M (create-matrix [[1 2] [3 4]])
            tr (matrix-trace M)]
        {:trace (= tr 5)})
    `;
    const result = interp.eval(code);
    expect(result.trace).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 15: Matrix-Vector Multiplication
  // ─────────────────────────────────────────────────────────────────────────
  test('15. Multiply matrix by vector', () => {
    const code = `
      (load "src/vectors.fl")
      (let [M (create-matrix [[1 2] [3 4]])
            v (create-vector [5 6])
            result (matrix-vector-multiply M v)]
        {:dimension (= (:dimension result) 2)
         :val0 (= (nth (:values result) 0) 17)
         :val1 (= (nth (:values result) 1) 39)})
    `;
    const result = interp.eval(code);
    expect(result.dimension).toBe(true);
    expect(result.val0).toBe(true);
    expect(result.val1).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 16: Eigenvalues 2×2
  // ─────────────────────────────────────────────────────────────────────────
  test('16. Calculate eigenvalues of 2×2 matrix', () => {
    const code = `
      (load "src/linear-algebra.fl")
      (let [M (create-matrix [[4 -2] [1 1]])
            eigs (eigenvalues-2x2 M)]
        {:is-vector (vector? eigs)
         :count (= (count eigs) 2)})
    `;
    const result = interp.eval(code);
    expect(result['is-vector']).toBe(true);
    expect(result.count).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 17: Frobenius Norm
  // ─────────────────────────────────────────────────────────────────────────
  test('17. Calculate Frobenius norm', () => {
    const code = `
      (load "src/linear-algebra.fl")
      (let [M (create-matrix [[3 0] [4 0]])
            norm (frobenius-norm M)]
        {:norm (= norm 5)})
    `;
    const result = interp.eval(code);
    expect(result.norm).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 18: Condition Number
  // ─────────────────────────────────────────────────────────────────────────
  test('18. Calculate matrix condition number', () => {
    const code = `
      (load "src/linear-algebra.fl")
      (let [M (create-matrix [[1 0] [0 1]])
            cond (condition-number M)]
        {:finite (not (= cond ##Inf))})
    `;
    const result = interp.eval(code);
    expect(result.finite).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 19: Linear Regression
  // ─────────────────────────────────────────────────────────────────────────
  test('19. Fit linear regression', () => {
    const code = `
      (load "src/linear-algebra.fl")
      (let [x [1 2 3 4]
            y [2 4 6 8]
            fit (linear-regression x y)]
        {:has-slope (not (nil? (:slope fit)))
         :has-intercept (not (nil? (:intercept fit)))})
    `;
    const result = interp.eval(code);
    expect(result['has-slope']).toBe(true);
    expect(result['has-intercept']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 20: GPU State Management
  // ─────────────────────────────────────────────────────────────────────────
  test('20. Enable/disable GPU acceleration', () => {
    const code = `
      (load "src/gpu-ops.fl")
      (let [result (enable-gpu-acceleration :backend :cuda :device-id 0)]
        {:ok (boolean? (:ok result))
         :backend (= (:backend result) :cuda)})
    `;
    const result = interp.eval(code);
    expect(result.ok).toBe(true);
    expect(result.backend).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 21: GPU Memory Stats
  // ─────────────────────────────────────────────────────────────────────────
  test('21. Get GPU memory statistics', () => {
    const code = `
      (load "src/gpu-ops.fl")
      (let [stats (gpu-memory-stats)]
        {:has-available (boolean? (:available stats))
         :has-total (number? (:total-mb stats))})
    `;
    const result = interp.eval(code);
    expect(result['has-available']).toBe(true);
    expect(result['has-total']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 22: Batch Matrix Multiplication
  // ─────────────────────────────────────────────────────────────────────────
  test('22. Batch multiply matrices', () => {
    const code = `
      (load "src/gpu-ops.fl")
      (let [A1 (create-matrix [[1 2] [3 4]])
            A2 (create-matrix [[5 6] [7 8]])
            B1 (create-matrix [[1 0] [0 1]])
            B2 (create-matrix [[2 0] [0 2]])
            result (batch-matrix-multiply [A1 A2] [B1 B2])]
        {:count (= (:count result) 2)
         :has-results (not (nil? (:results result)))})
    `;
    const result = interp.eval(code);
    expect(result.count).toBe(true);
    expect(result['has-results']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 23: Vector Norm
  // ─────────────────────────────────────────────────────────────────────────
  test('23. Calculate p-norm of vector', () => {
    const code = `
      (load "src/vectors.fl")
      (let [v (create-vector [3 4])
            l1-norm (vector-norm v :p 1)
            l2-norm (vector-norm v :p 2)]
        {:l1 (= l1-norm 7)
         :l2 (= l2-norm 5)})
    `;
    const result = interp.eval(code);
    expect(result.l1).toBe(true);
    expect(result.l2).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 24: Vector Scalar Multiplication
  // ─────────────────────────────────────────────────────────────────────────
  test('24. Scale vector by scalar', () => {
    const code = `
      (load "src/vectors.fl")
      (let [v (create-vector [1 2 3])
            scaled (vector-scale v 2)]
        {:val0 (= (nth (:values scaled) 0) 2)
         :val1 (= (nth (:values scaled) 1) 4)
         :val2 (= (nth (:values scaled) 2) 6)})
    `;
    const result = interp.eval(code);
    expect(result.val0).toBe(true);
    expect(result.val1).toBe(true);
    expect(result.val2).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 25: GPU Diagnostics
  // ─────────────────────────────────────────────────────────────────────────
  test('25. Get GPU system diagnostics', () => {
    const code = `
      (load "src/gpu-ops.fl")
      (let [diag (gpu-diagnostics)]
        {:has-enabled (boolean? (:enabled diag))
         :has-memory (not (nil? (:memory diag)))})
    `;
    const result = interp.eval(code);
    expect(result['has-enabled']).toBe(true);
    expect(result['has-memory']).toBe(true);
  });
});
