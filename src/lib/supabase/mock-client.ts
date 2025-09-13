// Mock Supabase client for development/testing without real Supabase connection
import type { Profile, Case, CaseParticipant, Message } from '@/types/database'

// Mock data
const mockProfiles: Profile[] = [
  {
    id: 'user-1',
    email: 'john.doe@example.com',
    full_name: 'John Doe',
    avatar_url: null,
    role: 'user',
    country: 'United States',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'user-2',
    email: 'jane.smith@example.com',
    full_name: 'Jane Smith',
    avatar_url: null,
    role: 'user',
    country: 'United Kingdom',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

const mockCases: Case[] = [
  {
    id: 'case-1',
    title: 'Contract Dispute Resolution',
    description: 'Dispute over service delivery terms in international contract',
    status: 'active',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'case-2',
    title: 'Employment Rights Consultation',
    description: 'Questions about employment rights in cross-border work arrangement',
    status: 'pending',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    case_id: 'case-1',
    sender_id: 'user-1',
    sender_type: 'user',
    content: 'Hello, I need help with this contract dispute.',
    created_at: new Date().toISOString()
  },
  {
    id: 'msg-2',
    case_id: 'case-1',
    sender_id: 'system',
    sender_type: 'ai_mediator',
    content: 'I understand you have a contract dispute. Can you provide more details about the specific terms in question?',
    created_at: new Date().toISOString()
  }
]

// Mock Supabase client interface
export function createMockClient() {
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            if (table === 'profiles') {
              const profile = mockProfiles.find(p => p.id === value || p.email === value)
              return { data: profile || null, error: profile ? null : { message: 'Profile not found' } }
            }
            if (table === 'cases') {
              const case_ = mockCases.find(c => c.id === value)
              return { data: case_ || null, error: case_ ? null : { message: 'Case not found' } }
            }
            return { data: null, error: { message: 'Not found' } }
          },
          order: (column: string, options?: any) => ({
            then: async (callback: any) => {
              if (table === 'cases') {
                return callback({ data: mockCases, error: null, count: mockCases.length })
              }
              if (table === 'messages') {
                const caseMessages = mockMessages.filter(m => m.case_id === value)
                return callback({ data: caseMessages, error: null, count: caseMessages.length })
              }
              return callback({ data: [], error: null, count: 0 })
            }
          })
        }),
        or: (filter: string) => ({
          order: (column: string, options?: any) => ({
            then: async (callback: any) => {
              return callback({ data: mockCases, error: null, count: mockCases.length })
            }
          })
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            const id = `${table}-${Date.now()}`
            const newItem = { ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            
            if (table === 'profiles') {
              mockProfiles.push(newItem)
            } else if (table === 'cases') {
              mockCases.push(newItem)
            } else if (table === 'messages') {
              mockMessages.push(newItem)
            }
            
            return { data: newItem, error: null }
          }
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: async () => {
              if (table === 'profiles') {
                const index = mockProfiles.findIndex(p => p.id === value)
                if (index >= 0) {
                  mockProfiles[index] = { ...mockProfiles[index], ...data, updated_at: new Date().toISOString() }
                  return { data: mockProfiles[index], error: null }
                }
              }
              return { data: null, error: { message: 'Not found' } }
            }
          })
        })
      })
    }),
    auth: {
      getUser: async () => ({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'john.doe@example.com',
            user_metadata: { full_name: 'John Doe' }
          } 
        }, 
        error: null 
      }),
      signUp: async (credentials: any) => ({
        data: { 
          user: { 
            id: `user-${Date.now()}`, 
            email: credentials.email,
            user_metadata: credentials.options?.data || {}
          } 
        }, 
        error: null 
      }),
      signInWithPassword: async (credentials: any) => ({
        data: { 
          user: { 
            id: 'user-1', 
            email: credentials.email,
            user_metadata: { full_name: 'John Doe' }
          } 
        }, 
        error: null 
      }),
      signOut: async () => ({ error: null })
    },
    channel: (name: string) => ({
      on: (event: string, config: any, callback: any) => ({
        subscribe: () => ({
          unsubscribe: () => {}
        })
      })
    }),
    removeChannel: (channel: any) => {}
  }
}