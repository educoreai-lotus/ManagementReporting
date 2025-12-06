/**
 * Unit tests for Signature utilities
 * 
 * Tests the buildMessage function (pure function).
 * Note: generateSignature and verifySignature require crypto keys, so they are tested separately.
 */

import { buildMessage } from '../../src/utils/signature.js';

describe('buildMessage', () => {
  test('should build message with service name only', () => {
    const result = buildMessage('test-service');
    
    expect(result).toBe('educoreai-test-service');
  });

  test('should build message with service name and payload', () => {
    const payload = { action: 'test', data: { id: 1 } };
    const result = buildMessage('test-service', payload);
    
    expect(result).toContain('educoreai-test-service-');
    expect(result.length).toBeGreaterThan('educoreai-test-service-'.length);
  });

  test('should generate consistent hash for same payload', () => {
    const payload = { action: 'test', id: 1 };
    const result1 = buildMessage('test-service', payload);
    const result2 = buildMessage('test-service', payload);
    
    expect(result1).toBe(result2);
  });

  test('should generate different hashes for different payloads', () => {
    const payload1 = { action: 'test', id: 1 };
    const payload2 = { action: 'test', id: 2 };
    
    const result1 = buildMessage('test-service', payload1);
    const result2 = buildMessage('test-service', payload2);
    
    expect(result1).not.toBe(result2);
  });

  test('should handle null payload', () => {
    const result = buildMessage('test-service', null);
    
    expect(result).toBe('educoreai-test-service');
  });

  test('should handle empty object payload', () => {
    const result = buildMessage('test-service', {});
    
    expect(result).toContain('educoreai-test-service-');
  });
});


