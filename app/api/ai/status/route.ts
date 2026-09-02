import { NextResponse } from 'next/server';
import { aiService } from '@/lib/server/ai/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/status
 * Health check endpoint for Carbon AI service connection.
 */
export async function GET() {
  try {
    const health = await aiService.checkHealth();
    return NextResponse.json(health);
  } catch (error: any) {
    return NextResponse.json(
      { available: false, error: error.message || 'AI service check failed' },
      { status: 500 }
    );
  }
}
