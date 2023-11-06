const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  resetMocks: true,
  setupFilesAfterEnv: ['./src/setupTests.jsx'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(cypress|url-join)/)'],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|svg)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.svg\\?react$': '<rootDir>/__mocks__/svgrMock.js'
  },
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname']
};
