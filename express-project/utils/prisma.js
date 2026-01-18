/**
 * Prisma Client Singleton
 * 
 * This module provides a singleton instance of the Prisma Client
 * to be used throughout the application for database operations.
 * 
 * Prisma 7.x requires driver adapters for database connections.
 * Using the legacy prisma-client-js provider for CommonJS compatibility.
 * 
 * Supports both PostgreSQL and MySQL databases based on DATABASE_URL.
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Add BigInt serialization support for JSON.stringify
// This is needed because Prisma returns BigInt for BIGINT columns
// and JavaScript's JSON.stringify doesn't know how to serialize BigInt
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() {
    // Convert to number if it's safe, otherwise to string
    const num = Number(this);
    if (Number.isSafeInteger(num)) {
      return num;
    }
    return this.toString();
  };
}

// Create the PostgreSQL adapter with connection string
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Create a singleton instance of PrismaClient with the adapter
const prisma = global.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// In development, store the client on the global object to prevent
// exhausting database connections during hot reloading
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;
