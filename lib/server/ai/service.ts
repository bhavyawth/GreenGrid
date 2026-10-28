/**
 * Server-side AI service that bridges raw IoT database readings with the AI model client
 */
import { getIoTEnergyReadings } from '@/lib/db';
import { aiClient, HealthStatus, EmissionPredictResponse } from './client';
import { toHouseholdEquivalent, HOUSEHOLD_LOAD_SCALE_FACTOR } from '@/lib/household-equivalent';

export interface AIForecastItem {
  hour: number;
  carbonIntensity: number;
  isGreenWindow: boolean;
  recommendedLoad: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AIForecastResponse {
  success: boolean;
  forecast?: AIForecastItem[];
  insufficientData?: boolean;
  error?: string;
  source?: string;
}

export const aiService = {
  async checkHealth(): Promise<HealthStatus> {
    return aiClient.getHealth();
  },

  async estimateCurrentEmission(): Promise<{ success: boolean; data?: EmissionPredictResponse; error?: string; insufficientData?: boolean; scaleFactor?: number; source?: string }> {
    try {
      const readings = await getIoTEnergyReadings(2);
      if (readings.length < 2) {
        return { success: false, insufficientData: true };
      }

      const previous = readings[0];
      const latest = readings[1];
      const rawIntervalEnergy = latest.energy - previous.energy;
      if (rawIntervalEnergy < 0) {
        return {
          success: false,
          error: 'The cumulative meter reading decreased; check for a meter reset before estimating interval emissions.',
        };
      }

      const gridIntensity = Number(process.env.GRID_EMISSION_FACTOR || '260');
      if (!Number.isFinite(gridIntensity) || gridIntensity < 0 || gridIntensity > 2000) {
        return { success: false, error: 'GRID_EMISSION_FACTOR must be a finite value between 0 and 2000.' };
      }

      const prediction = await aiClient.predictEmission({
        power: toHouseholdEquivalent(latest.power) / 1000,
        energy: toHouseholdEquivalent(rawIntervalEnergy),
        gridIntensity,
        timestamp: latest.timestamp.toISOString(),
      });

      return {
        success: true,
        data: prediction,
        scaleFactor: HOUSEHOLD_LOAD_SCALE_FACTOR,
        source: 'configured grid-intensity estimate; household-equivalent interval energy',
      };
    } catch (e: any) {
      console.error('[AI Service] Emission estimation failed:', e.message);
      return {
        success: false,
        error: e.message || 'Emission prediction failed',
      };
    }
  },

  async getCarbonForecast(horizonHours: number = 24): Promise<AIForecastResponse> {
    if (!Number.isInteger(horizonHours) || horizonHours < 1 || horizonHours > 24) {
      return { success: false, error: 'Forecast horizon must be an integer between 1 and 24 hours.' };
    }

    return {
      success: false,
      insufficientData: true,
      source: 'unconfigured',
      error: 'No validated hourly grid-carbon observations are configured. PZEM readings measure household demand, not grid carbon intensity.',
    };
  },
};
