const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface IoTEnergyReading {
  id: string;
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency: number;
  powerFactor: number;
  timestamp: string;
  receivedAt: string;
}

export interface LatestReadingResponse {
  success: boolean;
  reading: IoTEnergyReading | null;
}

export interface ReadingsResponse {
  success: boolean;
  readings: IoTEnergyReading[];
}

export interface IoTStatus {
  deviceId: string;
  mqttConnected: boolean;
  online: boolean;
  lastReadingAt: string | null;
}

export interface HourlySummary {
  time: string;
  consumption: number;
  rawConsumption: number;
  averagePower: number;
  carbonIntensity: number;
  emission: number;
  scaleFactor: number;
  voltage: number;
  current: number;
}

export interface CarbonIntensityResponse {
  intensity: number;
  unit: string;
  source: 'configured-estimate' | 'demo-default-estimate';
  region: string | null;
  isEstimate: true;
  observedAt: null;
  retrievedAt: string;
}

function authHeaders(token: string): HeadersInit {
  if (!token) throw new Error('Authentication required to access IoT readings.');
  return { Authorization: `Bearer ${token}` };
}

async function requestJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(response.status === 401
      ? 'Session expired or invalid. Sign in again to continue.'
      : `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getLatestReading(token: string): Promise<LatestReadingResponse> {
  return requestJson<LatestReadingResponse>('/energy/iot/latest', token);
}

export function getIoTReadings(token: string, limit = 50): Promise<ReadingsResponse> {
  return requestJson<ReadingsResponse>(`/energy/iot/readings?limit=${limit}`, token);
}

export function getIoTStatus(token: string): Promise<IoTStatus> {
  return requestJson<IoTStatus>('/energy/iot/status', token);
}

export function getHourlySummary(token: string): Promise<HourlySummary[]> {
  return fetch(`${API_BASE}/energy/hourly-summary`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  }).then(r => {
    if (!r.ok) {
      throw new Error(r.status === 401
        ? 'Session expired or invalid. Sign in again to continue.'
        : `Request failed: ${r.status}`);
    }
    return r.json() as Promise<HourlySummary[]>;
  });
}

export async function getCarbonIntensity(): Promise<CarbonIntensityResponse> {
  const response = await fetch(`${API_BASE}/carbon/intensity`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Carbon factor request failed: ${response.status}`);
  return response.json() as Promise<CarbonIntensityResponse>;
}
