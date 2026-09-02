import type { Abi } from 'viem';

// ABI sourced directly from CarbonCreditBlockchain-main/carbon-credits-app/src/contract.ts
// Contract: CarbonCredit.sol (ERC-1155) on Polygon Amoy
export const carbonCreditAbi = [
  { type: 'function', name: 'claimTestingRoles', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'registerProject', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'metadataCID', type: 'string' }], outputs: [] },
  { type: 'function', name: 'submitVerification', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'carbonReduction', type: 'uint256' }, { name: 'evidenceHash', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'retire', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: 'retirementId', type: 'uint256' }] },
  { type: 'function', name: 'getBalance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'getProjectData', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: 'metadataCID', type: 'string' }, { name: 'issuer', type: 'address' }, { name: 'carbonReduction', type: 'uint256' }, { name: 'verifiedAt', type: 'uint256' }, { name: 'evidenceHash', type: 'bytes32' }, { name: 'attestationCount', type: 'uint256' }, { name: 'registered', type: 'bool' }, { name: 'verified', type: 'bool' }] },
  { type: 'function', name: 'getRetirementRecord', stateMutability: 'view', inputs: [{ name: 'retirementId', type: 'uint256' }], outputs: [{ name: 'account', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }] },
  { type: 'function', name: 'totalIssued', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'verificationThreshold', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'retirementCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'uri', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'safeTransferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'id', type: 'uint256' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [] },
] as const satisfies Abi;
