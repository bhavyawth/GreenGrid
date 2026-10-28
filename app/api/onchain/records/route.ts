import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainRecords } from '@/lib/db';
import { getProjectData } from '@/lib/server/blockchain/service';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onchain/records - Retrieves all blockchain records merged with on-chain verified reduction data
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const records = await getBlockchainRecords();
    
    // For each record, fetch its verified reduction amount from the local smart contract
    const recordsWithReduction = await Promise.all(
      records.map(async (r) => {
        let carbonReduction = Number(r.carbonReduction || 0);
        try {
          if (r.tokenId) {
            const project = await getProjectData(BigInt(r.tokenId));
            // The contract stores carbon reduction in grams; the app displays kg.
            carbonReduction = Number(project.carbonReduction || 0) / 1000;
          }
        } catch (e: any) {
          console.warn(`[onchain/records] Failed to fetch on-chain data for token ${r.tokenId}:`, e.message);
        }
        return {
          ...r,
          carbonReduction
        };
      })
    );

    return NextResponse.json(recordsWithReduction);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get blockchain records' }, { status: 500 });
  }
}
