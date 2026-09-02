import { NextRequest, NextResponse } from 'next/server';
import { registerProject } from '@/lib/server/blockchain/service';
import { CONTRACT_ADDRESS, CHAIN_ID } from '@/lib/server/blockchain/client';
import { addBlockchainRecord } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/onchain/register
 * Registers a carbon credit project on-chain.
 * Requires auth token + BLOCKCHAIN_PRIVATE_KEY env var.
 *
 * Body: { tokenId: number, metadataCID: string }
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tokenId, metadataCID } = body;

    if (tokenId === undefined || !metadataCID?.trim()) {
      return NextResponse.json(
        { success: false, error: 'tokenId and metadataCID are required' },
        { status: 400 },
      );
    }

    const result = await registerProject(BigInt(tokenId), metadataCID.trim());
    
    if (result.success && result.transactionHash) {
      await addBlockchainRecord({
        tokenId: BigInt(tokenId),
        transactionHash: result.transactionHash,
        chainId: CHAIN_ID,
        contractAddress: CONTRACT_ADDRESS,
        status: 'registered',
      });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    const msg = error?.shortMessage || error?.message || 'Unknown error';
    console.error('[/api/onchain/register]', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
