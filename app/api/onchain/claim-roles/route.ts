import { NextRequest, NextResponse } from 'next/server';
import { claimTestingRoles } from '@/lib/server/blockchain/service';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/onchain/claim-roles
 * Calls claimTestingRoles() on the contract so the server wallet gets
 * ISSUER_ROLE + ORACLE_ROLE for Polygon Amoy testnet use.
 * Only needed once per deployment. Requires wallet key.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await claimTestingRoles();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error('[/api/onchain/claim-roles]', error.message);
    return NextResponse.json({ success: false, error: 'Failed to claim roles' }, { status: 500 });
  }
}
