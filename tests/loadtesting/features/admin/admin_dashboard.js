/**
 * Feature: Admin Core & Dashboards Load Test
 * Target: /api/admin/terminals, /api/admin/store-types, /api/admin/jewellery/stats
 * 
 * Simulates multiple concurrent admins accessing reporting, terminals, and operational stats.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS } from '../../config/environments.js';
import { THRESHOLDS, STAGES } from '../../config/thresholds.js';
import { getAdminHeaders } from '../../utils/authHelper.js';

const adminCoreDuration = new Trend('admin_core_duration');
const adminCoreErrors = new Rate('admin_core_errors');

export const options = {
  stages: STAGES.standardLoad,
  thresholds: {
    ...THRESHOLDS.load,
    'admin_core_duration': ['p(95)<350'],
    'admin_core_errors': ['rate<0.01'],
  },
};

export default function () {
  const headers = getAdminHeaders();

  // 1. Admin Jewellery Stats
  const statsRes = http.get(`${BASE_URL}${ENDPOINTS.adminJewellery.stats}`, headers);
  check(statsRes, {
    'admin stats 200': (r) => r.status === 200,
  });

  // 2. Admin Store Types
  const start = Date.now();
  const storeTypesRes = http.get(`${BASE_URL}${ENDPOINTS.admin.storeTypes}`, headers);
  adminCoreDuration.add(Date.now() - start);

  const ok = check(storeTypesRes, {
    'admin store types responds': (r) => r.status === 200 || r.status === 404,
  });
  adminCoreErrors.add(!ok);

  sleep(Math.random() * 1.5 + 0.5);
}
