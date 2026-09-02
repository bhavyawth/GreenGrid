import { NextRequest, NextResponse } from 'next/server';
import { getGreenCertificates, addGreenCertificate } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificates - Gets owned certificates
 * POST /api/certificates - Creates/mints a new Green Certificate
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = verifyToken(token);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const certificates = await getGreenCertificates(userId);
    return NextResponse.json(certificates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get certificates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = verifyToken(token);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { carbonReduced, tokenId, blockchainTxn } = await request.json();

    if (!carbonReduced || !tokenId) {
      return NextResponse.json({ error: 'carbonReduced and tokenId are required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const cert = await addGreenCertificate({
      id,
      ownerId: userId,
      carbonReduced: Number(carbonReduced),
      tokenId,
      verified: true,
      blockchainTxn
    });

    return NextResponse.json({ success: true, certificate: cert });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create certificate' }, { status: 500 });
  }
}
