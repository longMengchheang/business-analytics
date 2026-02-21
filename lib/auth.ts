import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { queryOneAsync, runAsync, update } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function generateSessionToken(): string {
  return uuidv4() + '-' + uuidv4();
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
  const id = uuidv4();
  const passwordHash = await hashPassword(password);
  
  await runAsync('users', {
    _id: id,
    email,
    passwordHash,
    name,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const user = await getUserById(id);
  return user!;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return null;
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }
  
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await queryOneAsync('users', { _id: id });
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await queryOneAsync('users', { email });
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function updateUser(id: string, updates: Partial<{ name: string; email: string }>): Promise<void> {
  const updateData: Record<string, unknown> = {};
  
  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.email !== undefined) {
    updateData.email = updates.email;
  }
  
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await update('users', { _id: id }, updateData);
  }
}
