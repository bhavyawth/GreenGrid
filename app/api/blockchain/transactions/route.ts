import { NextRequest, NextResponse } from 'next/server';
import { getAllBlockchainTransactions, readUsers } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transactions = await getAllBlockchainTransactions();
    const users = await readUsers();
    
    const transactionsWithUsers = transactions.map((tx: any) => ({
      ...tx,
      userName: tx.userName || users.find((u: any) => u.id === tx.userId)?.name || 'Unknown',
    }));
    
    return NextResponse.json(transactionsWithUsers);
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Failed to get transactions' }, { status: 500 });
  }
}
