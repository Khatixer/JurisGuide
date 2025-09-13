import { 
  AdvancedEncryption, 
  DataAnonymization, 
  E2EEncryption, 
  FieldEncryption,
  initializeEncryption 
} from '../../utils/encryption';

// Mock environment variables for testing
process.env.ENCRYPTION_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.ANONYMIZATION_SALT = 'test-salt-for-anonymization';

describe('AdvancedEncryption', () => {
  beforeAll(() => {
    initializeEncryption();
  });

  describe('Basic encryption/decryption', () => {
    test('should encrypt and decrypt data correctly', () => {
      const originalData = 'This is sensitive legal information';
      
      const encrypted = AdvancedEncryption.encrypt(originalData);
      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.encryptedData).not.toBe(originalData);
      
      const decrypted = AdvancedEncryption.decrypt(encrypted);
      expect(decrypted).toBe(originalData);
    });

    test('should handle empty strings', () => {
      const originalData = '';
      
      const encrypted = AdvancedEncryption.encrypt(originalData);
      const decrypted = AdvancedEncryption.decrypt(encrypted);
      
      expect(decrypted).toBe(originalData);
    });

    test('should produce different encrypted data for same input', () => {
      const originalData = 'Same input data';
      
      const encrypted1 = AdvancedEncryption.encrypt(originalData);
      const encrypted2 = AdvancedEncryption.encrypt(originalData);
      
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      expect(AdvancedEncryption.decrypt(encrypted1)).toBe(originalData);
      expect(AdvancedEncryption.decrypt(encrypted2)).toBe(originalData);
    });
  });

  describe('Password-based encryption', () => {
    test('should encrypt and decrypt with password', async () => {
      const originalData = 'Password protected legal document';
      const password = 'SecurePassword123!';
      
      const encrypted = await AdvancedEncryption.encryptWithPassword(originalData, password);
      expect(encrypted.salt).toBeDefined();
      
      const decrypted = await AdvancedEncryption.decryptWithPassword(encrypted, password);
      expect(decrypted).toBe(originalData);
    });

    test('should fail with wrong password', async () => {
      const originalData = 'Secret data';
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';
      
      const encrypted = await AdvancedEncryption.encryptWithPassword(originalData, correctPassword);
      
      await expect(
        AdvancedEncryption.decryptWithPassword(encrypted, wrongPassword)
      ).rejects.toThrow();
    });
  });

  describe('Key generation', () => {
    test('should generate random keys', () => {
      const key1 = AdvancedEncryption.generateKey();
      const key2 = AdvancedEncryption.generateKey();
      
      expect(key1).toHaveLength(32); // 256 bits
      expect(key2).toHaveLength(32);
      expect(key1).not.toEqual(key2);
    });

    test('should derive consistent keys from same password and salt', async () => {
      const password = 'TestPassword123!';
      const salt = Buffer.from('test-salt-16-bytes', 'utf8');
      
      const key1 = await AdvancedEncryption.deriveKey(password, salt);
      const key2 = await AdvancedEncryption.deriveKey(password, salt);
      
      expect(key1).toEqual(key2);
      expect(key1).toHaveLength(32);
    });
  });
});

describe('DataAnonymization', () => {
  describe('Anonymous ID generation', () => {
    test('should generate consistent anonymous IDs', () => {
      const originalId = 'user-123-456';
      
      const anonymousId1 = DataAnonymization.generateAnonymousId(originalId);
      const anonymousId2 = DataAnonymization.generateAnonymousId(originalId);
      
      expect(anonymousId1).toBe(anonymousId2);
      expect(anonymousId1).toHaveLength(16);
      expect(anonymousId1).not.toBe(originalId);
    });

    test('should generate different IDs for different inputs', () => {
      const id1 = DataAnonymization.generateAnonymousId('user-1');
      const id2 = DataAnonymization.generateAnonymousId('user-2');
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('Personal data anonymization', () => {
    test('should anonymize personal data fields', () => {
      const personalData = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        age: 30, // Non-sensitive field
        preferences: { theme: 'dark' } // Non-sensitive field
      };
      
      const anonymized = DataAnonymization.anonymizePersonalData(personalData);
      
      expect(anonymized.hashedId).toBeDefined();
      expect(anonymized.hashedId).not.toBe(personalData.id);
      
      expect(anonymized.anonymizedFields.firstName).toBeDefined();
      expect(anonymized.anonymizedFields.firstName).not.toBe(personalData.firstName);
      
      expect(anonymized.anonymizedFields.email).toContain('@example.com');
      expect(anonymized.anonymizedFields.email).not.toBe(personalData.email);
      
      expect(anonymized.anonymizedFields.phone).toContain('+12');
      expect(anonymized.anonymizedFields.phone).toContain('90');
      expect(anonymized.anonymizedFields.phone).toContain('****');
      
      expect(anonymized.metadata.anonymizedAt).toBeInstanceOf(Date);
      expect(anonymized.metadata.algorithm).toBe('sha256');
    });

    test('should handle missing fields gracefully', () => {
      const incompleteData = {
        id: 'user-456',
        firstName: 'Jane'
        // Missing other fields
      };
      
      const anonymized = DataAnonymization.anonymizePersonalData(incompleteData);
      
      expect(anonymized.hashedId).toBeDefined();
      expect(anonymized.anonymizedFields.firstName).toBeDefined();
      expect(Object.keys(anonymized.anonymizedFields)).toHaveLength(1);
    });
  });

  describe('Legal case anonymization', () => {
    test('should anonymize legal case while preserving analytical data', () => {
      const legalCase = {
        id: 'case-123',
        userId: 'user-456',
        lawyerId: 'lawyer-789',
        description: 'John Smith filed a complaint against Jane Doe regarding contract dispute. Contact: john@email.com or 555-123-4567. SSN: 123-45-6789.',
        category: 'contract_dispute',
        jurisdiction: ['US', 'CA'],
        urgency: 'high',
        language: 'en',
        culturalContext: 'western',
        createdAt: new Date(),
        status: 'active'
      };
      
      const anonymized = DataAnonymization.anonymizeLegalCase(legalCase);
      
      // Should preserve analytical fields
      expect(anonymized.category).toBe(legalCase.category);
      expect(anonymized.jurisdiction).toEqual(legalCase.jurisdiction);
      expect(anonymized.urgency).toBe(legalCase.urgency);
      expect(anonymized.language).toBe(legalCase.language);
      expect(anonymized.culturalContext).toBe(legalCase.culturalContext);
      expect(anonymized.status).toBe(legalCase.status);
      
      // Should anonymize identifiers
      expect(anonymized.anonymizedId).toBeDefined();
      expect(anonymized.anonymizedId).not.toBe(legalCase.id);
      
      // Should anonymize description
      expect(anonymized.description).toContain('[PERSON_NAME]');
      expect(anonymized.description).toContain('[EMAIL]');
      expect(anonymized.description).toContain('[PHONE]');
      expect(anonymized.description).toContain('[SSN]');
      expect(anonymized.description).not.toContain('John Smith');
      expect(anonymized.description).not.toContain('jane@email.com');
      
      expect(anonymized.anonymizedAt).toBeInstanceOf(Date);
    });
  });
});

describe('E2EEncryption', () => {
  describe('Key pair generation', () => {
    test('should generate valid RSA key pairs', () => {
      const keyPair = E2EEncryption.generateKeyPair();
      
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.publicKey).toContain('-----END PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(keyPair.privateKey).toContain('-----END PRIVATE KEY-----');
    });

    test('should generate different key pairs each time', () => {
      const keyPair1 = E2EEncryption.generateKeyPair();
      const keyPair2 = E2EEncryption.generateKeyPair();
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });
  });

  describe('Message encryption/decryption', () => {
    test('should encrypt and decrypt messages correctly', () => {
      const message = 'This is a confidential legal communication';
      const keyPair = E2EEncryption.generateKeyPair();
      
      const encrypted = E2EEncryption.encryptMessage(message, keyPair.publicKey);
      expect(encrypted).not.toBe(message);
      expect(encrypted).toBeDefined();
      
      const decrypted = E2EEncryption.decryptMessage(encrypted, keyPair.privateKey);
      expect(decrypted).toBe(message);
    });

    test('should handle different message sizes', () => {
      const keyPair = E2EEncryption.generateKeyPair();
      
      const shortMessage = 'Hi';
      const longMessage = 'This is a much longer legal document that contains detailed information about the case, including multiple paragraphs of text that need to be encrypted securely.';
      
      const encryptedShort = E2EEncryption.encryptMessage(shortMessage, keyPair.publicKey);
      const encryptedLong = E2EEncryption.encryptMessage(longMessage, keyPair.publicKey);
      
      expect(E2EEncryption.decryptMessage(encryptedShort, keyPair.privateKey)).toBe(shortMessage);
      expect(E2EEncryption.decryptMessage(encryptedLong, keyPair.privateKey)).toBe(longMessage);
    });
  });

  describe('Digital signatures', () => {
    test('should sign and verify messages correctly', () => {
      const message = 'Legal document requiring authentication';
      const keyPair = E2EEncryption.generateKeyPair();
      
      const signature = E2EEncryption.signMessage(message, keyPair.privateKey);
      expect(signature).toBeDefined();
      expect(signature).not.toBe(message);
      
      const isValid = E2EEncryption.verifySignature(message, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    test('should detect tampered messages', () => {
      const originalMessage = 'Original legal document';
      const tamperedMessage = 'Tampered legal document';
      const keyPair = E2EEncryption.generateKeyPair();
      
      const signature = E2EEncryption.signMessage(originalMessage, keyPair.privateKey);
      
      const isValidOriginal = E2EEncryption.verifySignature(originalMessage, signature, keyPair.publicKey);
      const isValidTampered = E2EEncryption.verifySignature(tamperedMessage, signature, keyPair.publicKey);
      
      expect(isValidOriginal).toBe(true);
      expect(isValidTampered).toBe(false);
    });

    test('should reject signatures from wrong key', () => {
      const message = 'Legal document';
      const keyPair1 = E2EEncryption.generateKeyPair();
      const keyPair2 = E2EEncryption.generateKeyPair();
      
      const signature = E2EEncryption.signMessage(message, keyPair1.privateKey);
      
      const isValidCorrectKey = E2EEncryption.verifySignature(message, signature, keyPair1.publicKey);
      const isValidWrongKey = E2EEncryption.verifySignature(message, signature, keyPair2.publicKey);
      
      expect(isValidCorrectKey).toBe(true);
      expect(isValidWrongKey).toBe(false);
    });
  });
});

describe('FieldEncryption', () => {
  beforeAll(() => {
    initializeEncryption();
  });

  describe('Field-level encryption', () => {
    test('should encrypt specified fields only', () => {
      const data = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        publicInfo: 'This is public'
      };
      
      const fieldsToEncrypt = ['email', 'phone'];
      const encrypted = FieldEncryption.encryptFields(data, fieldsToEncrypt);
      
      // Original fields should be removed
      expect(encrypted.email).toBeUndefined();
      expect(encrypted.phone).toBeUndefined();
      
      // Encrypted fields should be present
      expect(encrypted.email_encrypted).toBeDefined();
      expect(encrypted.phone_encrypted).toBeDefined();
      
      // Non-encrypted fields should remain unchanged
      expect(encrypted.id).toBe(data.id);
      expect(encrypted.name).toBe(data.name);
      expect(encrypted.publicInfo).toBe(data.publicInfo);
    });

    test('should decrypt fields correctly', () => {
      const originalData = {
        id: 'user-123',
        email: 'john@example.com',
        phone: '+1234567890',
        publicInfo: 'This is public'
      };
      
      const fieldsToEncrypt = ['email', 'phone'];
      const encrypted = FieldEncryption.encryptFields(originalData, fieldsToEncrypt);
      const decrypted = FieldEncryption.decryptFields(encrypted, fieldsToEncrypt);
      
      expect(decrypted.email).toBe(originalData.email);
      expect(decrypted.phone).toBe(originalData.phone);
      expect(decrypted.id).toBe(originalData.id);
      expect(decrypted.publicInfo).toBe(originalData.publicInfo);
      
      // Encrypted fields should be removed after decryption
      expect(decrypted.email_encrypted).toBeUndefined();
      expect(decrypted.phone_encrypted).toBeUndefined();
    });

    test('should handle missing fields gracefully', () => {
      const data = {
        id: 'user-123',
        name: 'John Doe'
        // Missing email and phone
      };
      
      const fieldsToEncrypt = ['email', 'phone', 'address'];
      const encrypted = FieldEncryption.encryptFields(data, fieldsToEncrypt);
      
      expect(encrypted.id).toBe(data.id);
      expect(encrypted.name).toBe(data.name);
      expect(encrypted.email_encrypted).toBeUndefined();
      expect(encrypted.phone_encrypted).toBeUndefined();
    });

    test('should handle non-string fields', () => {
      const data = {
        id: 'user-123',
        age: 30, // Number field
        isActive: true, // Boolean field
        metadata: { key: 'value' }, // Object field
        tags: ['tag1', 'tag2'] // Array field
      };
      
      const fieldsToEncrypt = ['age', 'isActive', 'metadata', 'tags'];
      const encrypted = FieldEncryption.encryptFields(data, fieldsToEncrypt);
      
      // Non-string fields should not be encrypted
      expect(encrypted.age).toBe(data.age);
      expect(encrypted.isActive).toBe(data.isActive);
      expect(encrypted.metadata).toEqual(data.metadata);
      expect(encrypted.tags).toEqual(data.tags);
    });
  });
});

describe('Encryption initialization', () => {
  test('should initialize successfully with valid key', () => {
    expect(() => initializeEncryption()).not.toThrow();
  });

  test('should throw error without master key', () => {
    const originalKey = process.env.ENCRYPTION_MASTER_KEY;
    delete process.env.ENCRYPTION_MASTER_KEY;
    
    expect(() => {
      // Reset the static property to force re-initialization
      (AdvancedEncryption as any).masterKey = null;
      AdvancedEncryption.initialize();
    }).toThrow('ENCRYPTION_MASTER_KEY environment variable is required');
    
    // Restore original key
    process.env.ENCRYPTION_MASTER_KEY = originalKey;
  });

  test('should throw error with invalid key length', () => {
    const originalKey = process.env.ENCRYPTION_MASTER_KEY;
    process.env.ENCRYPTION_MASTER_KEY = 'short-key';
    
    expect(() => {
      (AdvancedEncryption as any).masterKey = null;
      AdvancedEncryption.initialize();
    }).toThrow('ENCRYPTION_MASTER_KEY must be 64 hex characters');
    
    // Restore original key
    process.env.ENCRYPTION_MASTER_KEY = originalKey;
  });
});