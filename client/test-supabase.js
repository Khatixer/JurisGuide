// Quick test to check Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Key:', supabaseAnonKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials are missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
      console.log('This might be normal if the users table doesn\'t exist yet');
    } else {
      console.log('✅ Supabase connection successful');
    }
    
    // Test auth
    console.log('\nTesting auth service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth service error:', authError.message);
    } else {
      console.log('✅ Auth service is working');
      console.log('Current session:', authData.session ? 'Active' : 'None');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testConnection();