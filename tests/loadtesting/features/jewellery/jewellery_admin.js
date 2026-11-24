/**
 * Feature: Jewellery - Admin Operations Load Test
 * Target: /api/admin/jewellery/stats, /items, /users/:userId
 * 
 * Simulates admin portal queries, search by phone, SLA tab counts, and user drill-downs.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS } from '../../config/environments.js';
import { THRESHOLDS, STAGES } from '../../config/thresholds.js';
import { getAdminHeaders } from '../../utils/authHelper.js';

const adminStatsDuration = new Trend('admin_jewellery_stats_duration');
const adminItemsTableDuration = new Trend('admin_jewellery_table_duration');
const adminSearchDuration = new Trend('admin_jewellery_search_duration');
const adminErrorRate = new Rate('admin_jewellery_errors');

export const options = {
  stages: STAGES.standardLoad,
  thresholds: {
    ...THRESHOLDS.load,
    'admin_jewellery_stats_duration': ['p(95)<300'],
    'admin_jewellery_table_duration': ['p(95)<400'],
    'admin_jewellery_search_duration': ['p(95)<450'],
    'admin_jewellery_errors': ['rate<0.01'],
  },
};

export default function () {
  const headers = getAdminHeaders();

  // 1. Query Admin KPIs & SLA counts
  const statsStart = Date.now();
  const statsRes = http.get(`${BASE_URL}${ENDPOINTS.adminJewellery.stats}`, headers);
  adminStatsDuration.add(Date.now() - statsStart);

  const statsOk = check(statsRes, {
    'admin stats 200': (r) => r.status === 200,
    'has stats body': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && typeof body.data.totalItems === 'number';
      } catch (e) {
        return false;
      }
    },
  });
  adminErrorRate.add(!statsOk);

  // 2. Query Global Operations Table (default tab: ALL)
  const tableStart = Date.now();
  const tableRes = http.get(`${BASE_URL}${ENDPOINTS.adminJewellery.items}?tab=ALL&page=1&limit=10`, headers);
  adminItemsTableDuration.add(Date.now() - tableStart);

  const tableOk = check(tableRes, {
    'admin items table 200': (r) => r.status === 200,
    'has tabCounts': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.tabCounts !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  adminErrorRate.add(!tableOk);

  // 3. Query SLA alerts tab (OVERDUE)
  const overdueRes = http.get(`${BASE_URL}${ENDPOINTS.adminJewellery.items}?tab=OVERDUE&page=1&limit=10`, headers);
  check(overdueRes, {
    'overdue tab 200': (r) => r.status === 200,
  });

  // 4. Test Cross-user search by phone/name
  const searchStart = Date.now();
  const searchRes = http.get(`${BASE_URL}${ENDPOINTS.adminJewellery.items}?search=9876&page=1&limit=10`, headers);
  adminSearchDuration.add(Date.now() - searchStart);

  const searchOk = check(searchRes, {
    'search query 200': (r) => r.status === 200,
  });
  adminErrorRate.add(!searchOk);

  sleep(Math.random() * 1.5 + 0.5);
}
