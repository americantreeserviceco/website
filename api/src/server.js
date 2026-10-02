const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');
const { createApp } = require('./app');

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function createServerApp() {
  const supabase = createClient(
    requiredEnvironment('SUPABASE_URL'),
    requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return createApp({
    db: supabase,
    getUserForToken: (token) => supabase.auth.getUser(token),
    allowedOrigins,
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }
  createServerApp().listen(port, () => console.log(`Tree Care API listening on port ${port}`));
}

module.exports = { createServerApp };