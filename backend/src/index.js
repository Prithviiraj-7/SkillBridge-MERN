const path = require('path');
const dotenv = require('dotenv');

// Load .env explicitly from the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { validateEnv } = require('./config/validateEnv');
const { connectDB } = require('./config/db');
const app = require('./app');

// 1. Validate environment configuration
validateEnv();

const PORT = process.env.PORT || 5000;

// 2. Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`🚀 SkillBridge server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        const { disconnectDB } = require('./config/db');
        await disconnectDB();
        console.log('MongoDB connection closed. Server terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Fatal error during server startup. Terminating process.');
    process.exit(1);
  }
};

startServer();
