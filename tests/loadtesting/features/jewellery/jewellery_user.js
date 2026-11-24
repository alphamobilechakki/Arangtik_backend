/**
 * Feature: Jewellery - User Operations Load Test
 * Target: /api/jewellery/items, /boxes, /sets
 * 
 * Simulates user creating, reading, and listing vault items concurrently.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, ENDPOINTS } from '../../config/environments.js';
import { THRESHOLDS, STAGES } from '../../config/thresholds.js';
import { getUserHeaders } from '../../utils/authHelper.js';
import { generateJewelleryItemPayload, generateBoxPayload } from '../../utils/dataGenerator.js';

const vaultListDuration = new Trend('vault_list_duration');
const vaultCreateDuration = new Trend('vault_create_duration');
const itemsCreatedCounter = new Counter('vault_items_created_total');

export const options = {
  stages: STAGES.standardLoad,
  thresholds: {
    ...THRESHOLDS.load,
    'vault_list_duration': ['p(95)<350'],
    'vault_create_duration': ['p(95)<500'],
  },
};

// Setup step: Fetch a valid category ID before load test begins
export function setup() {
  const catRes = http.get(`${BASE_URL}${ENDPOINTS.jewellery.categories}`, getUserHeaders());
  let categoryId = null;
  try {
    const json = JSON.parse(catRes.body);
    const list = json.data || json;
    if (list && list.length > 0) {
      categoryId = list[0]._id || list[0].id;
    }
  } catch (e) {}

  // Also create a test box for the user
  let boxId = null;
  const boxRes = http.post(
    `${BASE_URL}${ENDPOINTS.jewellery.boxes}`,
    JSON.stringify(generateBoxPayload()),
    getUserHeaders()
  );
  try {
    const json = JSON.parse(boxRes.body);
    boxId = (json.data && json.data._id) || json._id;
  } catch (e) {}

  return { categoryId, boxId };
}

export default function (data) {
  const headers = getUserHeaders();

  // 1. Fetch user boxes
  const boxesRes = http.get(`${BASE_URL}${ENDPOINTS.jewellery.boxes}`, headers);
  check(boxesRes, {
    'boxes status 200': (r) => r.status === 200,
  });

  // 2. Fetch user jewellery items list
  const listStart = Date.now();
  const itemsRes = http.get(`${BASE_URL}${ENDPOINTS.jewellery.items}`, headers);
  vaultListDuration.add(Date.now() - listStart);

  check(itemsRes, {
    'items list status 200': (r) => r.status === 200,
    'items latency < 400ms': (r) => r.timings.duration < 400,
  });

  // 3. Create a new item (1 in every 4 iterations to simulate write ratio)
  if (data.categoryId && Math.random() < 0.25) {
    const payload = JSON.stringify(generateJewelleryItemPayload(data.categoryId, data.boxId));
    const createStart = Date.now();
    const createRes = http.post(`${BASE_URL}${ENDPOINTS.jewellery.items}`, payload, headers);
    vaultCreateDuration.add(Date.now() - createStart);

    const createdOk = check(createRes, {
      'item created 201': (r) => r.status === 201,
    });

    if (createdOk) {
      itemsCreatedCounter.add(1);
    }
  }

  sleep(Math.random() * 1.5 + 0.5);
}
