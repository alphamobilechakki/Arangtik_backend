/**
 * Feature: Jewellery - Public & Categories Load Test
 * Target: /api/jewellery/categories
 * 
 * Tests concurrent catalog browsing of jewellery categories.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS } from '../../config/environments.js';
import { THRESHOLDS, STAGES } from '../../config/thresholds.js';
import { getPublicHeaders } from '../../utils/authHelper.js';

// Custom metrics
const categoryQueryDuration = new Trend('jewellery_category_fetch_duration');
const categoryErrorRate = new Rate('jewellery_category_errors');

export const options = {
  stages: STAGES.standardLoad,
  thresholds: {
    ...THRESHOLDS.load,
    'jewellery_category_fetch_duration': ['p(95)<250'],
    'jewellery_category_errors': ['rate<0.01'],
  },
};

export default function () {
  const url = `${BASE_URL}${ENDPOINTS.jewellery.categories}`;
  const res = http.get(url, getPublicHeaders());

  categoryQueryDuration.add(res.timings.duration);

  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
    'has categories array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data || body);
      } catch (e) {
        return false;
      }
    },
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  categoryErrorRate.add(!isSuccess);

  // Think time between 0.5s to 1.5s
  sleep(Math.random() * 1.0 + 0.5);
}
