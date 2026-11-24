/**
 * Auth Helper for k6 scripts
 * Manages HTTP headers with Bearer tokens for User and Admin requests.
 */

// Load pre-generated tokens if available, or fall back to environment variables
let tokens = { userToken: '', adminToken: '' };

try {
  const raw = open('../config/tokens.json');
  if (raw) {
    tokens = JSON.parse(raw);
  }
} catch (e) {
  // Fallback if tokens.json is not yet created
}

export function getUserToken() {
  return __ENV.USER_TOKEN || tokens.userToken || '';
}

export function getAdminToken() {
  return __ENV.ADMIN_TOKEN || tokens.adminToken || '';
}

export function getPublicHeaders() {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
}

export function getUserHeaders() {
  const token = getUserToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}

export function getAdminHeaders() {
  const token = getAdminToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}
