const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'PORT',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL',
];

const validateEnv = () => {
  const missing = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar] || process.env[envVar].trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Configuration error: Missing required environment variable(s):');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error('Please verify your .env file contains all required configuration.');
    process.exit(1);
  }
};

module.exports = { validateEnv, REQUIRED_ENV_VARS };
