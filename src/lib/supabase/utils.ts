import { createClient } from './client'
import type { 
  Profile, 
  Case, 
  CaseParticipant, 
  Message,
  ProfileInsert,
  CaseInsert,
  MessageInsert,
  DatabaseResult,
  DatabaseListResult
} from '@/types/database'
import type { CaseWithParticipants, MessageWithProfile } from '@/types'

export type SupabaseClient = ReturnType<typeof createClient>

// Profile utilities with proper error handling
export async function getProfile(userId: string): Promise<DatabaseResult<Profile>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error }
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<DatabaseResult<Profile>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

export async function createProfile(profile: ProfileInsert): Promise<DatabaseResult<Profile>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single()

  return { data, error }
}

// Case utilities with improved type safety
export async function getUserCases(userId: string): Promise<DatabaseListResult<CaseWithParticipants>> {
  const supabase = createClient()
  
  const { data, error, count } = await supabase
    .from('cases')
    .select(`
      *,
      case_participants (
        *,
        profiles (
          full_name,
          email
        )
      )
    `)
    .or(`created_by.eq.${userId},case_participants.user_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  return { 
    data: data as CaseWithParticipants[] | null, 
    error, 
    count 
  }
}

export async function createCase(caseData: CaseInsert): Promise<DatabaseResult<Case>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cases')
    .insert(caseData)
    .select()
    .single()

  return { data, error }
}

export async function createCaseWithParticipants(
  caseData: CaseInsert,
  participantEmails: string[]
): Promise<DatabaseResult<{ case: Case; participants: CaseParticipant[] }>> {
  const supabase = createClient()
  
  try {
    // Create the case
    const { data: newCase, error: caseError } = await createCase(caseData)
    if (caseError || !newCase) {
      return { data: null, error: caseError }
    }

    // Add participants
    const participants: CaseParticipant[] = []
    if (participantEmails.length > 0) {
      const participantInserts = participantEmails.map(email => ({
        case_id: newCase.id,
        email,
        user_id: null, // Will be updated when user joins
      }))

      const { data: participantData, error: participantsError } = await supabase
        .from('case_participants')
        .insert(participantInserts)
        .select()

      if (participantsError) {
        return { data: null, error: participantsError }
      }

      participants.push(...(participantData || []))
    }

    return {
      data: {
        case: newCase,
        participants
      },
      error: null
    }
  } catch (error) {
    return {
      data: null,
      error: {
        message: 'Failed to create case with participants',
        details: String(error)
      }
    }
  }
}

export async function getCaseWithParticipants(caseId: string): Promise<DatabaseResult<CaseWithParticipants>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      case_participants (
        *,
        profiles (
          full_name,
          email
        )
      )
    `)
    .eq('id', caseId)
    .single()

  return { data: data as CaseWithParticipants | null, error }
}

// Message utilities with proper typing
export async function getCaseMessages(caseId: string): Promise<DatabaseListResult<MessageWithProfile>> {
  const supabase = createClient()
  const { data, error, count } = await supabase
    .from('messages')
    .select(`
      *,
      profiles (
        full_name,
        email
      )
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  return { 
    data: data as MessageWithProfile[] | null, 
    error, 
    count 
  }
}

export async function sendMessage(messageData: MessageInsert): Promise<DatabaseResult<Message>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single()

  return { data, error }
}

// Realtime utilities with proper typing
export function subscribeToMessages(caseId: string, callback: (message: Message) => void) {
  const supabase = createClient()
  
  return supabase
    .channel(`messages:${caseId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `case_id=eq.${caseId}`,
      },
      (payload: any) => {
        callback(payload.new as Message)
      }
    )
    .subscribe()
}

export function subscribeToCase(caseId: string, callback: (caseData: Case) => void) {
  const supabase = createClient()
  
  return supabase
    .channel(`case:${caseId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'cases',
        filter: `id=eq.${caseId}`,
      },
      (payload: any) => {
        callback(payload.new as Case)
      }
    )
    .subscribe()
}

export function unsubscribeFromChannel(subscription: ReturnType<typeof subscribeToMessages>) {
  const supabase = createClient()
  supabase.removeChannel(subscription)
}

// Utility functions for access control
export async function checkUserCaseAccess(userId: string, caseId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('cases')
    .select(`
      id,
      created_by,
      case_participants!inner (
        user_id
      )
    `)
    .eq('id', caseId)
    .or(`created_by.eq.${userId},case_participants.user_id.eq.${userId}`)
    .single()

  return !error && data !== null
}

export async function getUserByEmail(email: string): Promise<DatabaseResult<Profile>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()

  return { data, error }
}

// Type-safe error handling utilities
export function isSupabaseError(error: any): error is { message: string; details?: string; hint?: string; code?: string } {
  return error && typeof error.message === 'string'
}

export function handleSupabaseError(error: any): string {
  if (isSupabaseError(error)) {
    return error.message
  }
  return 'An unexpected error occurred'
}