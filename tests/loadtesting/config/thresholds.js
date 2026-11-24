/**
 * Standard Performance SLA Thresholds
 * Configurable for Smoke, Load, Stress, and Soak testing stages.
 */

export const THRESHOLDS = {
  // Smoke testing: Verifies baseline functionality and minimal latency
  smoke: {
    http_req_failed: ['rate<0.01'],    // < 1% errors
    http_req_duration: ['p(95)<300'],   // 95% requests respond within 300ms
  },

  // Standard load testing: Moderate continuous traffic
  load: {
    http_req_failed: ['rate<0.02'],    // < 2% errors
    http_req_duration: ['p(95)<500', 'p(99)<1200'], // 95% < 500ms, 99% < 1.2s
  },

  // Stress testing: Push system near breaking point
  stress: {
    http_req_failed: ['rate<0.05'],    // < 5% errors
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  },

  // Soak / Endurance testing: Sustained traffic over extended periods
  soak: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<600'],
  },
};

/**
 * Common test stage profiles for reusability across scripts
 */
export const STAGES = {
  smoke: [
    { duration: '30s', target: 5 },
  ],
  standardLoad: [
    { duration: '30s', target: 10 }, // Ramp up to 10 VUs
    { duration: '1m', target: 25 },  // Peak at 25 VUs
    { duration: '30s', target: 0 },  // Ramp down
  ],
  heavyLoad: [
    { duration: '1m', target: 30 },
    { duration: '2m', target: 60 },
    { duration: '1m', target: 0 },
  ],
};
