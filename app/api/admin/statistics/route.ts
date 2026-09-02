import { NextRequest, NextResponse } from 'next/server';
import { readUsers, getAllEnergyData, getAllBlockchainTransactions, findUserById } from '@/lib/db';
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

    const users = await readUsers();
    const energyData = await getAllEnergyData();
    const blockchain = await getAllBlockchainTransactions();

    const totalEnergyUsed = users.reduce((sum: number, user: any) => sum + (user.totalEnergyUsed || 0), 0);
    const totalReadings = Object.values(energyData).reduce(
      (sum: number, data: any) => sum + (data.readings?.length || 0),
      0
    );
    const totalTransactions = blockchain.length;

    const stats = {
      totalUsers: users.length,
      totalEnergyUsed: Math.round(totalEnergyUsed * 100) / 100,
      totalReadings,
      totalBlockchainTransactions: totalTransactions,
      averageEnergyPerUser: users.length > 0
        ? Math.round((totalEnergyUsed / users.length) * 100) / 100
        : 0,
      platformUptime: new Date().getTime(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get statistics error:', error);
    return NextResponse.json({ error: 'Failed to get statistics' }, { status: 500 });
  }
}
