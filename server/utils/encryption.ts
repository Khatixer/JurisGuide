import * as crypto from 'crypto';
import { createHash, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits

// Interface for encrypted data
export interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
  salt?: string;
}

// Interface for anonymized data
export interface AnonymizedData {
  hashedId: string;
  anonymizedFields: Record<string, string>;
  metadata: {
    anonymizedAt: Date;
    algorithm: string;
  };
}

/**
 * Advanced AES-256-GCM encryption utility class
 */
export class AdvancedEncryption {
  private static masterKey: Buffer | null = null;

  /**
   * Initialize the encryption system with master key
   */
  static initialize(): void {
    const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKeyHex) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }
    
    if (masterKeyHex.length !== 64) { // 32 bytes = 64 hex characters
      throw new Error('ENCRYPTION_MASTER_KEY must be 64 hex characters (32 bytes)');
    }
    
    this.masterKey = Buffer.from(masterKeyHex, 'hex');
  }

  /**
   * Generate a random encryption key
   */
  static generateKey(): Buffer {
    return randomBytes(KEY_LENGTH);
  }

  /**
   * Derive key from password using scrypt
   */
  static async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  static encrypt(data: string, key?: Buffer): EncryptedData {
    if (!this.masterKey && !key) {
      throw new Error('Encryption system not initialized or key not provided');
    }

    const encryptionKey = key || this.masterKey!;
    const iv = randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, encryptionKey);
    cipher.setAAD(Buffer.from('jurisguide-platform'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decrypt(encryptedData: EncryptedData, key?: Buffer): string {
    if (!this.masterKey && !key) {
      throw new Error('Encryption system not initialized or key not provided');
    }

    const encryptionKey = key || this.masterKey!;
    const decipher = crypto.createDecipher(ALGORITHM, encryptionKey);
    
    decipher.setAAD(Buffer.from('jurisguide-platform'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt data with password-derived key
   */
  static async encryptWithPassword(data: string, password: string): Promise<EncryptedData> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await this.deriveKey(password, salt);
    
    const result = this.encrypt(data, key);
    result.salt = salt.toString('hex');
    
    return result;
  }

  /**
   * Decrypt data with password-derived key
   */
  static async decryptWithPassword(encryptedData: EncryptedData, password: string): Promise<string> {
    if (!encryptedData.salt) {
      throw new Error('Salt is required for password-based decryption');
    }
    
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const key = await this.deriveKey(password, salt);
    
    return this.decrypt(encryptedData, key);
  }
}

/**
 * Data anonymization utility class
 */
export class DataAnonymization {
  /**
   * Generate a consistent hash for anonymization
   */
  static generateAnonymousId(originalId: string, salt?: string): string {
    const hashSalt = salt || process.env.ANONYMIZATION_SALT || 'default-salt';
    return createHash('sha256')
      .update(originalId + hashSalt)
      .digest('hex')
      .substring(0, 16); // Use first 16 characters for readability
  }

  /**
   * Anonymize personal data fields
   */
  static anonymizePersonalData(data: Record<string, any>): AnonymizedData {
    const sensitiveFields = [
      'firstName', 'lastName', 'email', 'phone', 'address', 
      'ssn', 'taxId', 'bankAccount', 'creditCard'
    ];

    const anonymizedFields: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.includes(key) && value) {
        if (key === 'email') {
          // Preserve domain for analytics while anonymizing user part
          const [user, domain] = value.split('@');
          anonymizedFields[key] = `${this.generateAnonymousId(user).substring(0, 8)}@${domain}`;
        } else if (key === 'phone') {
          // Preserve country code and anonymize rest
          const phoneStr = value.toString();
          const countryCode = phoneStr.substring(0, 3);
          anonymizedFields[key] = `${countryCode}****${phoneStr.slice(-2)}`;
        } else {
          // Full anonymization for other fields
          anonymizedFields[key] = this.generateAnonymousId(value.toString());
        }
      }
    }

    return {
      hashedId: this.generateAnonymousId(data.id || data.userId || 'unknown'),
      anonymizedFields,
      metadata: {
        anonymizedAt: new Date(),
        algorithm: 'sha256'
      }
    };
  }

  /**
   * Anonymize legal case data while preserving analytical value
   */
  static anonymizeLegalCase(caseData: Record<string, any>): Record<string, any> {
    const anonymized = { ...caseData };
    
    // Anonymize personal identifiers
    if (anonymized.userId) {
      anonymized.userId = this.generateAnonymousId(anonymized.userId);
    }
    
    if (anonymized.lawyerId) {
      anonymized.lawyerId = this.generateAnonymousId(anonymized.lawyerId);
    }

    // Anonymize case description while preserving legal categories
    if (anonymized.description) {
      // Replace names with placeholders
      anonymized.description = anonymized.description
        .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[PERSON_NAME]')
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
        .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    }

    // Preserve non-sensitive metadata for analytics
    const preservedFields = [
      'category', 'jurisdiction', 'urgency', 'language', 'culturalContext',
      'createdAt', 'status', 'caseType'
    ];
    
    return {
      ...Object.fromEntries(
        Object.entries(anonymized).filter(([key]) => preservedFields.includes(key))
      ),
      anonymizedId: this.generateAnonymousId(caseData.id || 'unknown'),
      anonymizedAt: new Date()
    };
  }
}

/**
 * End-to-end encryption for user communications
 */
export class E2EEncryption {
  /**
   * Generate key pair for end-to-end encryption
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  /**
   * Encrypt message for end-to-end communication
   */
  static encryptMessage(message: string, recipientPublicKey: string): string {
    const buffer = Buffer.from(message, 'utf8');
    const encrypted = crypto.publicEncrypt(recipientPublicKey, buffer);
    return encrypted.toString('base64');
  }

  /**
   * Decrypt message from end-to-end communication
   */
  static decryptMessage(encryptedMessage: string, privateKey: string): string {
    const buffer = Buffer.from(encryptedMessage, 'base64');
    const decrypted = crypto.privateDecrypt(privateKey, buffer);
    return decrypted.toString('utf8');
  }

  /**
   * Sign message for authenticity verification
   */
  static signMessage(message: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(message);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verify message signature
   */
  static verifySignature(message: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(message);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  }
}

/**
 * Secure field encryption for database storage
 */
export class FieldEncryption {
  /**
   * Encrypt specific fields in an object
   */
  static encryptFields(data: Record<string, any>, fieldsToEncrypt: string[]): Record<string, any> {
    const result = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (result[field] && typeof result[field] === 'string') {
        const encrypted = AdvancedEncryption.encrypt(result[field]);
        result[`${field}_encrypted`] = JSON.stringify(encrypted);
        delete result[field]; // Remove plain text
      }
    }
    
    return result;
  }

  /**
   * Decrypt specific fields in an object
   */
  static decryptFields(data: Record<string, any>, fieldsToDecrypt: string[]): Record<string, any> {
    const result = { ...data };
    
    for (const field of fieldsToDecrypt) {
      const encryptedField = `${field}_encrypted`;
      if (result[encryptedField]) {
        try {
          const encryptedData = JSON.parse(result[encryptedField]);
          result[field] = AdvancedEncryption.decrypt(encryptedData);
          delete result[encryptedField]; // Remove encrypted version
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
        }
      }
    }
    
    return result;
  }
}

/**
 * Initialize encryption system
 */
export function initializeEncryption(): void {
  try {
    AdvancedEncryption.initialize();
    console.log('Encryption system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize encryption system:', error);
    throw error;
  }
}

// Utility functions are already exported above