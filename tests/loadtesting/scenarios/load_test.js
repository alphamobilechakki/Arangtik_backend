/**
 * Comprehensive Load Test Scenario
 * Staged ramp-up with realistic user distribution across public, user, and admin flows.
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, ENDPOINTS } from '../config/environments.js';
import { THRESHOLDS } from '../config/thresholds.js';
import { getPublicHeaders, getUserHeaders, getAdminHeaders } from '../utils/authHelper.js';

export const options = {
  stages: [
    { duration: '20s', target: 10 }, // Warmup to 10 VUs
    { duration: '40s', target: 30 }, // Peak sustained load at 30 VUs
    { duration: '20s', target: 0 },  // Ramp-down
  ],
  thresholds: THRESHOLDS.load,
};

export default function () {
  const rand = Math.random();

  if (rand < 0.40) {
    // 40% User Vault Activity
    group('User Jewellery Vault', () => {
      const itemsRes = http.get(`${BASE_URL}${ENDPOINTS.jewellery.items}`, getUserHeaders());
      check(itemsRes, { 'vault items status 200': (r) => r.status === 200 });

      const boxesRes = http.get(`${BASE_URL}${ENDPOINTS.jewellery.boxes}`, getUserHeaders());
      check(boxesRes, { 'vault boxes status 200': (r) => r.status === 200 });
    });
  } else if (rand < 0.70) {
    // 30% Catalog Browsing
    group('Public Browsing', () => {
      const catRes = http.get(`${BASE_URL}${ENDPOINTS.jewellery.categories}`, getPublicHeaders());
      check(catRes, { 'categories status 200': (r) => r.status === 200 });
    });
  } else {
    // 30% Admin Operations
    group('Admin Operations', () => {
      const adminHeaders = getAdminHeaders();
      const statsRes = http.get(`${BASE_URL}${ENDPOINTS.adminJewellery.stats}`, adminHeaders);
      check(statsRes, { 'admin stats status 200': (r) => r.status === 200 });

      const tableRes = http.get(`${BASE_URL}${ENDPOINTS.adminJewellery.items}?tab=ALL&page=1&limit=10`, adminHeaders);
      check(tableRes, { 'admin table status 200': (r) => r.status === 200 });
    });
  }

  sleep(Math.random() * 1.5 + 0.5);
}
