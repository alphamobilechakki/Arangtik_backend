/**
 * Smoke Test Scenario
 * Quick 30-second multi-feature health & sanity check.
 * Run before heavy deployments or before starting large stress/load tests.
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, ENDPOINTS } from '../config/environments.js';
import { THRESHOLDS } from '../config/thresholds.js';
import { getPublicHeaders, getUserHeaders, getAdminHeaders } from '../utils/authHelper.js';

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: THRESHOLDS.smoke,
};

export default function () {
  group('1. Public Endpoints', () => {
    const res = http.get(`${BASE_URL}${ENDPOINTS.jewellery.categories}`, getPublicHeaders());
    check(res, { 'categories 200': (r) => r.status === 200 });
  });

  group('2. User Jewellery Vault', () => {
    const res = http.get(`${BASE_URL}${ENDPOINTS.jewellery.items}`, getUserHeaders());
    check(res, { 'user items 200': (r) => r.status === 200 });
  });

  group('3. Admin Jewellery Operations', () => {
    const res = http.get(`${BASE_URL}${ENDPOINTS.adminJewellery.stats}`, getAdminHeaders());
    check(res, { 'admin stats 200': (r) => r.status === 200 });
  });

  group('4. User Profile', () => {
    const res = http.get(`${BASE_URL}${ENDPOINTS.auth.profile}`, getUserHeaders());
    check(res, { 'user profile 200': (r) => r.status === 200 });
  });

  sleep(1);
}
