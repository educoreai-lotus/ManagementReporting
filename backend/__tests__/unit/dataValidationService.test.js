/**
 * Unit tests for DataValidationService
 * 
 * Tests validation methods.
 */

import { DataValidationService } from '../../src/domain/services/DataValidationService.js';

describe('DataValidationService', () => {
  let service;

  beforeEach(() => {
    service = new DataValidationService();
  });

  describe('validateRequiredFields', () => {
    test('should pass when all required fields are present', () => {
      const data = { id: 1, name: 'Test', email: 'test@example.com' };
      const requiredFields = ['id', 'name'];
      
      expect(() => {
        service.validateRequiredFields(data, requiredFields);
      }).not.toThrow();
    });

    test('should throw error when required fields are missing', () => {
      const data = { id: 1 };
      const requiredFields = ['id', 'name', 'email'];
      
      expect(() => {
        service.validateRequiredFields(data, requiredFields);
      }).toThrow('Missing required fields: name, email');
    });
  });

  describe('validateDataTypes', () => {
    test('should pass when data types match schema', () => {
      const data = { id: 1, name: 'Test', active: true };
      const schema = { id: 'number', name: 'string', active: 'boolean' };
      
      expect(() => {
        service.validateDataTypes(data, schema);
      }).not.toThrow();
    });

    test('should throw error when data type does not match', () => {
      const data = { id: '1', name: 'Test' };
      const schema = { id: 'number', name: 'string' };
      
      expect(() => {
        service.validateDataTypes(data, schema);
      }).toThrow('Invalid type for id: expected number, got string');
    });

    test('should skip validation for undefined fields', () => {
      const data = { id: 1 };
      const schema = { id: 'number', name: 'string' };
      
      expect(() => {
        service.validateDataTypes(data, schema);
      }).not.toThrow();
    });
  });

  describe('validate', () => {
    test('should validate required fields and types', () => {
      const data = { id: 1, name: 'Test' };
      const schema = {
        required: ['id', 'name'],
        types: { id: 'number', name: 'string' }
      };
      
      expect(() => {
        service.validate(data, schema);
      }).not.toThrow();
    });

    test('should throw error if validation fails', () => {
      const data = { id: '1' };
      const schema = {
        required: ['id', 'name'],
        types: { id: 'number' }
      };
      
      expect(() => {
        service.validate(data, schema);
      }).toThrow();
    });
  });
});


