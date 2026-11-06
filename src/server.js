const app = require('./app');
const connectDB = require('./config/db.config');
const { NODE_ENV } = require('./config/env.config');
const PORT = 8083;
/**
 * Initialize and start Arangtik Express Backend Server
 */
const startServer = async () => {
  try {
    // 1. Establish MongoDB Database Connection
    await connectDB();

    // 2. Auto-seed default subscription plans if missing
    try {
      const { seedSubscriptionPlans } = require('./modules/subscription/seedPlans');
      await seedSubscriptionPlans();
    } catch (seedErr) {
      console.warn('⚠️ Subscription plans auto-seed warning:', seedErr.message);
    }

    app.listen(8083, () => {
      console.log('==================================================');
      console.log(`🚀 Arangtik Backend Server Running in [${NODE_ENV.toUpperCase()}] mode`);
      console.log(`📡 Local Server URL: http://localhost:${PORT}`);
      console.log(`🔗 API Base Endpoint: http://localhost:${PORT}/api`);
      console.log(`📄 Health Check URL: http://localhost:${PORT}/api/health`);
      console.log('==================================================');
    });
  } catch (error) {
    console.error('❌ Critical Server Initialization Failure:', error);
    process.exit(1);
  }
};

startServer();
