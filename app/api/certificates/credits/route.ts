import { NextRequest, NextResponse } from 'next/server';
import { getUserCredits } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificates/credits
 * Returns the authenticated user's carbon credit balances from PostgreSQL.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = verifyToken(token);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const credits = await getUserCredits(userId);
    return NextResponse.json(credits);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get credits' }, { status: 500 });
  }
}
