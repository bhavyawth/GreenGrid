import { NextRequest, NextResponse } from 'next/server';
import { getUserEnergyData, setUserEnergyData, findUserById, updateUser } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = verifyToken(token);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { consumption, carbonIntensity, cost, timestamp } = await request.json();

    let energyData: any = await getUserEnergyData(userId);
    if (!energyData) {
      energyData = {
        userId,
        readings: [],
        hourlyReadings: [],
        totalEnergyUsed: 0,
      };
    }

    const reading = {
      id: Date.now(),
      consumption,
      carbonIntensity,
      cost,
      timestamp: timestamp || new Date().toISOString(),
    };

    energyData.readings = energyData.readings || [];
    energyData.readings.push(reading);
    energyData.totalEnergyUsed = (energyData.totalEnergyUsed || 0) + consumption;

    const hour = new Date(reading.timestamp).getHours();
    energyData.hourlyReadings = energyData.hourlyReadings || [];
    const existingHour = energyData.hourlyReadings.find((h: any) => h.hour === hour);
    
    if (existingHour) {
      existingHour.consumption += consumption;
      existingHour.count += 1;
    } else {
      energyData.hourlyReadings.push({
        hour,
        consumption,
        carbonIntensity,
        count: 1,
      });
    }

    await setUserEnergyData(userId, energyData);

    const user = await findUserById(userId);
    if (user) {
      await updateUser(userId, { totalEnergyUsed: energyData.totalEnergyUsed });
    }

    return NextResponse.json({ success: true, reading, totalEnergyUsed: energyData.totalEnergyUsed });
  } catch (error) {
    console.error('Add reading error:', error);
    return NextResponse.json({ error: 'Failed to add reading' }, { status: 500 });
  }
}
