import { NextRequest, NextResponse } from 'next/server';
import { getMarketListings, createMarketListing, getGreenCertificateById } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/listings - Retrieves active listings
 * POST /api/market/listings - Creates a new market listing
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listings = await getMarketListings();
    return NextResponse.json(listings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get listings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sellerId = verifyToken(token);
    if (!sellerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { certificateId, price } = await request.json();

    if (!certificateId || price === undefined || price <= 0) {
      return NextResponse.json({ error: 'Invalid certificate ID or price' }, { status: 400 });
    }

    // Verify ownership of the certificate
    const cert = await getGreenCertificateById(certificateId);
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }
    if (!cert.verified) {
      return NextResponse.json({ error: 'Only verified certificates can be listed' }, { status: 400 });
    }
    if (cert.ownerId !== sellerId) {
      return NextResponse.json({ error: 'You do not own this certificate' }, { status: 403 });
    }

    const id = crypto.randomUUID();
    const listing = await createMarketListing({
      id,
      sellerId,
      certificateId,
      quantity: 1,
      price: Number(price)
    });

    return NextResponse.json({ success: true, listing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create listing' }, { status: 500 });
  }
}
