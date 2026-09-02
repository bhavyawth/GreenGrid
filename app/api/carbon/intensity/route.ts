import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/carbon/intensity
 * Returns the configured grid emission factor for the project.
 */
export async function GET() {
  try {
    const intensity = Number(process.env.GRID_EMISSION_FACTOR || '260');
    return NextResponse.json({
      intensity,
      unit: 'gCO2/kWh',
      source: 'Configured Grid Emission Factor (USA National Average)',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get carbon intensity' },
      { status: 500 }
    );
  }
}
