import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const hashData = async (data: string): Promise<string> => {
  const saltRounds = env.hashSaltRounds;
  return await bcrypt.hash(data, saltRounds);
};

export const compareHash = async (data: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(data, hash);
};