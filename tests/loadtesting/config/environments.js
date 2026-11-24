/**
 * Load Testing Environment Configuration
 * Supports Local, Staging, and Production targets.
 */

export const ENVIRONMENTS = {
  local: {
    baseUrl: 'http://localhost:8083/api',
    timeout: '5s',
  },
  staging: {
    baseUrl: 'https://staging-api.arangtik.com/api',
    timeout: '8s',
  },
  production: {
    baseUrl: 'https://api.arangtik.com/api',
    timeout: '10s',
  },
};

// Select active environment based on __ENV.TARGET (defaults to local)
const target = __ENV.TARGET || 'local';
export const CURRENT_ENV = ENVIRONMENTS[target] || ENVIRONMENTS.local;
export const BASE_URL = __ENV.BASE_URL || CURRENT_ENV.baseUrl;

export const ENDPOINTS = {
  // Public / Health
  health: '/health',
  
  // Auth
  auth: {
    sendOtp: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    profile: '/auth/profile',
  },

  // Jewellery
  jewellery: {
    categories: '/jewellery/categories',
    boxes: '/jewellery/boxes',
    sets: '/jewellery/sets',
    items: '/jewellery',
    itemById: (id) => `/jewellery/${id}`,
    boxById: (id) => `/jewellery/boxes/${id}`,
    setById: (id) => `/jewellery/sets/${id}`,
  },

  // Admin Jewellery
  adminJewellery: {
    stats: '/admin/jewellery/stats',
    items: '/admin/jewellery/items',
    itemById: (id) => `/admin/jewellery/items/${id}`,
    userOverview: (userId) => `/admin/jewellery/users/${userId}`,
    overrideStatus: (id) => `/admin/jewellery/items/${id}/status`,
  },

  // Wardrobe
  wardrobe: {
    garments: '/garments',
    categories: '/categories',
  },

  // Orders
  orders: {
    list: '/orders',
    create: '/orders',
    myOrders: '/orders/my',
  },

  // Frequent Connect
  frequentConnect: {
    clusters: '/frequent-connect/clusters',
    conversations: '/frequent-connect/conversations',
  },

  // Admin Core
  admin: {
    terminals: '/admin/terminals',
    storeTypes: '/admin/store-types',
  },
};
