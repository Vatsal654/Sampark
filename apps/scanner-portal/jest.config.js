/**
 * Purpose: Unit tests for the scanner portal's non-UI logic — currently
 * lib/api-client.ts's pure API-base-URL resolution and middleware.ts's
 * pure CSP-header construction. UI/route behavior is covered by
 * Playwright (e2e/) instead — this config deliberately does not pull in
 * jsdom/React Testing Library.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib', '<rootDir>'],
  testMatch: ['**/lib/*.spec.ts', '<rootDir>/middleware.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
};
