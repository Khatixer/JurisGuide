import { createBrowserClient } from '@supabase/ssr'
import { createMockClient } from './mock-client'

export function createClient() {
  // Use mock client if we have dummy environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (supabaseUrl.includes('dummy-project') || supabaseKey.includes('dummy_key')) {
    console.log('🔧 Using mock Supabase client for development')
    return createMockClient() as any
  }
  
  return createBrowserClient(supabaseUrl, supabaseKey)
}