/**
 * Feature: Orders Operations Load Test
 * Target: /api/orders, /api/orders/my
 * 
 * Tests concurrent order queries and status checks.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS } from '../../config/environments.js';
import { THRESHOLDS, STAGES } from '../../config/thresholds.js';
import { getUserHeaders } from '../../utils/authHelper.js';

const ordersQueryDuration = new Trend('orders_query_duration');
const ordersErrorRate = new Rate('orders_errors');

export const options = {
  stages: STAGES.standardLoad,
  thresholds: {
    ...THRESHOLDS.load,
    'orders_query_duration': ['p(95)<400'],
    'orders_errors': ['rate<0.02'],
  },
};

export default function () {
  const headers = getUserHeaders();

  const start = Date.now();
  const res = http.get(`${BASE_URL}${ENDPOINTS.orders.my}`, headers);
  ordersQueryDuration.add(Date.now() - start);

  const ok = check(res, {
    'orders status 200 or 404': (r) => r.status === 200 || r.status === 404,
  });
  ordersErrorRate.add(!ok);

  sleep(Math.random() * 1.2 + 0.6);
}
