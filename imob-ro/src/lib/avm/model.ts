/**
 * AVM v2 Ridge Regression Model
 * Pure JavaScript implementation of ridge regression without external ML libraries.
 */

export type RidgeModel = {
  weights: number[];
  intercept: number;
  residualStd: number;
};

export type RidgeMetrics = {
  mae: number;
  mape: number;
  rmse: number;
  samples: number;
};

export type PredictionResult = {
  prediction: number;
  lower80: number;
  upper80: number;
  conf: number;
};

// ============================================================================
// Matrix Utilities
// ============================================================================

/**
 * Transpose matrix: rows become columns
 */
export function transpose(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = Array(cols)
    .fill(0)
    .map(() => Array(rows).fill(0));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}

/**
 * Matrix multiplication: A * B
 */
export function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;

  const result: number[][] = Array(rowsA)
    .fill(0)
    .map(() => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

/**
 * Matrix-vector multiplication: A * v
 */
export function matrixVectorMultiply(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

/**
 * Vector dot product
 */
export function dot(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Solve linear system Ax = b using Gaussian elimination
 * Returns x vector
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Create augmented matrix [A|b]
  const augmented: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Check for singular matrix
    if (Math.abs(augmented[i][i]) < 1e-10) {
      throw new Error("Matrix is singular or nearly singular");
    }

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x: number[] = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}

// ============================================================================
// Statistical Utilities
// ============================================================================

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, val) => sum + (val - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate mean of each column in matrix
 */
export function meanColumns(X: number[][]): number[] {
  if (X.length === 0) return [];
  const n = X.length;
  const p = X[0].length;
  const means: number[] = Array(p).fill(0);

  for (let j = 0; j < p; j++) {
    for (let i = 0; i < n; i++) {
      means[j] += X[i][j];
    }
    means[j] /= n;
  }
  return means;
}

// ============================================================================
// Ridge Regression
// ============================================================================

/**
 * Train ridge regression model
 * Solves: w = (X^T X + λI)^(-1) X^T y
 *
 * @param X Feature matrix (n samples × p features)
 * @param y Target vector (n samples)
 * @param lambda Regularization strength (default 1.0)
 * @returns Trained model with weights, intercept, and residual std
 */
export function trainRidge(X: number[][], y: number[], lambda = 1.0): RidgeModel & RidgeMetrics {
  const n = X.length;
  const p = X[0].length;

  if (n !== y.length) {
    throw new Error("X and y must have same number of samples");
  }

  if (n < p) {
    console.warn(`Warning: Fewer samples (${n}) than features (${p}). Consider increasing data.`);
  }

  // Center features and target
  const meanX = meanColumns(X);
  const meanY = mean(y);

  const Xc = X.map((row) => row.map((val, j) => val - meanX[j]));
  const yc = y.map((val) => val - meanY);

  // Compute X^T X
  const Xt = transpose(Xc);
  const XtX = matrixMultiply(Xt, Xc);

  // Add regularization: X^T X + λI
  for (let i = 0; i < p; i++) {
    XtX[i][i] += lambda;
  }

  // Compute X^T y
  const Xty = matrixVectorMultiply(Xt, yc);

  // Solve for weights
  const weights = solveLinearSystem(XtX, Xty);

  // Intercept (after centering, intercept is mean(y) - mean(X) · w)
  const intercept = meanY - dot(meanX, weights);

  // Calculate predictions and residuals
  const predictions = X.map((x) => dot(x, weights) + intercept);
  const residuals = y.map((yi, i) => yi - predictions[i]);

  // Metrics
  const mae = mean(residuals.map(Math.abs));
  const mape = mean(residuals.map((r, i) => Math.abs(r / y[i]))) * 100;
  const rmse = Math.sqrt(mean(residuals.map((r) => r * r)));
  const residualStd = std(residuals);

  return {
    weights,
    intercept,
    residualStd,
    mae,
    mape,
    rmse,
    samples: n,
  };
}

/**
 * Predict with ridge regression model
 * Returns prediction with 80% confidence interval
 *
 * @param model Trained ridge model
 * @param x Feature vector
 * @returns Prediction with interval bounds
 */
export function predictRidge(model: RidgeModel, x: number[]): PredictionResult {
  const prediction = dot(x, model.weights) + model.intercept;

  // 80% confidence interval: ± 1.28 * σ (normal distribution)
  // This assumes residuals are approximately normal
  const margin = 1.28 * model.residualStd;

  return {
    prediction,
    lower80: prediction - margin,
    upper80: prediction + margin,
    conf: 0.8, // 80% confidence level
  };
}

/**
 * Evaluate model on test data
 */
export function evaluateRidge(
  model: RidgeModel,
  X: number[][],
  y: number[],
): { mae: number; mape: number; rmse: number; coverage80: number } {
  const predictions = X.map((x) => predictRidge(model, x));

  const residuals = y.map((yi, i) => yi - predictions[i].prediction);
  const mae = mean(residuals.map(Math.abs));
  const mape = mean(residuals.map((r, i) => Math.abs(r / y[i]))) * 100;
  const rmse = Math.sqrt(mean(residuals.map((r) => r * r)));

  // Check how many actual values fall within 80% interval
  const withinInterval = y.filter(
    (yi, i) => yi >= predictions[i].lower80 && yi <= predictions[i].upper80,
  ).length;
  const coverage80 = withinInterval / y.length;

  return { mae, mape, rmse, coverage80 };
}
