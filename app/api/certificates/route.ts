import { NextRequest, NextResponse } from 'next/server';
import { getGreenCertificates } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificates - Gets owned certificates
 * POST /api/certificates - Disabled until avoided emissions can be independently calculated
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
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: 'Certificate issuance is paused: current telemetry records estimated emissions, not verified avoided emissions.',
      requiredMethodology: 'Compare measured energy against a documented baseline over the same period and apply a configured grid factor.',
    },
    { status: 409 }
  );
}
