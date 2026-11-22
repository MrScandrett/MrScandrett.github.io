(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.SensorFusionEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEG = 180 / Math.PI;

  function createKalmanState() {
    return { angle: 0, bias: 0, P: [[1, 0], [0, 1]] };
  }

  /**
   * 2-state (angle, gyro bias) discrete Kalman filter step.
   */
  function kalmanStep({ state, gyroRate, accelAngle, dt, qAngle = 0.001, qBias = 0.003, rMeasure }) {
    const P = state.P;
    state.angle += dt * (gyroRate - state.bias);
    P[0][0] += dt * (dt * P[1][1] - P[0][1] - P[1][0] + qAngle);
    P[0][1] -= dt * P[1][1];
    P[1][0] -= dt * P[1][1];
    P[1][1] += qBias * dt;

    const S = P[0][0] + rMeasure;
    const K0 = P[0][0] / S;
    const K1 = P[1][0] / S;
    const innovation = accelAngle - state.angle;
    state.angle += K0 * innovation;
    state.bias += K1 * innovation;

    const p00 = P[0][0];
    const p01 = P[0][1];
    P[0][0] -= K0 * p00;
    P[0][1] -= K0 * p01;
    P[1][0] -= K1 * p00;
    P[1][1] -= K1 * p01;
    return state.angle;
  }

  function complementaryStep({ est, gyroRate, accelAngle, dt, alpha }) {
    return alpha * (est + gyroRate * dt) + (1 - alpha) * accelAngle;
  }

  /**
   * Crossover time constant tau = (alpha * dt) / (1 - alpha) in seconds.
   */
  function crossoverTimeConstant(alpha, dt) {
    const a = Number(alpha);
    if (a >= 1) return Infinity;
    if (a <= 0) return 0;
    return (a * dt) / (1 - a);
  }

  function rmseDeg(errorsRad) {
    if (!errorsRad || !errorsRad.length) return 0;
    let sumSq = 0;
    for (let i = 0; i < errorsRad.length; i++) {
      sumSq += errorsRad[i] * errorsRad[i];
    }
    return Math.sqrt(sumSq / errorsRad.length) * DEG;
  }

  return {
    DEG,
    createKalmanState,
    kalmanStep,
    complementaryStep,
    crossoverTimeConstant,
    rmseDeg
  };
});
