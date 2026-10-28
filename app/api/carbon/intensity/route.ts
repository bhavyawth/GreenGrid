import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/carbon/intensity
 * Returns the configured grid emission factor for the project.
 */
export async function GET() {
  try {
    const configuredValue = process.env.GRID_EMISSION_FACTOR;
    const intensity = Number(configuredValue || '260');
    if (!Number.isFinite(intensity) || intensity < 0 || intensity > 2000) {
      return NextResponse.json(
        { error: 'GRID_EMISSION_FACTOR must be a finite value between 0 and 2000.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      intensity,
      unit: 'gCO2e/kWh',
      source: configuredValue ? 'configured-estimate' : 'demo-default-estimate',
      region: process.env.GRID_REGION || null,
      isEstimate: true,
      observedAt: null,
      retrievedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get carbon intensity' },
      { status: 500 }
    );
  }
}
