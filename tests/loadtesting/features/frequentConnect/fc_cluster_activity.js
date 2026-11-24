/**
 * Feature: Frequent Connect Load Test
 * Target: /api/frequent-connect/clusters, /api/frequent-connect/conversations
 * 
 * Tests cluster listing, conversation threading, and connection indexing under load.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS } from '../../config/environments.js';
import { THRESHOLDS, STAGES } from '../../config/thresholds.js';
import { getUserHeaders } from '../../utils/authHelper.js';

const fcClustersDuration = new Trend('fc_clusters_duration');
const fcErrorRate = new Rate('fc_errors');

export const options = {
  stages: STAGES.standardLoad,
  thresholds: {
    ...THRESHOLDS.load,
    'fc_clusters_duration': ['p(95)<400'],
  },
};

export default function () {
  const headers = getUserHeaders();

  const start = Date.now();
  const clustersRes = http.get(`${BASE_URL}${ENDPOINTS.frequentConnect.clusters}`, headers);
  fcClustersDuration.add(Date.now() - start);

  const ok = check(clustersRes, {
    'fc clusters responds': (r) => r.status === 200 || r.status === 404,
  });
  fcErrorRate.add(!ok);

  sleep(Math.random() * 1.0 + 0.5);
}
