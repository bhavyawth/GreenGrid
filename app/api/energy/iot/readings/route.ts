import { NextRequest, NextResponse } from 'next/server';
import { getIoTEnergyReadings } from '@/lib/db';
import { getUserIdFromAuthorizationHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!getUserIdFromAuthorizationHeader(request.headers.get('authorization'))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limitParam = request.nextUrl.searchParams.get('limit');
    const requestedLimit = Number(limitParam || 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500)
      : 50;

    return NextResponse.json({
      success: true,
      readings: await getIoTEnergyReadings(limit),
    });
  } catch (error) {
    console.error('Get IoT readings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get IoT readings' }, { status: 500 });
  }
}
