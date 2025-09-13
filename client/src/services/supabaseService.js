import { supabase, TABLES, supabaseHelpers } from '../lib/supabase'

export class SupabaseService {
  // Authentication Services
  static async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabaseHelpers.signUp(email, password, userData)
      if (error) throw error

      // Create user profile
      if (data.user) {
        await this.createUserProfile(data.user.id, {
          email,
          full_name: userData.full_name || '',
          role: userData.role || 'user'
        })
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async signIn(email, password) {
    try {
      const { data, error } = await supabaseHelpers.signIn(email, password)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async signOut() {
    try {
      const { error } = await supabaseHelpers.signOut()
      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async getCurrentUser() {
    try {
      const user = await supabaseHelpers.getCurrentUser()
      if (user) {
        // Get user profile
        const { data: profile } = await supabaseHelpers.getRecordById(TABLES.USERS, user.id)
        return { ...user, profile }
      }
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // User Profile Services
  static async createUserProfile(userId, profileData) {
    return await supabaseHelpers.insertRecord(TABLES.USERS, {
      id: userId,
      ...profileData
    })
  }

  static async updateUserProfile(userId, profileData) {
    return await supabaseHelpers.updateRecord(TABLES.USERS, userId, profileData)
  }

  static async getUserProfile(userId) {
    return await supabaseHelpers.getRecordById(TABLES.USERS, userId)
  }

  // Legal Queries Services
  static async createLegalQuery(queryData) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    return await supabaseHelpers.insertRecord(TABLES.LEGAL_QUERIES, {
      user_id: user.id,
      ...queryData
    })
  }

  static async getLegalQueries(userId = null) {
    const user = userId || (await this.getCurrentUser())?.id
    if (!user) throw new Error('User not authenticated')

    return await supabaseHelpers.getRecords(TABLES.LEGAL_QUERIES, { user_id: user })
  }

  static async updateLegalQuery(queryId, updateData) {
    return await supabaseHelpers.updateRecord(TABLES.LEGAL_QUERIES, queryId, updateData)
  }

  static async deleteLegalQuery(queryId) {
    return await supabaseHelpers.deleteRecord(TABLES.LEGAL_QUERIES, queryId)
  }

  // Legal Guidance Services
  static async createLegalGuidance(guidanceData) {
    return await supabaseHelpers.insertRecord(TABLES.LEGAL_GUIDANCE, guidanceData)
  }

  static async getLegalGuidance(queryId) {
    const { data, error } = await supabase
      .from(TABLES.LEGAL_GUIDANCE)
      .select('*')
      .eq('query_id', queryId)
      .single()
    
    return { data, error }
  }

  // Lawyers Services
  static async getLawyers(filters = {}) {
    let query = supabase.from(TABLES.LAWYERS).select('*')
    
    // Apply filters
    if (filters.specialization && filters.specialization !== 'any') {
      query = query.ilike('specialization', `%${filters.specialization}%`)
    }
    
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`)
    }
    
    if (filters.maxBudget && filters.maxBudget !== 'any') {
      query = query.lte('hourly_rate', parseFloat(filters.maxBudget))
    }
    
    if (filters.language && filters.language !== 'english') {
      query = query.contains('languages', [filters.language])
    }

    const { data, error } = await query
    return { data, error }
  }

  static async createLawyerProfile(lawyerData) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    return await supabaseHelpers.insertRecord(TABLES.LAWYERS, {
      user_id: user.id,
      ...lawyerData
    })
  }

  static async updateLawyerProfile(lawyerId, lawyerData) {
    return await supabaseHelpers.updateRecord(TABLES.LAWYERS, lawyerId, lawyerData)
  }

  // Mediation Cases Services
  static async createMediationCase(caseData) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    return await supabaseHelpers.insertRecord(TABLES.MEDIATION_CASES, {
      user_id: user.id,
      ...caseData
    })
  }

  static async getMediationCases(userId = null) {
    const user = userId || (await this.getCurrentUser())?.id
    if (!user) throw new Error('User not authenticated')

    return await supabaseHelpers.getRecords(TABLES.MEDIATION_CASES, { user_id: user })
  }

  static async updateMediationCase(caseId, updateData) {
    return await supabaseHelpers.updateRecord(TABLES.MEDIATION_CASES, caseId, updateData)
  }

  static async deleteMediationCase(caseId) {
    return await supabaseHelpers.deleteRecord(TABLES.MEDIATION_CASES, caseId)
  }

  // Notifications Services
  static async createNotification(userId, notificationData) {
    return await supabaseHelpers.insertRecord(TABLES.NOTIFICATIONS, {
      user_id: userId,
      ...notificationData
    })
  }

  static async getNotifications(userId = null) {
    const user = userId || (await this.getCurrentUser())?.id
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .eq('user_id', user)
      .order('created_at', { ascending: false })
    
    return { data, error }
  }

  static async markNotificationAsRead(notificationId) {
    return await supabaseHelpers.updateRecord(TABLES.NOTIFICATIONS, notificationId, { read: true })
  }

  // Real-time subscriptions
  static subscribeToUserNotifications(userId, callback) {
    return supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe()
  }

  static subscribeToLegalQueries(userId, callback) {
    return supabase
      .channel('legal_queries')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'legal_queries',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe()
  }

  static subscribeToMediationCases(userId, callback) {
    return supabase
      .channel('mediation_cases')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mediation_cases',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe()
  }
}

export default SupabaseService