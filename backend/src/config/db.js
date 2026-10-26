const mongoose = require('mongoose');
const dns = require('dns');

// On Windows, Node.js DNS resolution can fail on SRV records with EBADRESP.
// Setting public DNS servers ensures Atlas SRV records resolve reliably.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignore if not permitted
}

/**
 * Connect to MongoDB Atlas safely without leaking connection string credentials.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is undefined or empty.');
    }

    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // Sanitize any potential URI credentials from the error message
    const sanitizedError = (error.message || '').replace(
      /mongodb(\+srv)?:\/\/[^@]+@/gi,
      'mongodb+srv://[credentials-hidden]@'
    );
    console.error(`❌ MongoDB Connection Error: ${sanitizedError}`);

    const isSslAlert80 =
      sanitizedError.includes('alert number 80') ||
      (error.reason && JSON.stringify(error.reason).includes('alert number 80'));

    if (isSslAlert80 || sanitizedError.includes('whitelisted')) {
      console.error('\n🔒 Atlas Firewall / IP Whitelist Alert:');
      console.error('MongoDB Atlas rejected the TLS connection (SSL alert 80).');
      console.error('This happens when your current public IP address is not whitelisted in MongoDB Atlas Network Access.\n');
    } else {
      console.error('Please check network connectivity, IP whitelist on MongoDB Atlas, or credentials in .env.');
    }
    throw new Error('Failed to connect to MongoDB Atlas');
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = { connectDB, disconnectDB };
