import { NextResponse } from 'next/server';
import { publicClient, CONTRACT_ADDRESS, CHAIN_ID, EXPLORER_URL, isWalletConfigured, getWalletClient } from '@/lib/server/blockchain/client';

/**
 * GET /api/onchain/debug
 * Diagnostic endpoint — checks RPC, wallet, and contract accessibility.
 * Returns detailed error info to help diagnose connection failures.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
  const contractAddress = CONTRACT_ADDRESS;
  const chainId = CHAIN_ID;
  const walletConfigured = isWalletConfigured();

  // Step 1: Test RPC connection
  let rpcOk = false;
  let blockNumber: string | null = null;
  let rpcError: string | null = null;
  try {
    const bn = await publicClient.getBlockNumber();
    blockNumber = bn.toString();
    rpcOk = true;
  } catch (e: any) {
    rpcError = e?.message || 'Unknown RPC error';
  }

  // Step 2: Test wallet account derivation
  let walletAddress: string | null = null;
  let walletError: string | null = null;
  if (walletConfigured) {
    try {
      const wc = getWalletClient();
      walletAddress = (wc as any).account?.address || 'unknown';
    } catch (e: any) {
      walletError = e?.message || 'Unknown wallet error';
    }
  }

  // Step 3: Test contract bytecode exists at address
  let contractExists = false;
  let contractError: string | null = null;
  if (rpcOk && contractAddress) {
    try {
      const code = await publicClient.getBytecode({ address: contractAddress });
      contractExists = Boolean(code && code !== '0x');
      if (!contractExists) contractError = 'No bytecode at address — contract may not be deployed on this chain/node';
    } catch (e: any) {
      contractError = e?.message || 'Unknown contract error';
    }
  }

  return NextResponse.json({
    config: {
      rpcUrl,
      chainId,
      contractAddress,
      explorerUrl: EXPLORER_URL,
      walletConfigured,
    },
    rpc: { ok: rpcOk, blockNumber, error: rpcError },
    wallet: { ok: Boolean(walletAddress), address: walletAddress, error: walletError },
    contract: { ok: contractExists, error: contractError },
    overallOk: rpcOk && contractExists && (walletConfigured ? Boolean(walletAddress) : true),
  });
}
