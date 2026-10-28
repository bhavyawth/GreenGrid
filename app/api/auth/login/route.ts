import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isDemoLogin = !process.env.DB_URI &&
      ((email === 'user1@example.com' && password === 'demo123') ||
       (email === 'admin@example.com' && password === 'admin123'));
    const isValidPassword = isDemoLogin || await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user.id);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        totalEnergyUsed: user.totalEnergyUsed || 0,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error && error.message.startsWith('JWT_SECRET')) {
      return NextResponse.json(
        { error: 'Authentication is unavailable because the server secret is not configured.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
