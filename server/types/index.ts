// Core domain interfaces for JurisGuide platform

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface UserPreferences {
  communicationStyle: 'formal' | 'casual';
  notificationSettings: NotificationSettings;
  privacyLevel: 'high' | 'medium' | 'low';
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  location: Location;
  culturalBackground: string;
  preferredLanguage: string;
  timezone: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export type LegalCategory = 
  | 'contract_dispute'
  | 'employment_law'
  | 'family_law'
  | 'criminal_law'
  | 'immigration_law'
  | 'intellectual_property'
  | 'real_estate'
  | 'personal_injury'
  | 'business_law'
  | 'tax_law'
  | 'other';

export interface LegalQuery {
  id: string;
  userId: string;
  description: string;
  category: LegalCategory;
  jurisdiction: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  culturalContext: string;
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Resource {
  type: 'document' | 'link' | 'contact';
  title: string;
  url?: string;
  description: string;
}

export interface GuidanceStep {
  order: number;
  title: string;
  description: string;
  timeframe: string;
  resources: Resource[];
  jurisdictionSpecific: boolean;
}

export interface LegalReference {
  statute: string;
  jurisdiction: string;
  description: string;
  url?: string;
}

export interface LegalGuidance {
  queryId: string;
  steps: GuidanceStep[];
  applicableLaws: LegalReference[];
  culturalConsiderations: string[];
  nextActions: string[];
  confidence: number;
  createdAt: Date;
}

export interface Education {
  institution: string;
  degree: string;
  year: number;
  jurisdiction: string;
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

export interface PricingStructure {
  consultationFee: number;
  hourlyRate: number;
  currency: string;
  paymentMethods: string[];
}

export interface Availability {
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: string[];
  emergencyAvailable: boolean;
}

export interface Rating {
  userId: string;
  score: number;
  review: string;
  createdAt: Date;
}

export interface LawyerProfile {
  name: string;
  barNumber: string;
  jurisdiction: string[];
  experience: number;
  languages: string[];
  bio: string;
  education: Education[];
}

export interface Lawyer {
  id: string;
  profile: LawyerProfile;
  specializations: LegalCategory[];
  location: Location;
  availability: Availability;
  pricing: PricingStructure;
  ratings: Rating[];
  verificationStatus: 'verified' | 'pending' | 'unverified';
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchingCriteria {
  budget: BudgetRange;
  location: Location;
  caseType: LegalCategory;
  urgency: string;
  languagePreference: string;
  culturalPreference?: string;
}

export interface Party {
  userId: string;
  role: 'plaintiff' | 'defendant' | 'mediator';
  contactInfo: {
    email: string;
    phone?: string;
  };
}

export interface DisputeDetails {
  summary: string;
  category: LegalCategory;
  jurisdiction: string[];
  culturalFactors: string[];
  proposedResolution?: string;
}

export interface MediationEvent {
  id: string;
  timestamp: Date;
  type: 'message' | 'document' | 'proposal' | 'agreement';
  content: string;
  party: string;
  metadata?: any;
}

export interface AIMediator {
  model: string;
  configuration: {
    culturalSensitivity: boolean;
    jurisdictionAware: boolean;
    language: string;
  };
}

export interface Document {
  id: string;
  filename: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
}

export type MediationStatus = 
  | 'active'
  | 'pending'
  | 'resolved'
  | 'failed'
  | 'escalated';

export interface MediationCase {
  id: string;
  parties: Party[];
  dispute: DisputeDetails;
  status: MediationStatus;
  mediator: AIMediator;
  documents: Document[];
  timeline: MediationEvent[];
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

// Database connection types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}