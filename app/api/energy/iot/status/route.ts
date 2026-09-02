import { NextResponse } from 'next/server';
import { getIoTStatus } from '@/lib/mqtt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getIoTStatus());
  } catch (error) {
    console.error('Get IoT status error:', error);
    return NextResponse.json({ error: 'Failed to get IoT status' }, { status: 500 });
  }
}
