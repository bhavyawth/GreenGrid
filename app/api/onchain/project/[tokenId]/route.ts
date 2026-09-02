import { NextRequest, NextResponse } from 'next/server';
import { getProjectData, getVerificationThreshold, getTotalRetirements } from '@/lib/server/blockchain/service';

/**
 * GET /api/onchain/project/[tokenId]
 * Reads project data from the CarbonCredit smart contract.
 * No authentication required — public read.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { tokenId: string } },
) {
  const tokenId = BigInt(params.tokenId || '1');

  try {
    const [project, threshold, totalRetirements] = await Promise.all([
      getProjectData(tokenId),
      getVerificationThreshold(),
      getTotalRetirements(),
    ]);

    return NextResponse.json({ ...project, verificationThreshold: threshold, totalRetirements });
  } catch (error: any) {
    console.error('[/api/onchain/project]', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to read project data from contract' },
      { status: 500 },
    );
  }
}
