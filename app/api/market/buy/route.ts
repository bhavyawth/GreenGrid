import { NextRequest, NextResponse } from 'next/server';
import { executeMarketTrade } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/market/buy - Executes a carbon credit purchase
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const buyerId = verifyToken(token);
    if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { listingId } = await request.json();

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }

    const trade = await executeMarketTrade(listingId, buyerId);
    return NextResponse.json({ success: true, trade });
  } catch (error: any) {
    console.error('Market Buy Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to complete transaction' }, { status: 500 });
  }
}
