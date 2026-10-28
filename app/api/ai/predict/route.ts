import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/server/ai/service';
import { aiClient } from '@/lib/server/ai/client';
import { getUserIdFromAuthorizationHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/predict
 * Calculates interval carbon emissions from explicit values or the latest two cumulative meter readings.
 */
export async function POST(request: NextRequest) {
  try {
    if (!getUserIdFromAuthorizationHeader(request.headers.get('authorization'))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let power: unknown;
    let energy: unknown;
    let gridIntensity: unknown;
    let timestamp: unknown;

    try {
      const body: unknown = await request.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ success: false, error: 'Request body must be a JSON object.' }, { status: 400 });
      }
      const values = body as Record<string, unknown>;
      power = values.power;
      energy = values.energy;
      gridIntensity = values.gridIntensity;
      timestamp = values.timestamp;
    } catch {
      return NextResponse.json({ success: false, error: 'A valid JSON request body is required.' }, { status: 400 });
    }

    // If explicit values are provided, use them
    const suppliedFields = [power, energy, gridIntensity].filter(value => value !== undefined).length;
    if (suppliedFields > 0) {
      if (
        suppliedFields !== 3 ||
        typeof power !== 'number' ||
        typeof energy !== 'number' ||
        typeof gridIntensity !== 'number' ||
        !Number.isFinite(power) ||
        !Number.isFinite(energy) ||
        !Number.isFinite(gridIntensity)
      ) {
        return NextResponse.json(
          { success: false, error: 'power, interval energy, and gridIntensity must be finite numbers.' },
          { status: 400 }
        );
      }

      if (
        power < 0 ||
        energy < 0 ||
        gridIntensity < 0 ||
        gridIntensity > 2000 ||
        (timestamp !== undefined && (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp))))
      ) {
        return NextResponse.json(
          { success: false, error: 'Provide finite non-negative power, interval energy, and gridIntensity values (gridIntensity <= 2000); timestamp must be valid ISO-8601.' },
          { status: 400 }
        );
      }

      const prediction = await aiClient.predictEmission({
        power,
        energy,
        gridIntensity,
        timestamp: typeof timestamp === 'string' ? timestamp : undefined,
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
