import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const hashData = async (password: string): Promise<string> => {
  const saltRounds = env.hashSaltRounds;
  return await bcrypt.hash(password, saltRounds);
};

export const compareHash = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};