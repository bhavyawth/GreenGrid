import { NextRequest, NextResponse } from 'next/server';
import { findUserById, getAllEnergyData } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const isAdmin = async (token: string | undefined) => {
  if (!token) return false;
  const userId = verifyToken(token);
  if (!userId) return false;
  const user = await findUserById(userId);
  return user && user.role === 'admin';
};

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!(await isAdmin(token))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const user = await findUserById(params.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const allEnergyData = await getAllEnergyData();
    const energyData = allEnergyData[user.id];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        totalEnergyUsed: user.totalEnergyUsed || 0,
      },
      energyReadings: energyData?.readings || [],
      hourlyReadings: energyData?.hourlyReadings || [],
    });
  } catch (error) {
    console.error('Get user details error:', error);
    return NextResponse.json({ error: 'Failed to get user details' }, { status: 500 });
  }
}
