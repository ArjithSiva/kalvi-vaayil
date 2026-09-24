import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGODB_URI', 'JWT_SECRET', 'GROQ_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`WARNING: Missing env var ${key}`);
  }
}

export const config = {
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kalvi-vaayil',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  groqApiKey: process.env.GROQ_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'qwen/qwen3.8-27b',
  aiFallbackModel: process.env.AI_FALLBACK_MODEL || 'openai/gpt-oss-120b',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',
  port: parseInt(process.env.PORT || '5000', 10),
};
