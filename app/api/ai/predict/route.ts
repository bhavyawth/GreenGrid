import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/server/ai/service';
import { aiClient } from '@/lib/server/ai/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/predict
 * Estimates carbon emission using the Bi-LSTM model.
 * 
 * If a JSON body is provided with { power, energy, gridIntensity }, it uses those values.
 * Otherwise, it retrieves the latest real PZEM reading from the database and estimates based on it.
 */
export async function POST(request: NextRequest) {
  try {
    let power: number | undefined;
    let energy: number | undefined;
    let gridIntensity: number | undefined;
    let timestamp: string | undefined;

    try {
      const body = await request.json();
      power = body.power;
      energy = body.energy;
      gridIntensity = body.gridIntensity;
      timestamp = body.timestamp;
    } catch {
      // No JSON body or invalid JSON, fall back to database
    }

    // If explicit values are provided, use them
    if (power !== undefined && energy !== undefined && gridIntensity !== undefined) {
      if (power < 0 || energy < 0 || gridIntensity < 0) {
        return NextResponse.json(
          { success: false, error: 'power, energy, and gridIntensity must be >= 0' },
          { status: 400 }
        );
      }

      const prediction = await aiClient.predictEmission({
        power,
        energy,
        gridIntensity,
        timestamp,
      });

      return NextResponse.json({
        success: true,
        data: prediction,
      });
    }

    // Otherwise, use the latest real sensor reading
    const result = await aiService.estimateCurrentEmission();
    if (!result.success) {
      if (result.insufficientData) {
        return NextResponse.json(
          { success: false, error: 'No real sensor data available to predict on.', insufficientData: true },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error || 'Prediction failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Predict endpoint failed' },
      { status: 500 }
    );
  }
}
