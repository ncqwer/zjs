module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testMatch: ['<rootDir>/packages/**/__tests__/**/*.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/support/jest/setup.ts'],
}
