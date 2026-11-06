const Razorpay = require('razorpay');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('./env.config');

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  // If live/test credentials are provided in environment
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_ID.includes('placeholder')) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
    return razorpayInstance;
  }

  // Fallback simulator for offline dev & test execution when keys are not yet added
  console.log('ℹ️ Running Razorpay in Sandbox/Simulation Mode');
  return {
    orders: {
      create: async ({ amount, currency, receipt, notes }) => ({
        id: `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount,
        currency: currency || 'INR',
        receipt: receipt || `rcpt_${Date.now()}`,
        status: 'created',
        notes: notes || {},
        created_at: Math.floor(Date.now() / 1000),
      }),
    },
  };
};

const setRazorpayInstance = (mock) => {
  razorpayInstance = mock;
};

module.exports = {
  getRazorpayInstance,
  setRazorpayInstance,
};
