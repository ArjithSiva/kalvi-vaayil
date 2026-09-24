import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { config } from './env.js';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;

let gridFSBucket;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with bounded retries.
 *
 * A Render free instance and an Atlas cluster can both need a moment to accept
 * the first connection, so one failed attempt must not be fatal — the previous
 * process.exit(1) turned a slow handshake into a crash loop. The error is
 * rethrown once every attempt is exhausted so the caller decides how to fail.
 */
export async function connectDB() {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log('MongoDB connected');

      gridFSBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      console.log('GridFS bucket initialized');
      return mongoose.connection;
    } catch (err) {
      lastError = err;
      console.error(`MongoDB connection attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}`);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * attempt);
      }
    }
  }

  console.error('MongoDB connection failed after all attempts.');
  throw lastError;
}

export function getGridFSBucket() {
  if (!gridFSBucket) throw new Error('GridFS not initialized');
  return gridFSBucket;
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export default connectDB;
