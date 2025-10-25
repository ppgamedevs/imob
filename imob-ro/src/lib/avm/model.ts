/**
 * Day 33: Ridge regression implementation in pure JavaScript
 * No external ML libraries - implements matrix math from scratch
 */

// ============================================================================
// Matrix Utilities
// ============================================================================

/**
 * Transpose matrix (rows become columns)
 */
function transpose(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];

  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }

  return result;
}

/**
 * Matrix multiplication: A × B
 */
function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;

  const result: number[][] = [];
  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
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
 * Dot product of two vectors
 */
function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Solve linear system Ax = b using Gaussian elimination with partial pivoting
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;

  // Create augmented matrix [A|b]
  const augmented: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
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
  const x: number[] = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= augmented[i][j] * x[j];
    }
    x[i] = sum / augmented[i][i];
  }

  return x;
}

// ============================================================================
// Statistical Utilities
// ============================================================================

/**
 * Calculate mean of array
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function std(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Calculate mean of each column in matrix
 */
function columnMeans(X: number[][]): number[] {
  if (X.length === 0) return [];
  const cols = X[0].length;
  const means: number[] = new Array(cols).fill(0);

  for (let j = 0; j < cols; j++) {
    let sum = 0;
    for (let i = 0; i < X.length; i++) {
      sum += X[i][j];
    }
    means[j] = sum / X.length;
  }

  return means;
}

// ============================================================================
// Ridge Regression
// ============================================================================

export type RidgeModel = {
  weights: number[];
  intercept: number;
  residualStd: number;
  featureMeans: number[];
};

export type RidgePrediction = {
  prediction: number;
  lower80: number;
  upper80: number;
  conf: number;
};

export type TrainingMetrics = {
  mae: number;
  mape: number;
  rmse: number;
  samples: number;
};

/**
 * Train ridge regression model
 * Solves: w = (X^T X + λI)^(-1) X^T y
 *
 * @param X - Feature matrix (n_samples × n_features)
 * @param y - Target vector (n_samples)
 * @param lambda - Regularization strength (default: 1.0)
 * @returns Trained model with weights, intercept, and residual std
 */
export function trainRidge(
  X: number[][],
  y: number[],
  lambda = 1.0,
): { model: RidgeModel; metrics: TrainingMetrics } {
  const n = X.length;
  const p = X[0].length;

  if (n === 0 || p === 0) {
    throw new Error("Empty training data");
  }

  if (y.length !== n) {
    throw new Error("Feature matrix and target vector length mismatch");
  }

  // Center data (subtract means)
  const featureMeans = columnMeans(X);
  const targetMean = mean(y);

  const X_centered = X.map((row) => row.map((val, j) => val - featureMeans[j]));
  const y_centered = y.map((val) => val - targetMean);

  // Compute X^T X
  const Xt = transpose(X_centered);
  const XtX = matrixMultiply(Xt, X_centered);

  // Add regularization: X^T X + λI
  for (let i = 0; i < p; i++) {
    XtX[i][i] += lambda;
  }

  // Compute X^T y
  const XtY: number[] = new Array(p);
  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += X_centered[i][j] * y_centered[i];
    }
    XtY[j] = sum;
  }

  // Solve (X^T X + λI) w = X^T y
  const weights = solveLinearSystem(XtX, XtY);

  // Intercept: mean(y) - weights · mean(X)
  const intercept = targetMean - dot(weights, featureMeans);

  // Calculate predictions and residuals
  const predictions = X.map((x) => dot(x, weights) + intercept);
  const residuals = y.map((yi, i) => yi - predictions[i]);

  // Residual standard deviation (for prediction intervals)
  const residualStd = std(residuals);

  // Calculate training metrics
  const mae = mean(residuals.map(Math.abs));
  const mape = mean(residuals.map((r, i) => Math.abs(r / y[i]))) * 100;
  const rmse = Math.sqrt(mean(residuals.map((r) => r * r)));

  const model: RidgeModel = {
    weights,
    intercept,
    residualStd,
    featureMeans,
  };

  const metrics: TrainingMetrics = {
    mae,
    mape,
    rmse,
    samples: n,
  };

  return { model, metrics };
}

/**
 * Make prediction with ridge regression model
 * Returns point estimate and 80% prediction interval
 *
 * @param model - Trained ridge model
 * @param x - Feature vector
 * @returns Prediction with confidence interval
 */
export function predictRidge(model: RidgeModel, x: number[]): RidgePrediction {
  if (x.length !== model.weights.length) {
    throw new Error(
      `Feature vector length mismatch: expected ${model.weights.length}, got ${x.length}`,
    );
  }

  // Point prediction: y = x · w + intercept
  const prediction = dot(x, model.weights) + model.intercept;

  // 80% confidence interval: ± 1.28 * σ (z-score for 80% coverage)
  const margin = 1.28 * model.residualStd;

  return {
    prediction,
    lower80: prediction - margin,
    upper80: prediction + margin,
    conf: 0.8,
  };
}

/**
 * Evaluate model on test set
 */
export function evaluateModel(
  model: RidgeModel,
  X_test: number[][],
  y_test: number[],
): TrainingMetrics & { coverage80: number } {
  const predictions = X_test.map((x) => predictRidge(model, x));

  const residuals = y_test.map((y, i) => y - predictions[i].prediction);
  const mae = mean(residuals.map(Math.abs));
  const mape = mean(residuals.map((r, i) => Math.abs(r / y_test[i]))) * 100;
  const rmse = Math.sqrt(mean(residuals.map((r) => r * r)));

  // Check how many test samples fall within 80% interval
  const withinInterval = y_test.filter(
    (y, i) => y >= predictions[i].lower80 && y <= predictions[i].upper80,
  ).length;
  const coverage80 = withinInterval / y_test.length;

  return {
    mae,
    mape,
    rmse,
    samples: y_test.length,
    coverage80,
  };
}
