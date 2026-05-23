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
  transformIgnorePatterns: ['node_modules/(?!@vercel/analytics)'],
  testPathIgnorePatterns: ['<rootDir>/wiki_boilerplate/'],
  modulePathIgnorePatterns: ['<rootDir>/wiki_boilerplate/'],
};
