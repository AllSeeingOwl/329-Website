module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  testPathIgnorePatterns: ['<rootDir>/wiki_boilerplate/', '<rootDir>/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/wiki_boilerplate/', '<rootDir>/dist/'],
};
