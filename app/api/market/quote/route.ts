import { NextRequest, NextResponse } from 'next/server';
import { getLatestIoTEnergyReading } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reading = await getLatestIoTEnergyReading();
  const power = reading ? Number(reading.power) : null;
  const referencePower = 1000;
  if (power === null || !Number.isFinite(power) || power < 0) {
    return NextResponse.json({
      price: null,
      power: null,
      referencePower,
      changePercent: null,
      explanation: 'A valid PZEM reading is required to calculate this internal reference estimate.',
    });
  }

  const pressure = Math.max(-0.1, Math.min(0.1, ((power - referencePower) / referencePower) * 0.1));
  const price = Number((25 * (1 + pressure)).toFixed(2));
  return NextResponse.json({
    price,
    power,
    referencePower,
    changePercent: Number((pressure * 100).toFixed(2)),
    explanation: `Internal estimate based on measured power relative to a ${referencePower} W reference. It is not an external carbon-market price.`,
  });
}