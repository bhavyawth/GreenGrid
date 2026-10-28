import { NextRequest, NextResponse } from 'next/server';
import { getIoTStatus } from '@/lib/mqtt';
import { getUserIdFromAuthorizationHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!getUserIdFromAuthorizationHeader(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await getIoTStatus());
  } catch (error) {
    console.error('Get IoT status error:', error);
    return NextResponse.json({ error: 'Failed to get IoT status' }, { status: 500 });
  }
}
