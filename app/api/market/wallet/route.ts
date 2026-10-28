import { NextRequest, NextResponse } from 'next/server';
import { getMarketWallet } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  const userId = token ? verifyToken(token) : null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getMarketWallet(userId));
}