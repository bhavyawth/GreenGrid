import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';
import { getAllBlockchainTransactions } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const calculateHash = (data: any) => {
  return CryptoJS.SHA256(JSON.stringify(data)).toString();
};

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transactions = await getAllBlockchainTransactions();
    let isValid = true;
    let validCount = 0;

    if (!process.env.DB_URI) {
      let previousHash = '0';
      for (const transaction of transactions) {
        const linked = transaction.previousHash === previousHash && Boolean(transaction.hash);
        if (linked) validCount += 1;
        else isValid = false;
        previousHash = transaction.hash;
      }

      return NextResponse.json({
        isValid,
        totalTransactions: transactions.length,
        validTransactions: validCount,
        integrity: transactions.length > 0
          ? Math.round((validCount / transactions.length) * 100)
          : 100,
      });
    }

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const hash = calculateHash({
        ...transaction,
        hash: undefined,
      });

      if (hash === transaction.hash && transaction.hash.startsWith('00')) {
        validCount += 1;
      } else {
        isValid = false;
      }
    }

    return NextResponse.json({
      isValid,
      totalTransactions: transactions.length,
      validTransactions: validCount,
      integrity: transactions.length > 0
        ? Math.round((validCount / transactions.length) * 100)
        : 100,
    });
  } catch (error) {
    console.error('Validate error:', error);
    return NextResponse.json({ error: 'Failed to validate' }, { status: 500 });
  }
}
