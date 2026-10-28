import { NextRequest, NextResponse } from 'next/server';
import { getLatestIoTEnergyReading } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reading = await getLatestIoTEnergyReading();
  const power = reading?.power || 1000;
  const referencePower = 1000;
  const pressure = Math.max(-0.1, Math.min(0.1, ((power - referencePower) / referencePower) * 0.1));
  const price = Number((25 * (1 + pressure)).toFixed(2));
  return NextResponse.json({
    price,
    power,
    referencePower,
    changePercent: Number((pressure * 100).toFixed(2)),
    explanation: power > 5 ? 'Higher electricity usage is increasing carbon demand.' : 'Lower electricity usage is keeping carbon demand and price lower.'
  });
}