import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase, queryOneAsync, ObjectId } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
export const dynamic = 'force-dynamic';

function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: { userId: string; email: string; role: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user = await queryOneAsync('users', { _id: payload.userId });

    // Support users stored with Mongo ObjectId (e.g., seeded admin accounts).
    if (!user && ObjectId.isValid(payload.userId)) {
      user = await queryOneAsync('users', { _id: new ObjectId(payload.userId) });
    }

    // Fallback by email for mixed/legacy id formats.
    if (!user && payload.email) {
      user = await queryOneAsync('users', { email: payload.email });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error fetching authenticated user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
