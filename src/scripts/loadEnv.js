const { config } = require('dotenv');
const { resolve } = require('path');

// Load environment variables from .env.local
config({
  path: resolve(process.cwd(), '.env.local')
}); 