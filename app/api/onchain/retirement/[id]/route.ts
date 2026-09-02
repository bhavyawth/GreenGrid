import { NextRequest, NextResponse } from 'next/server';
import { getRetirementRecord } from '@/lib/server/blockchain/service';

/**
 * GET /api/onchain/retirement/[id]
 * Reads a retirement record from the CarbonCredit contract.
 * Public read — no auth required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = BigInt(params.id || '1');
    const record = await getRetirementRecord(id);
    return NextResponse.json(record);
  } catch (error: any) {
    console.error('[/api/onchain/retirement]', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to read retirement record' },
      { status: 500 },
    );
  }
}
