/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  // Root directory for tests
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Transform TypeScript files with ts-jest
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        moduleResolution: 'node',
      },
    }],
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Map @gtsd/shared-types to source files instead of dist
    '^@gtsd/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
  },

  // Allow Jest to transform files from @gtsd/shared-types package
  transformIgnorePatterns: [
    'node_modules/(?!(@gtsd/shared-types)/)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
    '!src/test/**',
    '!src/db/seed*.ts',
    '!src/db/migrations/**',
    '!src/scripts/**',
    '!src/workers/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Timeout for database operations
  testTimeout: 30000,

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Detect open handles (useful for database connections)
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,
};