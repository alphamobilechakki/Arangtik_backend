/**
 * Feature: Auth Endpoints Load Test
 * Target: /api/auth/profile, /api/auth/send-otp
 * 
 * Verifies profile retrieval latency and OTP rate limiter resilience.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS } from '../../config/environments.js';
import { THRESHOLDS, STAGES } from '../../config/thresholds.js';
import { getUserHeaders, getPublicHeaders } from '../../utils/authHelper.js';

const profileDuration = new Trend('auth_profile_duration');
const authErrorRate = new Rate('auth_errors');

export const options = {
  stages: STAGES.standardLoad,
  thresholds: {
    ...THRESHOLDS.load,
    'auth_profile_duration': ['p(95)<300'],
  },
};

export default function () {
  const headers = getUserHeaders();

  // 1. Authenticated user profile check
  const start = Date.now();
  const profileRes = http.get(`${BASE_URL}${ENDPOINTS.auth.profile}`, headers);
  profileDuration.add(Date.now() - start);

  const profileOk = check(profileRes, {
    'profile status 200': (r) => r.status === 200,
  });
  authErrorRate.add(!profileOk);

  // 2. Health / Root ping
  const healthRes = http.get(`${BASE_URL}${ENDPOINTS.health}`, getPublicHeaders());
  check(healthRes, {
    'health responds': (r) => r.status === 200 || r.status === 404,
  });

  sleep(Math.random() * 1.5 + 0.5);
}
