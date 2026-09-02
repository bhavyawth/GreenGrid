import { NextRequest, NextResponse } from 'next/server';
import { readUsers, getAllEnergyData, findUserById } from '@/lib/db';
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

    const usersWithStats = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      totalEnergyUsed: user.totalEnergyUsed || 0,
      totalReadings: energyData[user.id]?.readings?.length || 0,
    }));

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}
