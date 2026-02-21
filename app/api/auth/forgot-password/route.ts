import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { connectToDatabase, queryOneAsync, runAsync } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await queryOneAsync('users', { email });
    if (user) {
      const resetToken = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await runAsync('passwordResetRequests', {
        _id: randomUUID(),
        userId: user._id,
        email,
        token: resetToken,
        status: 'pending',
        createdAt: new Date(),
        expiresAt
      });

      // Email provider is intentionally omitted. This mock flow writes reset intents to DB.
      console.log(
        `[auth] password reset requested for ${email}. token=${resetToken} expires=${expiresAt.toISOString()}`
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If your account exists, a reset instruction has been generated.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
