import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/onchain/verify
 * Disabled because caller-supplied values are not trusted measurement evidence.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: 'Direct attestations are disabled because client-supplied energy and carbon values are not trusted evidence.',
      alternative: 'Use the authenticated blockchain transaction endpoint, which derives emissions from stored meter readings.',
    },
    { status: 409 }
  );
}
