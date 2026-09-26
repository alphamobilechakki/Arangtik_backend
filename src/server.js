const app = require('./app');
const connectDB = require('./config/db.config');
const { PORT } = require('./config/env.config');

const startServer = async () => {
  try {
    // Connect to MongoDB Database
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Arangtik Backend Server is running on port ${PORT}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
