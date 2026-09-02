import { NextRequest, NextResponse } from 'next/server';
import { getUserEnergyData, setUserEnergyData } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = verifyToken(token);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const energyData = await getUserEnergyData(userId);

    if (!energyData) {
      const newData = {
        userId,
        readings: [],
        createdAt: new Date().toISOString(),
      };
      await setUserEnergyData(userId, newData);
      return NextResponse.json({ readings: [], hourlyReadings: [] });
    }

    return NextResponse.json({
      readings: energyData.readings || [],
      hourlyReadings: energyData.hourlyReadings || [],
      totalEnergyUsed: energyData.totalEnergyUsed || 0,
    });
  } catch (error) {
    console.error('Get readings error:', error);
    return NextResponse.json({ error: 'Failed to get readings' }, { status: 500 });
  }
}
