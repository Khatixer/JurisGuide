export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'lawyer' | 'admin'
          country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'lawyer' | 'admin'
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'lawyer' | 'admin'
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      cases: {
        Row: {
          id: string
          title: string
          description: string
          status: 'pending' | 'active' | 'resolved' | 'cancelled'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          status?: 'pending' | 'active' | 'resolved' | 'cancelled'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: 'pending' | 'active' | 'resolved' | 'cancelled'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      case_participants: {
        Row: {
          id: string
          case_id: string
          user_id: string | null
          email: string
          joined_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id?: string | null
          email: string
          joined_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string | null
          email?: string
          joined_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_participants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          case_id: string
          sender_id: string | null
          sender_type: 'user' | 'ai_mediator'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          sender_id?: string | null
          sender_type?: 'user' | 'ai_mediator'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          sender_id?: string | null
          sender_type?: 'user' | 'ai_mediator'
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'user' | 'lawyer' | 'admin'
      case_status: 'pending' | 'active' | 'resolved' | 'cancelled'
      message_sender_type: 'user' | 'ai_mediator'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

// Convenience types for table rows
export type Profile = Tables<'profiles'>
export type Case = Tables<'cases'>
export type CaseParticipant = Tables<'case_participants'>
export type Message = Tables<'messages'>

// Convenience types for table inserts
export type ProfileInsert = TablesInsert<'profiles'>
export type CaseInsert = TablesInsert<'cases'>
export type CaseParticipantInsert = TablesInsert<'case_participants'>
export type MessageInsert = TablesInsert<'messages'>

// Convenience types for table updates
export type ProfileUpdate = TablesUpdate<'profiles'>
export type CaseUpdate = TablesUpdate<'cases'>
export type CaseParticipantUpdate = TablesUpdate<'case_participants'>
export type MessageUpdate = TablesUpdate<'messages'>

// Enum types
export type UserRole = Enums<'user_role'>
export type CaseStatus = Enums<'case_status'>
export type MessageSenderType = Enums<'message_sender_type'>

// Utility types for better type safety
export type DatabaseTable = keyof Database['public']['Tables']
export type DatabaseEnum = keyof Database['public']['Enums']

// Type guards for runtime type checking
export const isValidUserRole = (role: string): role is UserRole => {
  return ['user', 'lawyer', 'admin'].includes(role)
}

export const isValidCaseStatus = (status: string): status is CaseStatus => {
  return ['pending', 'active', 'resolved', 'cancelled'].includes(status)
}

export const isValidMessageSenderType = (type: string): type is MessageSenderType => {
  return ['user', 'ai_mediator'].includes(type)
}

// Helper types for joins and relationships
export type ProfileWithCases = Profile & {
  cases: Case[]
}

export type CaseWithDetails = Case & {
  created_by_profile: Profile
  case_participants: (CaseParticipant & {
    profiles: Profile | null
  })[]
  messages: Message[]
}

export type MessageWithSender = Message & {
  sender_profile: Profile | null
}

// Database operation result types
export type DatabaseResult<T> = {
  data: T | null
  error: {
    message: string
    details?: string
    hint?: string
    code?: string
  } | null
}

export type DatabaseListResult<T> = {
  data: T[] | null
  error: {
    message: string
    details?: string
    hint?: string
    code?: string
  } | null
  count?: number | null
}

// Query builder helper types
export type SelectQuery<T extends DatabaseTable> = {
  select?: string
  eq?: Partial<Tables<T>>
  neq?: Partial<Tables<T>>
  gt?: Partial<Tables<T>>
  gte?: Partial<Tables<T>>
  lt?: Partial<Tables<T>>
  lte?: Partial<Tables<T>>
  like?: Partial<Record<keyof Tables<T>, string>>
  ilike?: Partial<Record<keyof Tables<T>, string>>
  in?: Partial<Record<keyof Tables<T>, any[]>>
  order?: {
    column: keyof Tables<T>
    ascending?: boolean
  }[]
  limit?: number
  offset?: number
}

// RLS (Row Level Security) policy types
export type RLSPolicy = {
  table: DatabaseTable
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  using?: string
  check?: string
}

// Supabase client method return types
export type SupabaseQueryResult<T> = Promise<{
  data: T | null
  error: {
    message: string
    details?: string
    hint?: string
    code?: string
  } | null
}>

export type SupabaseListQueryResult<T> = Promise<{
  data: T[] | null
  error: {
    message: string
    details?: string
    hint?: string
    code?: string
  } | null
  count?: number | null
}>

// Real-time subscription types
export type RealtimeChannel = {
  table: DatabaseTable
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  filter?: string
}

export type RealtimePayload<T = any> = {
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  new?: T
  old?: T
  errors?: any[]
}