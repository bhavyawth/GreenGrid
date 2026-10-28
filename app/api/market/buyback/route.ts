import { NextRequest, NextResponse } from 'next/server';
import { buyBackMarketListing, getLatestIoTEnergyReading } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  const sellerId = token ? verifyToken(token) : null;
  if (!sellerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { listingId } = await request.json();
    if (!listingId) return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    const reading = await getLatestIoTEnergyReading();
    const power = reading ? Number(reading.power) : null;
    if (power === null || !Number.isFinite(power) || power < 0) {
      return NextResponse.json(
        { error: 'A valid PZEM reading is required to calculate the internal buy-back estimate.' },
        { status: 409 }
      );
    }
    const currentPrice = Number((25 * (1 + Math.max(-0.1, Math.min(0.1, ((power - 1000) / 1000) * 0.1)))).toFixed(2));
    return NextResponse.json(await buyBackMarketListing(listingId, sellerId, currentPrice));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Buy-back failed' }, { status: 400 });
  }
}