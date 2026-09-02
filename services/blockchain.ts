import CryptoJS from 'crypto-js';
import { BlockchainTransaction } from '../types/index';

// Simulated blockchain for carbon credits
export class CarbonBlockchain {
  private chain: BlockchainTransaction[] = [];
  private difficulty = 2; // Simple proof of work difficulty

  constructor() {
    this.initializeChain();
  }

  private initializeChain(): void {
    const genesisBlock: BlockchainTransaction = {
      id: '0',
      timestamp: new Date(),
      type: 'EMISSION_RECORDED',
      amount: 0,
      hash: this.calculateHash({
        id: '0',
        timestamp: new Date(),
        type: 'EMISSION_RECORDED',
        amount: 0,
        previousHash: '0',
        nonce: 0
      }),
      previousHash: '0',
      nonce: 0
    };
    this.chain.push(genesisBlock);
  }

  private calculateHash(data: any): string {
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }

  private isValidHash(hash: string): boolean {
    return hash.startsWith('0'.repeat(this.difficulty));
  }

  private mineBlock(transaction: Omit<BlockchainTransaction, 'hash' | 'nonce'>): { hash: string; nonce: number } {
    let nonce = 0;
    let hash = '';

    while (!this.isValidHash(hash)) {
      hash = this.calculateHash({ ...transaction, nonce });
      nonce++;
    }

    return { hash, nonce };
  }

  addTransaction(transaction: Omit<BlockchainTransaction, 'hash' | 'nonce'>): BlockchainTransaction {
    const previousHash = this.chain[this.chain.length - 1].hash;
    const { hash, nonce } = this.mineBlock({
      ...transaction,
      previousHash
    });

    const newTransaction: BlockchainTransaction = {
      ...transaction,
      previousHash,
      hash,
      nonce
    };

    this.chain.push(newTransaction);
    return newTransaction;
  }

  getChain(): BlockchainTransaction[] {
    return [...this.chain];
  }

  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!this.isValidHash(currentBlock.hash)) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }

    return true;
  }

  getLatestTransactions(count: number = 10): BlockchainTransaction[] {
    return this.chain.slice(Math.max(1, this.chain.length - count)).reverse();
  }
}

export const carbonsBlockchain = new CarbonBlockchain();
