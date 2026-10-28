/**
 * Server-side blockchain service.
 * All functions here run exclusively in Node.js (never in the browser).
 * Wraps viem contract reads/writes with clean error handling.
 */
import { keccak256, stringToBytes, type Address, type Hash } from 'viem';
import {
  publicClient,
  getWalletClient,
  CONTRACT_ADDRESS,
  CHAIN_ID,
  EXPLORER_URL,
  isWalletConfigured,
  localChain,
} from './client';
import { carbonCreditAbi } from './abi';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockchainStatus {
  connected: boolean;
  network: string;
  chainId: number;
  contractAddress: string;
  explorerUrl: string;
  walletConfigured: boolean;
  blockNumber?: string;
  error?: string;
}

export interface ProjectData {
  tokenId: string;
  metadataCID: string;
  issuer: string;
  carbonReduction: string;
  verifiedAt: string;
  evidenceHash: string;
  attestationCount: string;
  registered: boolean;
  verified: boolean;
  ipfsUri?: string;
}

export interface RetirementRecord {
  retirementId: string;
  account: string;
  tokenId: string;
  amount: string;
  timestamp: string;
}

export interface TxResult {
  success: boolean;
  transactionHash?: Hash;
  status: 'submitted' | 'confirmed' | 'failed';
  explorerLink?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

export async function getBlockchainStatus(): Promise<BlockchainStatus> {
  const base: BlockchainStatus = {
    connected: false,
    network: 'Polygon Amoy (testnet)',
    chainId: CHAIN_ID,
    contractAddress: CONTRACT_ADDRESS,
    explorerUrl: EXPLORER_URL,
    walletConfigured: isWalletConfigured(),
  };

  try {
    const blockNumber = await publicClient.getBlockNumber();
    return { ...base, connected: true, blockNumber: blockNumber.toString() };
  } catch (err: any) {
    console.error('[Blockchain] Status check failed:', err.message);
    return { ...base, error: 'RPC connection failed' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read: Project Data
// ─────────────────────────────────────────────────────────────────────────────

export async function getProjectData(tokenId: bigint): Promise<ProjectData> {
  const [
    metadataCID,
    issuer,
    carbonReduction,
    verifiedAt,
    evidenceHash,
    attestationCount,
    registered,
    verified,
  ] = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: carbonCreditAbi,
    functionName: 'getProjectData',
    args: [tokenId],
  });

  return {
    tokenId: tokenId.toString(),
    metadataCID,
    issuer,
    carbonReduction: carbonReduction.toString(),
    verifiedAt: verifiedAt > 0n
      ? new Date(Number(verifiedAt) * 1000).toISOString()
      : '',
    evidenceHash,
    attestationCount: attestationCount.toString(),
    registered,
    verified,
    ipfsUri: metadataCID ? `ipfs://${metadataCID}` : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Read: Retirement Record
// ─────────────────────────────────────────────────────────────────────────────

export async function getRetirementRecord(retirementId: bigint): Promise<RetirementRecord> {
  const [account, tokenId, amount, timestamp] = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: carbonCreditAbi,
    functionName: 'getRetirementRecord',
    args: [retirementId],
  });

  return {
    retirementId: retirementId.toString(),
    account,
    tokenId: tokenId.toString(),
    amount: amount.toString(),
    timestamp: new Date(Number(timestamp) * 1000).toISOString(),
  };
}

export async function getTotalRetirements(): Promise<string> {
  const count = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: carbonCreditAbi,
    functionName: 'retirementCount',
    args: [],
  });
  return count.toString();
}

export async function getVerificationThreshold(): Promise<string> {
  const threshold = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: carbonCreditAbi,
    functionName: 'verificationThreshold',
    args: [],
  });
  return threshold.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Build evidence hash from IoT reading
// ─────────────────────────────────────────────────────────────────────────────

export function buildEvidenceHash(payload: {
  deviceId: string;
  energy: number;
  carbon: number;
  timestamp?: string;
}): Hash {
  const raw = JSON.stringify({
    deviceId: payload.deviceId,
    energy: payload.energy,
    carbon: payload.carbon,
    timestamp: payload.timestamp || new Date().toISOString(),
    standard: 'EcoMint IoT Pipeline',
  });
  return keccak256(stringToBytes(raw));
}

// ─────────────────────────────────────────────────────────────────────────────
// Write: Claim Testing Roles (Amoy testnet convenience)
// ─────────────────────────────────────────────────────────────────────────────

export async function claimTestingRoles(): Promise<TxResult> {
  try {
    const walletClient = getWalletClient();
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: carbonCreditAbi,
      functionName: 'claimTestingRoles',
      account: walletClient.account!,
      chain: localChain,
      gas: 200000n,
      maxPriorityFeePerGas: 25000000000n,
      maxFeePerGas: 30000000000n,
    });

    return {
      success: true,
      transactionHash: hash,
      status: 'submitted',
      explorerLink: `${EXPLORER_URL}/tx/${hash}`,
    };
  } catch (err: any) {
    console.error('[Blockchain] claimTestingRoles failed:', err.message);
    return { success: false, status: 'failed', error: err.shortMessage || err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write: Register Project
// ─────────────────────────────────────────────────────────────────────────────

export async function registerProject(tokenId: bigint, metadataCID: string): Promise<TxResult> {
  try {
    const walletClient = getWalletClient();
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: carbonCreditAbi,
      functionName: 'registerProject',
      args: [tokenId, metadataCID],
      account: walletClient.account!,
      chain: localChain,
      gas: 500000n,
      maxPriorityFeePerGas: 25000000000n,
      maxFeePerGas: 30000000000n,
    });

    return {
      success: true,
      transactionHash: hash,
      status: 'submitted',
      explorerLink: `${EXPLORER_URL}/tx/${hash}`,
    };
  } catch (err: any) {
    console.error('[Blockchain] registerProject failed:', err.message);
    return { success: false, status: 'failed', error: err.shortMessage || err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write: Submit Oracle Verification (IoT evidence attestation)
// ─────────────────────────────────────────────────────────────────────────────

export async function submitVerification(
  tokenId: bigint,
  carbonReduction: bigint,
  evidenceHash: Hash,
): Promise<TxResult> {
  try {
    const walletClient = getWalletClient();
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: carbonCreditAbi,
      functionName: 'submitVerification',
      args: [tokenId, carbonReduction, evidenceHash],
      account: walletClient.account!,
      chain: localChain,
      gas: 500000n,
      maxPriorityFeePerGas: 25000000000n,
      maxFeePerGas: 30000000000n,
    });

    return {
      success: true,
      transactionHash: hash,
      status: 'submitted',
      explorerLink: `${EXPLORER_URL}/tx/${hash}`,
    };
  } catch (err: any) {
    console.error('[Blockchain] submitVerification failed:', err.message);
    return { success: false, status: 'failed', error: err.shortMessage || err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write: Record IoT energy reading as oracle attestation
// Convenience wrapper used by the API — builds the evidenceHash automatically.
// ─────────────────────────────────────────────────────────────────────────────

export async function recordIoTAttestation(params: {
  tokenId: bigint;
  deviceId: string;
  energyKwh: number;
  carbonKg: number;
}): Promise<TxResult> {
  const evidenceHash = buildEvidenceHash({
    deviceId: params.deviceId,
    energy: params.energyKwh,
    carbon: params.carbonKg,
  });

  // carbonReduction in whole tCO2e*100 to avoid floats on-chain (1 kg CO2 = 0.001 tCO2e)
  // We store as integer grams of CO2 to keep the number meaningful on-chain
  const carbonGrams = BigInt(Math.max(1, Math.round(params.carbonKg * 1000)));

  return submitVerification(params.tokenId, carbonGrams, evidenceHash);
}
