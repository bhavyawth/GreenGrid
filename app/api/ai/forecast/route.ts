import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/server/ai/service';
import { getUserIdFromAuthorizationHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/forecast
 * Returns a grid-carbon-intensity forecast only when validated grid-intensity history is available.
 */
export async function GET(request: NextRequest) {
  if (!getUserIdFromAuthorizationHeader(request.headers.get('authorization'))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await aiService.getCarbonForecast(24);
    if (!result.success) {
      if (result.insufficientData) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Validated hourly grid-carbon observations are not available.',
            source: result.source || 'unconfigured',
            insufficientData: true,
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate forecast' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      forecast: result.forecast,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Forecast endpoint failed' },
      { status: 500 }
    );
  }
}
