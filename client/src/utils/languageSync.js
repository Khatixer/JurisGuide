import axios from 'axios';

// API client for language preference synchronization
class LanguageSyncService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || '/api';
  }

  // Get authentication headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Sync language preference to server
  async syncLanguagePreference(languageCode) {
    try {
      const response = await axios.put(
        `${this.baseURL}/auth/profile`,
        { preferredLanguage: languageCode },
        { headers: this.getAuthHeaders() }
      );
      
      return response.data.success;
    } catch (error) {
      console.warn('Failed to sync language preference to server:', error);
      return false;
    }
  }

  // Get user profile including language preference
  async getUserProfile() {
    try {
      const response = await axios.get(
        `${this.baseURL}/auth/profile`,
        { headers: this.getAuthHeaders() }
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.warn('Failed to get user profile:', error);
      return null;
    }
  }

  // Initialize user language from server profile
  async initializeUserLanguage() {
    const profile = await this.getUserProfile();
    if (profile && profile.profile && profile.profile.preferredLanguage) {
      return profile.profile.preferredLanguage;
    }
    return null;
  }

  // Update user cultural background
  async updateCulturalBackground(culturalBackground) {
    try {
      const response = await axios.put(
        `${this.baseURL}/auth/profile`,
        { culturalBackground },
        { headers: this.getAuthHeaders() }
      );
      
      return response.data.success;
    } catch (error) {
      console.warn('Failed to update cultural background:', error);
      return false;
    }
  }

  // Update communication style preference
  async updateCommunicationStyle(communicationStyle) {
    try {
      const response = await axios.put(
        `${this.baseURL}/auth/preferences`,
        { communicationStyle },
        { headers: this.getAuthHeaders() }
      );
      
      return response.data.success;
    } catch (error) {
      console.warn('Failed to update communication style:', error);
      return false;
    }
  }

  // Get supported languages and cultures from server
  async getServerConfig() {
    try {
      const response = await axios.get(`${this.baseURL}/auth/config`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.warn('Failed to get server config:', error);
      return null;
    }
  }
}

// Create singleton instance
const languageSyncService = new LanguageSyncService();

// Export utility functions
export const syncLanguagePreference = (languageCode) => 
  languageSyncService.syncLanguagePreference(languageCode);

export const getUserProfile = () => 
  languageSyncService.getUserProfile();

export const initializeUserLanguage = () => 
  languageSyncService.initializeUserLanguage();

export const updateCulturalBackground = (culturalBackground) => 
  languageSyncService.updateCulturalBackground(culturalBackground);

export const updateCommunicationStyle = (communicationStyle) => 
  languageSyncService.updateCommunicationStyle(communicationStyle);

export const getServerConfig = () => 
  languageSyncService.getServerConfig();

export default languageSyncService;