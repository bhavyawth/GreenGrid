import { NextRequest, NextResponse } from 'next/server';
import { submitVerification, recordIoTAttestation } from '@/lib/server/blockchain/service';
import { CONTRACT_ADDRESS, CHAIN_ID } from '@/lib/server/blockchain/client';
import { addBlockchainRecord } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Hash } from 'viem';

/**
 * POST /api/onchain/verify
 * Submits an oracle attestation to the smart contract.
 *
 * Body (explicit mode):
 *   { tokenId: number, carbonReduction: number, evidenceHash: string }
 *
 * Body (IoT convenience mode — hash is computed server-side):
 *   { tokenId: number, deviceId: string, energyKwh: number, carbonKg: number }
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tokenId } = body;

    if (tokenId === undefined) {
      return NextResponse.json({ success: false, error: 'tokenId is required' }, { status: 400 });
    }

    let result;

    // IoT convenience mode — build evidenceHash server-side
    if (body.deviceId !== undefined) {
      const { deviceId, energyKwh, carbonKg } = body;
      if (!deviceId || energyKwh === undefined || carbonKg === undefined) {
        return NextResponse.json(
          { success: false, error: 'deviceId, energyKwh, and carbonKg are required for IoT mode' },
          { status: 400 },
        );
      }
      result = await recordIoTAttestation({
        tokenId: BigInt(tokenId),
        deviceId,
        energyKwh: Number(energyKwh),
        carbonKg: Number(carbonKg),
      });
    } else {
      // Explicit mode — client provides the evidenceHash and carbonReduction
      const { carbonReduction, evidenceHash } = body;
      if (!carbonReduction || !evidenceHash) {
        return NextResponse.json(
          { success: false, error: 'carbonReduction and evidenceHash are required in explicit mode' },
          { status: 400 },
        );
      }
      result = await submitVerification(
        BigInt(tokenId),
        BigInt(carbonReduction),
        evidenceHash as Hash,
      );
    }

    if (result.success && result.transactionHash) {
      await addBlockchainRecord({
        tokenId: BigInt(tokenId),
        transactionHash: result.transactionHash,
        chainId: CHAIN_ID,
        contractAddress: CONTRACT_ADDRESS,
        status: 'verified',
      });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error('[/api/onchain/verify]', error.message);
    return NextResponse.json({ success: false, error: error.message || 'Blockchain transaction failed' }, { status: 500 });
  }
}
