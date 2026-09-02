import { NextRequest, NextResponse } from 'next/server';
import { getMarketTrades } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/history - Retrieves recent trades
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trades = await getMarketTrades();
    return NextResponse.json(trades);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get trade history' }, { status: 500 });
  }
}
