import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';
import { getAllBlockchainTransactions, addBlockchainTransaction, findUserById, getLatestIoTEnergyReading, addBlockchainRecord } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { recordIoTAttestation, registerProject, getProjectData } from '@/lib/server/blockchain/service';
import { CONTRACT_ADDRESS, CHAIN_ID } from '@/lib/server/blockchain/client';

export const dynamic = 'force-dynamic';

const calculateHash = (data: any) => {
  return CryptoJS.SHA256(JSON.stringify(data)).toString();
};

/**
 * POST /api/blockchain/transaction
 * Calculates real carbon emission from the latest database PZEM reading,
 * saves to local_blockchain table, writes to local Hardhat contract, and inserts into blockchain_records.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = verifyToken(token);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await findUserById(userId);
    const userName = user ? user.name : 'Unknown';

    // 1. Fetch the latest real PZEM telemetry reading from PostgreSQL
    const latestReading = await getLatestIoTEnergyReading();
    if (!latestReading) {
      return NextResponse.json(
        { error: 'No physical PZEM sensor readings found. Make sure the ESP32 is online and transmitting data.' },
        { status: 400 }
      );
    }

    const intensity = Number(process.env.GRID_EMISSION_FACTOR || '260');
    // Calculate actual carbon emission in kg CO2: energy (kWh) * gridIntensity (g/kWh) / 1000
    const calculatedAmount = Number(((latestReading.energy * intensity) / 1000).toFixed(4));

    if (calculatedAmount <= 0) {
      return NextResponse.json(
        { error: 'Sensor cumulative energy is too low to record emissions. Cumulative energy: ' + latestReading.energy + ' kWh' },
        { status: 400 }
      );
    }

    const allTransactions = await getAllBlockchainTransactions();
    const previousHash = allTransactions.length > 0
      ? allTransactions[allTransactions.length - 1].hash
      : '0';

    const txId = `TXN_${Date.now()}`;
    const transaction: any = {
      id: txId,
      userId,
      userName,
      type: 'EMISSION_RECORDED',
      amount: calculatedAmount,
      description: `Real energy emission recorded. Consumption: ${latestReading.energy.toFixed(4)} kWh, power: ${latestReading.power.toFixed(1)} W.`,
      timestamp: new Date().toISOString(),
      previousHash,
      nonce: 0,
      hash: '',
    };

    // Calculate simulated proof-of-work hash for local off-chain ledger
    let isValid = false;
    while (!isValid) {
      const hashToCalculate = { ...transaction, hash: undefined };
      const calculatedHash = calculateHash(hashToCalculate);
      if (calculatedHash.startsWith('00')) {
        transaction.hash = calculatedHash;
        isValid = true;
      } else {
        transaction.nonce += 1;
      }
    }

    // Save transaction to local off-chain ledger table in PostgreSQL
    const savedTransaction = await addBlockchainTransaction(transaction);

    // 2. Perform the real local smart contract integration
    const tokenId = 1n; // Default project token ID
    let onchainSuccess = false;
    let transactionHash = '';

    try {
      // Verify project registration on-chain first
      try {
        await getProjectData(tokenId);
      } catch (checkErr) {
        console.log('[Blockchain API] Project ID 1 not registered on contract. Registering default project now...');
        const regRes = await registerProject(tokenId, 'ipfs://default-esp32-project-metadata');
        if (!regRes.success) {
          throw new Error('Failed to register default project: ' + regRes.error);
        }
        // Wait a brief moment for local blockchain mining confirmation
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Record energy measurement attestation as oracle verification
      const attestation = await recordIoTAttestation({
        tokenId,
        deviceId: latestReading.deviceId || 'ESP32-001',
        energyKwh: latestReading.energy,
        carbonKg: calculatedAmount,
      });

      if (attestation.success && attestation.transactionHash) {
        onchainSuccess = true;
        transactionHash = attestation.transactionHash;

        // Persist on-chain record in PostgreSQL
        await addBlockchainRecord({
          tokenId,
          transactionHash,
          chainId: CHAIN_ID,
          contractAddress: CONTRACT_ADDRESS,
          status: 'verified',
          carbonRecordId: txId,
        });
        console.log('[Blockchain API] Successfully verified attestation on local Hardhat blockchain. Hash:', transactionHash);
      } else {
        console.error('[Blockchain API] On-chain attestation rejected:', attestation.error);
      }
    } catch (contractError: any) {
      console.error('[Blockchain API] Local smart contract verification failed:', contractError.message);
    }

    return NextResponse.json({
      success: true,
      transaction: savedTransaction,
      onchain: {
        success: onchainSuccess,
        transactionHash,
        contractAddress: CONTRACT_ADDRESS,
        tokenId: tokenId.toString(),
      },
    });
  } catch (error: any) {
    console.error('Add transaction error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add transaction' }, { status: 500 });
  }
}
