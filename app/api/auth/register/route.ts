import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { connectToDatabase, queryOneAsync, runAsync } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await queryOneAsync('users', { email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await runAsync('users', {
      _id: userId,
      email,
      passwordHash,
      name,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create default business for new user
    const businessId = uuidv4();
    await runAsync('businesses', {
      _id: businessId,
      userId,
      name: `${name}'s Business`,
      description: 'My business',
      createdAt: new Date()
    });

    // Create free subscription
    const subscriptionId = uuidv4();
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const freePlan = await queryOneAsync('subscriptionPlans', { name: 'free', isActive: true });

    await runAsync('subscriptions', {
      _id: subscriptionId,
      userId,
      planId: freePlan?._id || 'free',
      status: 'active',
      billingCycle: 'monthly',
      startDate: now,
      endDate
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const response = NextResponse.json({
      token,
      user: {
        id: userId,
        email,
        name,
        role: 'user',
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SEVEN_DAYS_IN_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
