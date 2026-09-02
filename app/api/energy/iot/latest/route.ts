import { NextResponse } from 'next/server';
import { getLatestIoTEnergyReading } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      reading: await getLatestIoTEnergyReading(),
    });
  } catch (error) {
    console.error('Get latest IoT reading error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get latest IoT reading' }, { status: 500 });
  }
}
