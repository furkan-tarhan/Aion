/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 30000,
  // mongodb-memory-server indirilen binary'yi tek bir process'te paylaşır; testler paralel
  // worker'larda ayrı ayrı bağlantı/koleksiyon state'i kirletmesin diye seri çalıştırılır.
  maxWorkers: 1,
};
