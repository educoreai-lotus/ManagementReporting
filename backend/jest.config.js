/**
 * Jest Configuration for Management Reporting Backend
 * 
 * This configuration supports ES modules and Node.js environment.
 * Note: Jest ES module support requires experimental features.
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Support ES modules (when using type: "module" in package.json)
  // Note: Jest ES module support requires --experimental-vm-modules flag
  // or we can use a different approach
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Transform configuration for ES modules
  transform: {},
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/server.js', // Exclude entry point
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Module paths
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  
  // Setup files (if needed in the future)
  // setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Experimental ES module support
  // Note: If you encounter issues, you may need to use --experimental-vm-modules flag
  // or configure package.json with "type": "module" (already set)
};

