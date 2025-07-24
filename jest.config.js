module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude main server file
    '!src/config/**', // Exclude config files
    '!src/seeds/**', // Exclude seed files
    '!src/migrations/**' // Exclude migration files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Module paths
  moduleFileExtensions: ['js', 'json'],
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Error handling
  errorOnDeprecated: true,

  // Module name mapping for mocks
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}; 