import { NextResponse } from 'next/server';
import { aiService } from '@/lib/server/ai/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/forecast
 * Retrieves a 24-hour grid carbon-intensity forecast using the LSSVM model trained on real PZEM readings.
 */
export async function GET() {
  try {
    const result = await aiService.getCarbonForecast(24);
    if (!result.success) {
      if (result.insufficientData) {
        return NextResponse.json(
          { success: false, error: 'Insufficient real sensor data. Need at least 8 readings.', insufficientData: true },
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
