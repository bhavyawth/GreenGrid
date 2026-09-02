import { NextRequest, NextResponse } from 'next/server';
import { readUsers, getAllBlockchainTransactions, findUserById } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const isAdmin = async (token: string | undefined) => {
  if (!token) return false;
  const userId = verifyToken(token);
  if (!userId) return false;
  const user = await findUserById(userId);
  return user && user.role === 'admin';
};

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!(await isAdmin(token))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const blockchain = await getAllBlockchainTransactions();
    const users = await readUsers();

    const transactionsWithUsers = blockchain.map((tx: any) => ({
      ...tx,
      userName: users.find((u: any) => u.id === tx.userId)?.name || 'Unknown',
    }));

    return NextResponse.json(transactionsWithUsers);
  } catch (error) {
    console.error('Get blockchain error:', error);
    return NextResponse.json({ error: 'Failed to get blockchain' }, { status: 500 });
  }
}
