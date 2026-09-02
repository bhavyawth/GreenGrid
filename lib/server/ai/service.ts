/**
 * Server-side AI service that bridges raw IoT database readings with the AI model client
 */
import { getIoTEnergyReadings, getLatestIoTEnergyReading, addAiPrediction } from '@/lib/db';
import { aiClient, HealthStatus, EmissionPredictResponse, ForecastPoint } from './client';

// Helper to calculate a deterministic grid carbon intensity based on timestamp
// to simulate real-world grid mix (e.g. higher in peak hours 17-21, lower otherwise)
export function getDeterministicGridIntensity(timestampStr: string): number {
  const date = new Date(timestampStr);
  const hour = date.getHours();
  const isPeak = hour >= 17 && hour <= 21;
  const base = isPeak ? 450 : 250;
  // Use a smooth sine wave based on time to add realistic variation
  const variance = Math.sin((date.getTime() / (1000 * 60 * 60 * 2)) * Math.PI) * 75;
  return Math.max(100, Math.round(base + variance));
}

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
}

export const aiService = {
  async checkHealth(): Promise<HealthStatus> {
    return aiClient.getHealth();
  },

  async estimateCurrentEmission(): Promise<{ success: boolean; data?: EmissionPredictResponse; error?: string; insufficientData?: boolean }> {
    try {
      const latest = await getLatestIoTEnergyReading();
      if (!latest) {
        return { success: false, insufficientData: true };
      }

      // Convert power from Watts (PZEM) to kW (AI Model expects kW)
      const powerKw = latest.power / 1000;
      // energy is already cumulative kWh from PZEM
      const energyKwh = latest.energy;
      const gridIntensity = getDeterministicGridIntensity(latest.timestamp.toISOString());

      const prediction = await aiClient.predictEmission({
        power: powerKw,
        energy: energyKwh,
        gridIntensity,
        timestamp: latest.timestamp.toISOString(),
      });

      return {
        success: true,
        data: prediction,
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
    try {
      // Get historical readings (last 100 points) to train the LSSVM model
      const readings = await getIoTEnergyReadings(100);
      
      // We need at least 8 readings (lag of 6 + some points) to fit LSSVM correctly
      if (readings.length < 8) {
        return { success: false, insufficientData: true };
      }

      // Map readings to GridReading schema
      const history = readings.map((r: any) => {
        const gridIntensity = getDeterministicGridIntensity(r.timestamp.toISOString());
        return {
          timestamp: r.timestamp.toISOString(),
          gridIntensity,
          power: r.power / 1000,
          energy: r.energy,
        };
      });

      const response = await aiClient.predictForecast({
        history,
        horizonHours,
      });

      // Persist forecast predictions in Neon PostgreSQL
      const inputStart = readings[0].timestamp.toISOString();
      const inputEnd = readings[readings.length - 1].timestamp.toISOString();
      const deviceId = readings[readings.length - 1].deviceId || 'ESP32-001';

      try {
        const savePromises = response.next24Hours.map(pt =>
          addAiPrediction({
            deviceId,
            predictionValue: pt.predictedIntensity,
            predictionHorizon: pt.hour,
            modelVersion: response.modelVersion || 'lssvm-v0.1',
            inputWindowStart: inputStart,
            inputWindowEnd: inputEnd,
          })
        );
        await Promise.all(savePromises);
        console.log(`[AI Service] Persisted ${response.next24Hours.length} prediction points to PostgreSQL`);
      } catch (saveError: any) {
        console.error('[AI Service] Failed to persist predictions:', saveError.message);
      }

      const now = new Date();
      const currentHour = now.getHours();

      // Transform forecast points to dashboard format
      const forecast = response.next24Hours.map((pt: ForecastPoint) => {
        const hour = (currentHour + pt.hour) % 24;
        const carbonIntensity = pt.predictedIntensity;
        return {
          hour,
          carbonIntensity,
          isGreenWindow: carbonIntensity < 300,
          recommendedLoad: (carbonIntensity < 300 ? 'HIGH' : carbonIntensity < 400 ? 'MEDIUM' : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
        };
      });

      return {
        success: true,
        forecast,
      };
    } catch (e: any) {
      console.error('[AI Service] Carbon forecast failed:', e.message);
      return {
        success: false,
        error: e.message || 'Forecast prediction failed',
      };
    }
  },
};
