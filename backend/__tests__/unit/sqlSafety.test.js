/**
 * Unit tests for SQL Safety validation utilities
 * 
 * Tests the validateSqlSafety and addLimitIfMissing functions.
 */

import { validateSqlSafety, addLimitIfMissing } from '../../src/utils/sqlSafety.js';

describe('validateSqlSafety', () => {
  test('should accept a valid SELECT query', () => {
    const sql = 'SELECT * FROM users';
    const result = validateSqlSafety(sql);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBe(null);
  });

  test('should reject queries that do not start with SELECT', () => {
    const sql = 'INSERT INTO users VALUES (1, "test")';
    const result = validateSqlSafety(sql);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only SELECT queries are allowed');
  });

  test('should reject empty or null SQL', () => {
    expect(validateSqlSafety('')).toEqual({ valid: false, error: 'SQL query must be a non-empty string' });
    expect(validateSqlSafety(null)).toEqual({ valid: false, error: 'SQL query must be a non-empty string' });
    expect(validateSqlSafety(undefined)).toEqual({ valid: false, error: 'SQL query must be a non-empty string' });
  });

  test('should reject queries with dangerous keywords', () => {
    const dangerousQueries = [
      'SELECT * FROM users; DROP TABLE users;',
      'SELECT * FROM users WHERE id IN (SELECT id FROM users WHERE DELETE FROM users)',
    ];
    
    dangerousQueries.forEach(sql => {
      const result = validateSqlSafety(sql);
      expect(result.valid).toBe(false);
    });
  });

  test('should reject multiple statements', () => {
    const sql = 'SELECT * FROM users; SELECT * FROM courses;';
    const result = validateSqlSafety(sql);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Multiple statements');
  });

  test('should accept SELECT with WHERE clause', () => {
    const sql = 'SELECT * FROM users WHERE active = true';
    const result = validateSqlSafety(sql);
    
    expect(result.valid).toBe(true);
  });

  test('should accept SELECT with JOIN', () => {
    const sql = 'SELECT u.id, c.name FROM users u JOIN courses c ON u.id = c.user_id';
    const result = validateSqlSafety(sql);
    
    expect(result.valid).toBe(true);
  });
});

describe('addLimitIfMissing', () => {
  test('should add LIMIT clause when missing', () => {
    const sql = 'SELECT * FROM users';
    const result = addLimitIfMissing(sql, 100);
    
    expect(result).toBe('SELECT * FROM users LIMIT 100');
  });

  test('should not add LIMIT if already present', () => {
    const sql = 'SELECT * FROM users LIMIT 50';
    const result = addLimitIfMissing(sql, 100);
    
    expect(result).toBe('SELECT * FROM users LIMIT 50');
  });

  test('should handle queries with semicolon', () => {
    const sql = 'SELECT * FROM users;';
    const result = addLimitIfMissing(sql, 100);
    
    expect(result).toBe('SELECT * FROM users LIMIT 100');
  });

  test('should use default maxRows of 5000', () => {
    const sql = 'SELECT * FROM users';
    const result = addLimitIfMissing(sql);
    
    expect(result).toBe('SELECT * FROM users LIMIT 5000');
  });

  test('should handle null or undefined input', () => {
    expect(addLimitIfMissing(null)).toBe(null);
    expect(addLimitIfMissing(undefined)).toBe(undefined);
  });
});
