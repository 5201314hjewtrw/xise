/**
 * Prisma Client Singleton
 * 
 * This module provides a singleton instance of the Prisma Client
 * to be used throughout the application for database operations.
 */

const { PrismaClient } = require('@prisma/client');

// Create a singleton instance of PrismaClient
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// In development, store the client on the global object to prevent
// exhausting database connections during hot reloading
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;
