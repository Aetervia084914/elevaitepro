// Check environment variables
console.log('Checking environment variables...');
console.log('GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current working directory:', process.cwd());

// Try to load .env.local manually
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('.env.local content:', envContent);
} catch (error) {
  console.error('Could not read .env.local:', error.message);
}
