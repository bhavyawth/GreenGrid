/**
 * Server-side only blockchain client.
 * Uses viem to create a publicClient (reads) and walletClient (writes).
 * Chain + RPC are driven entirely by environment variables.
 * Never import this in a React component or a 'use client' file.
 */
import { createPublicClient, createWalletClient, http, defineChain, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL =
  process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';

export const CONTRACT_ADDRESS = (
  process.env.BLOCKCHAIN_CONTRACT_ADDRESS || ''
) as Address;

export const CHAIN_ID = Number(process.env.BLOCKCHAIN_CHAIN_ID || 31337);

export const localChain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 31337 ? 'Hardhat Localhost' : `Chain ${CHAIN_ID}`,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: undefined,
});

export const EXPLORER_URL = 'http://127.0.0.1:8545';

// Public client — used for all read-only calls (no private key needed)
export const publicClient = createPublicClient({
  chain: localChain,
  transport: http(RPC_URL),
});

// Wallet client — used for write transactions (requires BLOCKCHAIN_PRIVATE_KEY)
let _walletClient: ReturnType<typeof createWalletClient> | null = null;

export function getWalletClient() {
  if (_walletClient) return _walletClient;

  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('BLOCKCHAIN_PRIVATE_KEY is not set. Cannot submit write transactions.');
  }

  // Ensure 0x prefix
  const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(pk as `0x${string}`);

  _walletClient = createWalletClient({
    account,
    chain: localChain,
    transport: http(RPC_URL),
  });

  return _walletClient;
}

export function isWalletConfigured(): boolean {
  return Boolean(process.env.BLOCKCHAIN_PRIVATE_KEY);
}
