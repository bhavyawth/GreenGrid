import { NextResponse } from 'next/server';
import { getBlockchainStatus } from '@/lib/server/blockchain/service';

/**
 * GET /api/onchain/status
 * Returns live blockchain connection and contract configuration.
 * Safe to call without a private key — read-only.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getBlockchainStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[/api/onchain/status]', error.message);
    return NextResponse.json(
      { connected: false, error: 'Failed to check blockchain status' },
      { status: 500 },
    );
  }
}
