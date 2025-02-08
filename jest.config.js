module.exports = {
    testEnvironment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 10000,
    moduleFileExtensions: ['js', 'json'],
    testMatch: ['**/tests/**/*.test.js'],
    clearMocks: true
};