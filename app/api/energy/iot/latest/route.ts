import { NextRequest, NextResponse } from 'next/server';
import { getLatestIoTEnergyReading } from '@/lib/db';
import { getUserIdFromAuthorizationHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!getUserIdFromAuthorizationHeader(request.headers.get('authorization'))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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
