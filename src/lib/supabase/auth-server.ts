import { createClient as createServerClient } from './server'

// Server-side authentication functions
export async function getServerUser() {
  const supabase = await createServerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    return null
  }

  return user
}

export async function getServerSession() {
  const supabase = await createServerClient()
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    return null
  }

  return session
}