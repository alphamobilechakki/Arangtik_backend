/**
 * Feature: Wardrobe Operations Load Test
 * Target: /api/garments, /api/categories
 * 
 * Tests concurrent browsing of wardrobe items and garments catalog.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS } from '../../config/environments.js';
import { THRESHOLDS, STAGES } from '../../config/thresholds.js';
import { getUserHeaders } from '../../utils/authHelper.js';

const garmentsQueryDuration = new Trend('wardrobe_garments_duration');
const wardrobeErrorRate = new Rate('wardrobe_errors');

export const options = {
  stages: STAGES.standardLoad,
  thresholds: {
    ...THRESHOLDS.load,
    'wardrobe_garments_duration': ['p(95)<350'],
    'wardrobe_errors': ['rate<0.02'],
  },
};

export default function () {
  const headers = getUserHeaders();

  // 1. Fetch user garments
  const garmentsStart = Date.now();
  const garmentsRes = http.get(`${BASE_URL}${ENDPOINTS.wardrobe.garments}`, headers);
  garmentsQueryDuration.add(Date.now() - garmentsStart);

  const garmentsOk = check(garmentsRes, {
    'garments status 200 or 404': (r) => r.status === 200 || r.status === 404,
  });
  wardrobeErrorRate.add(!garmentsOk);

  // 2. Fetch wardrobe categories
  const catRes = http.get(`${BASE_URL}${ENDPOINTS.wardrobe.categories}`, headers);
  check(catRes, {
    'wardrobe categories respond': (r) => r.status === 200 || r.status === 404,
  });

  sleep(Math.random() * 1.0 + 0.5);
}
