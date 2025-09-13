import { createClient } from './client'


export type SignUpData = {
  email: string
  password: string
  fullName: string
  country: string
  role: 'user' | 'lawyer' | 'admin'
}

export type SignInData = {
  email: string
  password: string
}

// Client-side authentication functions
export async function signUp(data: SignUpData) {
  const supabase = createClient()
  
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        country: data.country,
        role: data.role,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return authData
}

export async function signIn(data: SignInData) {
  const supabase = createClient()
  
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return authData
}

export async function signOut() {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(error.message)
  }
}

export async function getCurrentUser() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new Error(error.message)
  }

  return user
}

// Server-side authentication functions (moved to separate server-only file)