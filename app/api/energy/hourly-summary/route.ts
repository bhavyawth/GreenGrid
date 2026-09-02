import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/pg';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/energy/hourly-summary
 * Returns actual aggregated energy consumption and emission data for the last 24 hours from PostgreSQL.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = verifyToken(token);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const intensity = Number(process.env.GRID_EMISSION_FACTOR || '260');

    // Query energy readings in the last 24 hours grouped by hour buckets
    const res = await query(
      `SELECT 
         DATE_TRUNC('hour', timestamp) as hour_bucket,
         AVG(power) as avg_power,
         AVG(voltage) as avg_voltage,
         AVG(current) as avg_current,
         COUNT(*) as count
       FROM energy_readings
       WHERE timestamp >= NOW() - INTERVAL '24 hours'
       GROUP BY hour_bucket
       ORDER BY hour_bucket ASC`
    );

    const formattedData = res.rows.map(row => {
      const date = new Date(row.hour_bucket);
      const hourStr = `${date.getHours().toString().padStart(2, '0')}:00`;
      
      // Calculate consumption: average power (W) / 1000 = consumption (kWh) for a 1-hour block
      const consumption = Number((Number(row.avg_power || 0) / 1000).toFixed(4));
      
      // Calculate emission: consumption (kWh) * intensity (g/kWh) / 1000 = emissions (kg CO2)
      const emission = Number(((consumption * intensity) / 1000).toFixed(6));

      return {
        time: hourStr,
        consumption,
        carbonIntensity: intensity,
        emission,
        voltage: Number(row.avg_voltage || 0),
        current: Number(row.avg_current || 0)
      };
    });

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error('Get hourly summary error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get summary' }, { status: 500 });
  }
}
