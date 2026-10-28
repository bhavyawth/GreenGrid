import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { findUserByEmail, createUser } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name required' }, { status: 400 });
    }

    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString(),
      totalEnergyUsed: 0,
    };

    const token = generateToken(user.id);

    await createUser(user);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error instanceof Error && error.message.startsWith('JWT_SECRET')) {
      return NextResponse.json(
        { error: 'Authentication is unavailable because the server secret is not configured.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
