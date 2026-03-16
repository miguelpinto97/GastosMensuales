const { neon } = require('@neondatabase/serverless');

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }
  return neon(process.env.DATABASE_URL);
};

module.exports = { getDb };
