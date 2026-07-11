const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const localUri = 'mongodb://127.0.0.1:27017/taskpilot';

  console.log('Connecting to database...');

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    console.log(`MongoDB Connected (Atlas): ${conn.connection.host}`);
  } catch (atlasError) {
    console.error(`Database Connection Error (Atlas): ${atlasError.message}`);
    console.log('MongoDB Atlas connection failed. This is likely due to your current IP address not being whitelisted or a lack of internet connection.');
    console.log(`Attempting fallback to local MongoDB at ${localUri}...`);

    try {
      const conn = await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 3000 // 3 seconds timeout
      });
      console.log(`MongoDB Connected (Local): ${conn.connection.host}`);
    } catch (localError) {
      console.error(`Local MongoDB Connection Error: ${localError.message}`);
      console.error('\n========================================================================');
      console.error('CRITICAL: Could not connect to MongoDB Atlas OR local MongoDB.');
      console.error('1. If using MongoDB Atlas, make sure your current IP address is whitelisted:');
      console.error('   https://www.mongodb.com/docs/atlas/security-whitelist/');
      console.error('2. If using local MongoDB, make sure the MongoDB service is running on port 27017.');
      console.error('========================================================================\n');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
