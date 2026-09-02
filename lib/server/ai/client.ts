/**
 * Server-side client for Carbon AI Service (FastAPI)
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface HealthStatus {
  available: boolean;
  status?: string;
  models_loaded?: boolean;
  error?: string;
}

export interface EmissionPredictRequest {
  power: number;
  energy: number;
  gridIntensity: number;
  timestamp?: string;
}

export interface EmissionPredictResponse {
  carbonEmission: number;
  confidence: number;
  modelVersion: string;
}

export interface GridReadingInput {
  timestamp: string;
  gridIntensity: number;
  power?: number;
  energy?: number;
}

export interface ForecastPredictRequest {
  history: GridReadingInput[];
  horizonHours?: number;
}

export interface ForecastPoint {
  hour: number;
  predictedIntensity: number;
}

export interface ForecastPredictResponse {
  next24Hours: ForecastPoint[];
  modelVersion: string;
}

export const aiClient = {
  async getHealth(): Promise<HealthStatus> {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(3000), // 3s timeout
      });
      if (!res.ok) {
        return { available: false, error: `HTTP error! Status: ${res.status}` };
      }
      const data = await res.json();
      return {
        available: true,
        status: data.status,
        models_loaded: data.models_loaded,
      };
    } catch (e: any) {
      return {
        available: false,
        error: e.message || 'Connection failed',
      };
    }
  },

  async predictEmission(payload: EmissionPredictRequest): Promise<EmissionPredictResponse> {
    const res = await fetch(`${AI_SERVICE_URL}/predict/emission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI service emission prediction failed: ${res.status} - ${errText}`);
    }

    return res.json();
  },

  async predictForecast(payload: ForecastPredictRequest): Promise<ForecastPredictResponse> {
    const res = await fetch(`${AI_SERVICE_URL}/predict/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI service forecast prediction failed: ${res.status} - ${errText}`);
    }

    return res.json();
  },
};
